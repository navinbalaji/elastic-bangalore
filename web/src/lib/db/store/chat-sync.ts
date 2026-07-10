import type { Client } from '@elastic/elasticsearch';
import { INDICES } from '../indices';
import type { ChatDoc, Doubt, DoubtDoc } from '../types';

export function doubtToChatDoc(
	doubt: Pick<Doubt, 'id' | 'sessionId' | 'message' | 'reply' | 'repliedAt' | 'createdAt'>
): ChatDoc {
	const doc: ChatDoc = {
		doubtId: doubt.id,
		question: doubt.message,
		sessionId: doubt.sessionId,
		createdAt: doubt.createdAt
	};
	if (doubt.reply) doc.answer = doubt.reply;
	if (doubt.repliedAt) doc.repliedAt = doubt.repliedAt;
	return doc;
}

export async function upsertFromDoubtWithClient(
	client: Client,
	doubt: Pick<Doubt, 'id' | 'sessionId' | 'message' | 'reply' | 'repliedAt' | 'createdAt'>
): Promise<void> {
	await client.index({
		index: INDICES.chat,
		id: doubt.id,
		document: doubtToChatDoc(doubt),
		refresh: 'wait_for'
	});
}

export async function removeByDoubtIdWithClient(client: Client, doubtId: string): Promise<void> {
	try {
		await client.delete({
			index: INDICES.chat,
			id: doubtId,
			refresh: 'wait_for'
		});
	} catch (e: unknown) {
		if (isNotFound(e)) return;
		throw e;
	}
}

export async function syncAllFromDoubtsWithClient(client: Client): Promise<number> {
	const res = await client.search<DoubtDoc>({
		index: INDICES.doubts,
		query: { match_all: {} },
		size: 1000
	});

	const hits = res.hits.hits.filter(
		(hit): hit is typeof hit & { _id: string; _source: DoubtDoc } =>
			Boolean(hit._id && hit._source)
	);

	if (hits.length === 0) return 0;

	const operations = hits.flatMap((hit) => [
		{ index: { _index: INDICES.chat, _id: hit._id } },
		doubtToChatDoc({
			id: hit._id,
			sessionId: hit._source.sessionId,
			message: hit._source.message,
			reply: hit._source.reply,
			repliedAt: hit._source.repliedAt,
			createdAt: hit._source.createdAt
		})
	]);

	await client.bulk({ operations, refresh: 'wait_for' });
	return hits.length;
}

function isNotFound(e: unknown): boolean {
	return (
		typeof e === 'object' &&
		e !== null &&
		'statusCode' in e &&
		(e as { statusCode: number }).statusCode === 404
	);
}
