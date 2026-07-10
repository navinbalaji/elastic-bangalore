import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sessions, stuckEvents } from '$lib/db';
import { isAdminAuthed } from '$lib/server/auth';

export const DELETE: RequestHandler = async ({ cookies, params }) => {
	if (!isAdminAuthed(cookies)) error(401, 'Unauthorized');

	const row = await sessions.findById(params.sessionId);
	if (!row) error(404, 'Session not found');
	if (!row.stuckAt) return json({ error: 'Participant is not stuck' }, { status: 400 });

	await sessions.clearStuck(params.sessionId);
	await stuckEvents.resolveLatest(params.sessionId, 'dismiss');

	return json({ ok: true });
};
