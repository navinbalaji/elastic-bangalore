import type { Client } from '@elastic/elasticsearch';
import { INDICES, INDEX_MAPPINGS } from '../indices';

function isIndexAlreadyExists(e: unknown): boolean {
	if (typeof e !== 'object' || e === null) return false;
	const err = e as { meta?: { body?: { error?: { type?: string } } } };
	return err.meta?.body?.error?.type === 'resource_already_exists_exception';
}

export async function ensureIndices(client: Client): Promise<void> {
	for (const [index, body] of Object.entries(INDEX_MAPPINGS)) {
		const exists = await client.indices.exists({ index });
		if (exists) {
			console.log(`Index already exists: ${index}`);
			continue;
		}

		try {
			await client.indices.create({ index, ...body });
			console.log(`Created index: ${index}`);
		} catch (e: unknown) {
			if (isIndexAlreadyExists(e)) {
				console.log(`Index already exists: ${index}`);
				continue;
			}
			throw e;
		}
	}
}

export async function deleteAllIndices(client: Client): Promise<void> {
	for (const index of Object.values(INDICES)) {
		const exists = await client.indices.exists({ index });
		if (exists) {
			await client.indices.delete({ index });
			console.log(`Deleted index: ${index}`);
		}
	}
}
