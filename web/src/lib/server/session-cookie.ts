import type { Cookies } from '@sveltejs/kit';

export const SESSION_COOKIE = 'eb_session';

const COOKIE_OPTS = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax' as const,
	secure: process.env.NODE_ENV === 'production',
	maxAge: 60 * 60 * 24 * 30 // 30 days
};

export function setSessionCookie(cookies: Cookies, sessionId: string): void {
	cookies.set(SESSION_COOKIE, sessionId, COOKIE_OPTS);
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

export function getSessionIdFromCookie(cookies: Cookies): string | undefined {
	return cookies.get(SESSION_COOKIE);
}
