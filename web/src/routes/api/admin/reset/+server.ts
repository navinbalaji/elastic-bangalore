import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sql } from 'drizzle-orm';
import { db } from '$lib/db';
import { isAdminAuthed, verifyAdminPassword } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies, request }) => {
	if (!isAdminAuthed(cookies)) error(401, 'Unauthorized');

	const body = await request.json();
	const password = String(body.password ?? '');
	if (!verifyAdminPassword(password)) {
		return json({ error: 'Invalid password' }, { status: 401 });
	}

	await db.execute(
		sql`TRUNCATE TABLE doubts, sessions, participants RESTART IDENTITY CASCADE`
	);

	return json({ ok: true });
};
