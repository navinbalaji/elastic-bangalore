import type { Client } from '@elastic/elasticsearch';
import { env } from '$env/dynamic/private';
import { createEsClient } from './es-client';

let client: Client | undefined;

export function getEsClient(): Client {
	if (!client) {
		client = createEsClient(env.ELASTICSEARCH_URL, env.ELASTICSEARCH_API_KEY);
	}
	return client;
}
