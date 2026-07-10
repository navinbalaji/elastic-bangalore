import type { Handle } from '@sveltejs/kit';
import { getEsClient } from '$lib/db/app-client';
import { ensureIndices } from '$lib/db/store/bootstrap';

let indicesReady: Promise<void> | undefined;

function ensureIndicesOnce(): Promise<void> {
	if (!indicesReady) {
		indicesReady = ensureIndices(getEsClient()).catch((err) => {
			indicesReady = undefined;
			throw err;
		});
	}
	return indicesReady;
}

export const handle: Handle = async ({ event, resolve }) => {
	await ensureIndicesOnce();
	return resolve(event);
};
