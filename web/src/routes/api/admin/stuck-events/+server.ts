import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { stuckEvents } from '$lib/db';
import { isAdminAuthed } from '$lib/server/auth';

export const GET: RequestHandler = async ({ cookies }) => {
	if (!isAdminAuthed(cookies)) error(401, 'Unauthorized');

	const events = await stuckEvents.listForAdmin();

	return json({ events, total: events.length });
};
