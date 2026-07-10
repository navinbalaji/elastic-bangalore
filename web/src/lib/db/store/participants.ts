import { getEsClient } from '../app-client';
import { INDICES } from '../indices';
import type { Participant, ParticipantDoc } from '../types';
import { nowIso } from './utils';

function docToParticipant(id: string, doc: ParticipantDoc): Participant {
	return { id, ...doc };
}

export async function findByUserKey(userKey: string): Promise<Participant | null> {
	const client = getEsClient();
	const res = await client.search<ParticipantDoc>({
		index: INDICES.participants,
		query: { term: { userKey } },
		size: 1
	});

	const hit = res.hits.hits[0];
	if (!hit?._id || !hit._source) return null;
	return docToParticipant(hit._id, hit._source);
}

export async function findById(id: string): Promise<Participant | null> {
	const client = getEsClient();
	try {
		const res = await client.get<ParticipantDoc>({ index: INDICES.participants, id });
		if (!res._source) return null;
		return docToParticipant(res._id, res._source);
	} catch (e: unknown) {
		if (isNotFound(e)) return null;
		throw e;
	}
}

export async function create(userKey: string, name: string): Promise<Participant> {
	const client = getEsClient();
	const id = crypto.randomUUID();
	const now = nowIso();
	const doc: ParticipantDoc = {
		userKey,
		name,
		createdAt: now,
		lastSeenAt: now
	};

	await client.index({
		index: INDICES.participants,
		id,
		document: doc,
		refresh: 'wait_for'
	});

	return docToParticipant(id, doc);
}

export async function updateLastSeen(id: string): Promise<string> {
	const client = getEsClient();
	const now = nowIso();
	await client.update({
		index: INDICES.participants,
		id,
		doc: { lastSeenAt: now },
		refresh: false,
		retry_on_conflict: 5
	});
	return now;
}

export async function updateName(id: string, name: string): Promise<void> {
	const client = getEsClient();
	const now = nowIso();
	await client.update({
		index: INDICES.participants,
		id,
		doc: { name, lastSeenAt: now },
		refresh: 'wait_for'
	});
}

function isNotFound(e: unknown): boolean {
	return (
		typeof e === 'object' &&
		e !== null &&
		'statusCode' in e &&
		(e as { statusCode: number }).statusCode === 404
	);
}
