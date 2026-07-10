import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { doubts, sessions } from '$lib/db';
import { touchParticipant } from '$lib/db/store/helpers';

export const GET: RequestHandler = async ({ params }) => {
	const rows = await doubts.listBySession(params.sessionId);

	return json({
		doubts: rows.map((row) => ({
			id: row.id,
			message: row.message,
			reply: row.reply ?? null,
			repliedAt: row.repliedAt ?? null,
			createdAt: row.createdAt
		}))
	});
};

export const POST: RequestHandler = async ({ params, request }) => {
	const body = await request.json().catch(() => ({}));
	const message = typeof body.message === 'string' ? body.message.trim() : '';

	if (!message) error(400, 'Message is required');
	if (message.length > 2000) error(400, 'Message is too long (max 2000 characters)');

	const session = await sessions.findById(params.sessionId);
	if (!session) error(404, 'Session not found');

	const row = await doubts.create(params.sessionId, message);
	await touchParticipant(session.participantId, params.sessionId);

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
