import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { doubts, participants, sessions } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { isAdminAuthed } from '$lib/server/auth';
import { parseDoubtMessage } from '$lib/server/doubts';

async function getAdminDoubt(doubtId: string) {
	const [row] = await db
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
		.where(eq(doubts.id, doubtId))
		.limit(1);

	return row;
}

export const PATCH: RequestHandler = async ({ params, request, cookies }) => {
	if (!isAdminAuthed(cookies)) error(401, 'Unauthorized');

	const body = await request.json().catch(() => ({}));
	const message = parseDoubtMessage(body);
	if (!message) return json({ error: 'Message is required (max 2000 characters)' }, { status: 400 });

	const existing = await getAdminDoubt(params.doubtId);
	if (!existing) error(404, 'Question not found');

	await db.update(doubts).set({ message }).where(eq(doubts.id, params.doubtId));

	const row = await getAdminDoubt(params.doubtId);
	return json({
		doubt: {
			id: row!.id,
			message: row!.message,
			createdAt: row!.createdAt.toISOString(),
			sessionId: row!.sessionId,
			participantName: row!.participantName,
			userKey: row!.userKey
		}
	});
};

export const DELETE: RequestHandler = async ({ params, cookies }) => {
	if (!isAdminAuthed(cookies)) error(401, 'Unauthorized');

	const [row] = await db
		.delete(doubts)
		.where(eq(doubts.id, params.doubtId))
		.returning({ id: doubts.id });

	if (!row) error(404, 'Question not found');

	return json({ ok: true });
};
