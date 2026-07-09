import type { PageServerLoad } from './$types';
import { setSessionCookie } from '$lib/server/session-cookie';

export const load: PageServerLoad = async ({ params, cookies }) => {
	setSessionCookie(cookies, params.sessionId);
	return {};
};
