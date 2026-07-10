import { getEsClient } from '../app-client';
import { INDICES } from '../indices';
import type { Participant, Session, SessionDoc, StepStateJson } from '../types';
import { nowIso } from './utils';
import * as moduleProgressStore from './module-progress';

function docToSession(id: string, doc: SessionDoc): Session {
	return { id, ...doc };
}

function participantFields(participant: Participant): Pick<
	SessionDoc,
	'participantName' | 'userKey' | 'participantCreatedAt' | 'participantLastSeenAt'
> {
	return {
		participantName: participant.name,
		userKey: participant.userKey,
		participantCreatedAt: participant.createdAt,
		participantLastSeenAt: participant.lastSeenAt
	};
}

export async function findById(id: string): Promise<Session | null> {
	const client = getEsClient();
	try {
		const res = await client.get<SessionDoc>({ index: INDICES.sessions, id });
		if (!res._source) return null;
		return docToSession(res._id, res._source);
	} catch (e: unknown) {
		if (isNotFound(e)) return null;
		throw e;
	}
}

export async function findLatestByParticipantId(participantId: string): Promise<Session | null> {
	const client = getEsClient();
	const res = await client.search<SessionDoc>({
		index: INDICES.sessions,
		query: { term: { participantId } },
		sort: [{ updatedAt: 'desc' }],
		size: 1
	});

	const hit = res.hits.hits[0];
	if (!hit?._id || !hit._source) return null;
	return docToSession(hit._id, hit._source);
}

export async function create(
	participant: Participant,
	stepStates: StepStateJson[]
): Promise<Session> {
	const client = getEsClient();
	const id = crypto.randomUUID();
	const now = nowIso();
	const doc: SessionDoc = {
		participantId: participant.id,
		...participantFields(participant),
		cursorIndex: 0,
		stepStates,
		completedAt: null,
		stuckAt: null,
		blinkAt: null,
		createdAt: now,
		updatedAt: now
	};

	await client.index({
		index: INDICES.sessions,
		id,
		document: doc,
		refresh: 'wait_for'
	});

	const session = docToSession(id, doc);
	await moduleProgressStore.syncForSession(session);
	return session;
}

export async function updateCursor(id: string, cursorIndex: number): Promise<boolean> {
	const now = nowIso();
	try {
		await updateSessionDoc(id, { cursorIndex, updatedAt: now });
		return true;
	} catch (e: unknown) {
		if (isNotFound(e)) return false;
		throw e;
	}
}

export async function updateStepStates(
	id: string,
	stepStates: StepStateJson[],
	completedAt: string | null
): Promise<void> {
	const now = nowIso();
	await updateSessionDoc(
		id,
		{ stepStates, completedAt, updatedAt: now },
		{ refresh: 'wait_for' }
	);

	const session = await findById(id);
	if (session) await moduleProgressStore.syncForSession(session);
}

export async function setStuck(id: string): Promise<string> {
	const now = nowIso();
	await updateSessionDoc(id, { stuckAt: now, blinkAt: null, updatedAt: now });
	return now;
}

export async function clearStuck(id: string): Promise<void> {
	const now = nowIso();
	await updateSessionDoc(id, { stuckAt: null, updatedAt: now });
}

export async function setBlink(id: string): Promise<string> {
	const now = nowIso();
	await updateSessionDoc(id, { stuckAt: null, blinkAt: now, updatedAt: now });
	return now;
}

export async function updateParticipantLastSeen(
	sessionId: string,
	lastSeenAt: string
): Promise<void> {
	await updateSessionDoc(sessionId, { participantLastSeenAt: lastSeenAt });
}

export async function syncParticipantFields(
	participantId: string,
	participant: Participant
): Promise<void> {
	const client = getEsClient();
	const fields = participantFields(participant);
	await client.updateByQuery({
		index: INDICES.sessions,
		query: { term: { participantId } },
		script: {
			source: `
				ctx._source.participantName = params.participantName;
				ctx._source.userKey = params.userKey;
				ctx._source.participantCreatedAt = params.participantCreatedAt;
				ctx._source.participantLastSeenAt = params.participantLastSeenAt;
			`,
			params: fields
		},
		refresh: true
	});
}

export async function updateParticipantLastSeenOnSessions(
	participantId: string,
	lastSeenAt: string
): Promise<void> {
	const client = getEsClient();
	await client.updateByQuery({
		index: INDICES.sessions,
		query: { term: { participantId } },
		script: {
			source: 'ctx._source.participantLastSeenAt = params.lastSeenAt',
			params: { lastSeenAt }
		},
		refresh: true
	});
}

export async function listForAdmin(): Promise<Session[]> {
	const client = getEsClient();
	const res = await client.search<SessionDoc>({
		index: INDICES.sessions,
		query: { match_all: {} },
		sort: [{ updatedAt: 'desc' }],
		size: 1000
	});

	return res.hits.hits
		.filter((hit): hit is typeof hit & { _id: string; _source: SessionDoc } =>
			Boolean(hit._id && hit._source)
		)
		.map((hit) => docToSession(hit._id, hit._source));
}

function isNotFound(e: unknown): boolean {
	return (
		typeof e === 'object' &&
		e !== null &&
		'statusCode' in e &&
		(e as { statusCode: number }).statusCode === 404
	);
}

async function updateSessionDoc(
	id: string,
	doc: Partial<SessionDoc>,
	options?: { refresh?: boolean | 'wait_for' }
): Promise<void> {
	const client = getEsClient();
	await client.update({
		index: INDICES.sessions,
		id,
		doc,
		refresh: options?.refresh ?? false,
		retry_on_conflict: 5
	});
}
