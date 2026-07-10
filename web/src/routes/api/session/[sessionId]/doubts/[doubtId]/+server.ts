import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { doubts } from '$lib/db';
import { parseDoubtMessage } from '$lib/server/doubts';

export const PATCH: RequestHandler = async ({ params, request }) => {
	const body = await request.json().catch(() => ({}));
	const message = parseDoubtMessage(body);
	if (!message) return json({ error: 'Message is required (max 2000 characters)' }, { status: 400 });

	const existing = await doubts.findBySessionAndId(params.sessionId, params.doubtId);
	if (!existing) error(404, 'Question not found');

	const row = await doubts.update(params.doubtId, message);

	return json({
		doubt: {
			id: row.id,
			message: row.message,
			reply: row.reply ?? null,
			repliedAt: row.repliedAt ?? null,
			createdAt: row.createdAt
		}
	});
};

export const DELETE: RequestHandler = async ({ params }) => {
	const existing = await doubts.findBySessionAndId(params.sessionId, params.doubtId);
	if (!existing) error(404, 'Question not found');

	await doubts.remove(params.doubtId);

	return json({ ok: true });
};
