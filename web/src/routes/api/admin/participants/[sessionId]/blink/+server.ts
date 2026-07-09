import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { sessions } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { isAdminAuthed } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies, params }) => {
	if (!isAdminAuthed(cookies)) error(401, 'Unauthorized');

	const rows = await db
		.select({ id: sessions.id, stuckAt: sessions.stuckAt })
		.from(sessions)
		.where(eq(sessions.id, params.sessionId))
		.limit(1);

	const row = rows[0];
	if (!row) error(404, 'Session not found');
	if (!row.stuckAt) return json({ error: 'Participant is not stuck' }, { status: 400 });

	const now = new Date();

	await db
		.update(sessions)
		.set({ stuckAt: null, blinkAt: now, updatedAt: now })
		.where(eq(sessions.id, params.sessionId));

	return json({ ok: true, blinkAt: now.toISOString() });
};
