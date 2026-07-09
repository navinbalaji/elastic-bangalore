import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { participants, sessions } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ params }) => {
	const rows = await db
		.select({ id: sessions.id, participantId: sessions.participantId })
		.from(sessions)
		.where(eq(sessions.id, params.sessionId))
		.limit(1);

	const row = rows[0];
	if (!row) error(404, 'Session not found');

	const now = new Date();

	await db
		.update(sessions)
		.set({ stuckAt: now, blinkAt: null, updatedAt: now })
		.where(eq(sessions.id, params.sessionId));

	await db
		.update(participants)
		.set({ lastSeenAt: now })
		.where(eq(participants.id, row.participantId));

	return json({ ok: true, stuckAt: now.toISOString() });
};

export const DELETE: RequestHandler = async ({ params }) => {
	const rows = await db
		.select({ id: sessions.id, participantId: sessions.participantId })
		.from(sessions)
		.where(eq(sessions.id, params.sessionId))
		.limit(1);

	const row = rows[0];
	if (!row) error(404, 'Session not found');

	const now = new Date();

	await db
		.update(sessions)
		.set({ stuckAt: null, updatedAt: now })
		.where(eq(sessions.id, params.sessionId));

	await db
		.update(participants)
		.set({ lastSeenAt: now })
		.where(eq(participants.id, row.participantId));

	return json({ ok: true });
};
