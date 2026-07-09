import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminCookieValue, ADMIN_COOKIE_NAME, verifyAdminPassword } from '$lib/server/auth';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json();
	const password = String(body.password ?? '');
	const expected = env.ADMIN_PASSWORD ?? 'change-me';

	if (!verifyAdminPassword(password)) {
		return json({ error: 'Invalid password' }, { status: 401 });
	}

	cookies.set(ADMIN_COOKIE_NAME, adminCookieValue(), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 7
	});

	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ cookies }) => {
	cookies.delete(ADMIN_COOKIE_NAME, { path: '/' });
	return json({ ok: true });
};
