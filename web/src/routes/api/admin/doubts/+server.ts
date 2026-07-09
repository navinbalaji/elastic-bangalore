import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { doubts, participants, sessions } from '$lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { isAdminAuthed } from '$lib/server/auth';

export const GET: RequestHandler = async ({ cookies }) => {
	if (!isAdminAuthed(cookies)) error(401, 'Unauthorized');

	const rows = await db
		.select({
			id: doubts.id,
			message: doubts.message,
			createdAt: doubts.createdAt,
			sessionId: sessions.id,
			participantName: participants.name,
			userKey: participants.userKey
		})
		.from(doubts)
		.innerJoin(sessions, eq(doubts.sessionId, sessions.id))
		.innerJoin(participants, eq(sessions.participantId, participants.id))
		.orderBy(desc(doubts.createdAt));

	return json({
		doubts: rows.map((row) => ({
			id: row.id,
			message: row.message,
			createdAt: row.createdAt.toISOString(),
			sessionId: row.sessionId,
			participantName: row.participantName,
			userKey: row.userKey
		})),
		total: rows.length
	});
};
