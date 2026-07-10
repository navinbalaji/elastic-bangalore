import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { doubts } from '$lib/db';
import { isAdminAuthed } from '$lib/server/auth';
import { parseDoubtReply } from '$lib/server/doubts';

export const PATCH: RequestHandler = async ({ params, request, cookies }) => {
	if (!isAdminAuthed(cookies)) error(401, 'Unauthorized');

	const body = await request.json().catch(() => ({}));
	const reply = parseDoubtReply(body);
	if (!reply) return json({ error: 'Reply is required (max 2000 characters)' }, { status: 400 });

	const existing = await doubts.getAdminDoubt(params.doubtId);
	if (!existing) error(404, 'Question not found');

	await doubts.setReply(params.doubtId, reply);

	const row = await doubts.getAdminDoubt(params.doubtId);
	return json({
		doubt: {
			id: row!.id,
			message: row!.message,
			reply: row!.reply,
			repliedAt: row!.repliedAt,
			createdAt: row!.createdAt,
			sessionId: row!.sessionId,
			participantName: row!.participantName,
			userKey: row!.userKey
		}
	});
};
