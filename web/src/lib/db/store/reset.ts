import { getEsClient } from '../app-client';
import { INDICES } from '../indices';

export async function deleteAll(): Promise<void> {
	const client = getEsClient();
	for (const index of Object.values(INDICES)) {
		await client.deleteByQuery({
			index,
			query: { match_all: {} },
			refresh: true
		});
	}
}
