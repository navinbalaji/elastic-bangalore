const STORAGE_KEY = 'eb_user_key';

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Persistent browser ID — one participant per device/browser. */
export function getOrCreateUserKey(): string {
	if (typeof localStorage === 'undefined') {
		return crypto.randomUUID();
	}
	const existing = localStorage.getItem(STORAGE_KEY);
	if (existing && isValidUserKey(existing)) {
		return existing;
	}
	const key = crypto.randomUUID();
	localStorage.setItem(STORAGE_KEY, key);
	return key;
}

export function isValidUserKey(key: string): boolean {
	return UUID_RE.test(key.trim());
}
