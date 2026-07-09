import type { PageServerLoad } from './$types';
import { isAdminAuthed } from '$lib/server/auth';

export const load: PageServerLoad = async ({ cookies }) => {
	return { authed: isAdminAuthed(cookies) };
};
