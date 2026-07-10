import type { WorkshopConfig } from '$lib/types';

const STORAGE_KEY = 'eb_credentials';

export type StoredCredentials = Pick<WorkshopConfig, 'elasticsearchUrl' | 'apiKey'> & {
	elasticsearchUrl: string;
	apiKey: string;
};

type CredentialStore = Record<string, StoredCredentials>;

function readStore(): CredentialStore {
	if (typeof localStorage === 'undefined') return {};
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		return JSON.parse(raw) as CredentialStore;
	} catch {
		return {};
	}
}

function writeStore(store: CredentialStore) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getCredentials(sessionId: string): StoredCredentials | null {
	const creds = readStore()[sessionId];
	if (!creds?.apiKey?.trim() || !creds.elasticsearchUrl?.trim()) {
		return null;
	}
	return creds;
}

export function hasCredentials(sessionId: string): boolean {
	return getCredentials(sessionId) !== null;
}

export function saveCredentials(sessionId: string, creds: StoredCredentials) {
	const store = readStore();
	store[sessionId] = {
		elasticsearchUrl: creds.elasticsearchUrl.trim(),
		apiKey: creds.apiKey.trim()
	};
	writeStore(store);
}

export function clearCredentials(sessionId: string) {
	const store = readStore();
	delete store[sessionId];
	writeStore(store);
}
