import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { doubts } from '$lib/db';
import { isAdminAuthed } from '$lib/server/auth';

export const GET: RequestHandler = async ({ cookies }) => {
	if (!isAdminAuthed(cookies)) error(401, 'Unauthorized');

	const rows = await doubts.listAllForAdmin();

	return json({
		doubts: rows.map((row) => ({
			id: row.id,
			message: row.message,
			reply: row.reply ?? null,
			repliedAt: row.repliedAt ?? null,
			createdAt: row.createdAt,
			sessionId: row.sessionId,
			participantName: row.participantName,
			userKey: row.userKey
		})),
		total: rows.length
	});
};
