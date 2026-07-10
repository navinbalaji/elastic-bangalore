import { getEsClient } from '../app-client';
import { INDICES } from '../indices';
import type { Doubt, DoubtDoc } from '../types';
import * as chat from './chat';
import { nowIso } from './utils';

function docToDoubt(id: string, doc: Partial<DoubtDoc> & Pick<DoubtDoc, 'sessionId' | 'message' | 'createdAt'>): Doubt {
	return {
		id,
		sessionId: doc.sessionId,
		message: doc.message,
		reply: doc.reply ?? null,
		repliedAt: doc.repliedAt ?? null,
		createdAt: doc.createdAt
	};
}

export async function listBySession(sessionId: string): Promise<Doubt[]> {
	const client = getEsClient();
	const res = await client.search<DoubtDoc>({
		index: INDICES.doubts,
		query: { term: { sessionId } },
		sort: [{ createdAt: 'desc' }],
		size: 500
	});

	return res.hits.hits
		.filter((hit): hit is typeof hit & { _id: string; _source: DoubtDoc } =>
			Boolean(hit._id && hit._source)
		)
		.map((hit) => docToDoubt(hit._id, hit._source));
}

export type AdminDoubtRow = Doubt & {
	participantName: string;
	userKey: string;
};

export async function listAllForAdmin(): Promise<AdminDoubtRow[]> {
	const client = getEsClient();
	const doubtsRes = await client.search<DoubtDoc>({
		index: INDICES.doubts,
		query: { match_all: {} },
		sort: [{ createdAt: 'desc' }],
		size: 1000
	});

	const doubts = doubtsRes.hits.hits.filter(
		(hit): hit is typeof hit & { _id: string; _source: DoubtDoc } =>
			Boolean(hit._id && hit._source)
	);

	if (doubts.length === 0) return [];

	const sessionIds = [...new Set(doubts.map((d) => d._source.sessionId))];
	const sessionsRes = await client.mget({
		index: INDICES.sessions,
		ids: sessionIds
	});

	const sessionMap = new Map<string, { participantName: string; userKey: string }>();
	for (const doc of sessionsRes.docs) {
		if ('_source' in doc && doc._source && doc._id) {
			const src = doc._source as { participantName: string; userKey: string };
			sessionMap.set(doc._id, {
				participantName: src.participantName,
				userKey: src.userKey
			});
		}
	}

	return doubts.map((hit) => {
		const session = sessionMap.get(hit._source.sessionId);
		return {
			id: hit._id,
			...hit._source,
			participantName: session?.participantName ?? 'Unknown',
			userKey: session?.userKey ?? ''
		};
	});
}

export async function findById(id: string): Promise<Doubt | null> {
	const client = getEsClient();
	try {
		const res = await client.get<DoubtDoc>({ index: INDICES.doubts, id });
		if (!res._source) return null;
		return docToDoubt(res._id, res._source);
	} catch (e: unknown) {
		if (isNotFound(e)) return null;
		throw e;
	}
}

export async function findBySessionAndId(
	sessionId: string,
	doubtId: string
): Promise<Doubt | null> {
	const doubt = await findById(doubtId);
	if (!doubt || doubt.sessionId !== sessionId) return null;
	return doubt;
}

export async function create(sessionId: string, message: string): Promise<Doubt> {
	const client = getEsClient();
	const id = crypto.randomUUID();
	const now = nowIso();
	const doc: DoubtDoc = {
		sessionId,
		message,
		reply: null,
		repliedAt: null,
		createdAt: now
	};

	await client.index({
		index: INDICES.doubts,
		id,
		document: doc,
		refresh: 'wait_for'
	});

	const doubt = docToDoubt(id, doc);
	await chat.upsertFromDoubt(doubt);
	return doubt;
}

export async function update(id: string, message: string): Promise<Doubt> {
	const client = getEsClient();
	await client.update({
		index: INDICES.doubts,
		id,
		doc: { message },
		refresh: 'wait_for'
	});

	const doubt = await findById(id);
	if (!doubt) throw new Error('Doubt not found after update');
	await chat.upsertFromDoubt(doubt);
	return doubt;
}

export async function setReply(id: string, reply: string): Promise<Doubt> {
	const client = getEsClient();
	const now = nowIso();
	await client.update({
		index: INDICES.doubts,
		id,
		doc: { reply, repliedAt: now },
		refresh: 'wait_for',
		retry_on_conflict: 5
	});

	const doubt = await findById(id);
	if (!doubt) throw new Error('Doubt not found after reply');
	await chat.upsertFromDoubt(doubt);
	return doubt;
}

export async function remove(id: string): Promise<boolean> {
	const client = getEsClient();
	try {
		await client.delete({
			index: INDICES.doubts,
			id,
			refresh: 'wait_for'
		});
		await chat.removeByDoubtId(id);
		return true;
	} catch (e: unknown) {
		if (isNotFound(e)) return false;
		throw e;
	}
}

export async function getAdminDoubt(doubtId: string): Promise<AdminDoubtRow | null> {
	const doubt = await findById(doubtId);
	if (!doubt) return null;

	const client = getEsClient();
	try {
		const sessionRes = await client.get({
			index: INDICES.sessions,
			id: doubt.sessionId
		});
		const src = sessionRes._source as { participantName: string; userKey: string } | undefined;
		return {
			...doubt,
			participantName: src?.participantName ?? 'Unknown',
			userKey: src?.userKey ?? ''
		};
	} catch (e: unknown) {
		if (isNotFound(e)) {
			return { ...doubt, participantName: 'Unknown', userKey: '' };
		}
		throw e;
	}
}

function isNotFound(e: unknown): boolean {
	return (
		typeof e === 'object' &&
		e !== null &&
		'statusCode' in e &&
		(e as { statusCode: number }).statusCode === 404
	);
}
