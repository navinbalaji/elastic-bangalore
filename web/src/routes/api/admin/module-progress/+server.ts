import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { moduleProgress } from '$lib/db';
import { isAdminAuthed } from '$lib/server/auth';
import { MODULE_ORDER } from '$lib/steps';

export const GET: RequestHandler = async ({ cookies }) => {
	if (!isAdminAuthed(cookies)) error(401, 'Unauthorized');

	const grouped = await moduleProgress.listGroupedByModule();

	return json({
		modules: MODULE_ORDER.map((module) => ({
			module,
			shortName: module.split(' — ')[0] ?? module,
			participants: grouped[module] ?? []
		}))
	});
};
