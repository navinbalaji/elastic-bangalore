import { getEsClient } from '../app-client';
import type { Doubt } from '../types';
import {
	removeByDoubtIdWithClient,
	syncAllFromDoubtsWithClient,
	upsertFromDoubtWithClient
} from './chat-sync';

export { doubtToChatDoc } from './chat-sync';

export async function upsertFromDoubt(
	doubt: Pick<Doubt, 'id' | 'sessionId' | 'message' | 'reply' | 'repliedAt' | 'createdAt'>
): Promise<void> {
	await upsertFromDoubtWithClient(getEsClient(), doubt);
}

export async function removeByDoubtId(doubtId: string): Promise<void> {
	await removeByDoubtIdWithClient(getEsClient(), doubtId);
}

export async function syncAllFromDoubts(): Promise<number> {
	return syncAllFromDoubtsWithClient(getEsClient());
}
