import { env } from '$env/dynamic/private';

const COOKIE = 'admin_session';

export function isAdminAuthed(cookies: { get: (name: string) => string | undefined }): boolean {
	const token = cookies.get(COOKIE);
	const password = env.ADMIN_PASSWORD ?? 'change-me';
	return token === hashPassword(password);
}

export function adminCookieValue(): string {
	const password = env.ADMIN_PASSWORD ?? 'change-me';
	return hashPassword(password);
}

export function verifyAdminPassword(password: string): boolean {
	const expected = env.ADMIN_PASSWORD ?? 'change-me';
	return password === expected;
}

export const ADMIN_COOKIE_NAME = COOKIE;

function hashPassword(password: string): string {
	// Simple constant-time-ish token for workshop admin (not for high-security use)
	let h = 0;
	for (let i = 0; i < password.length; i++) {
		h = (Math.imul(31, h) + password.charCodeAt(i)) | 0;
	}
	return `admin_${h >>> 0}`;
}
