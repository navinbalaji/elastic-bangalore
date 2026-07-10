import { Client } from '@elastic/elasticsearch';

export function createEsClient(url?: string, apiKey?: string): Client {
	const node = url ?? process.env.ELASTICSEARCH_URL;
	const key = apiKey ?? process.env.ELASTICSEARCH_API_KEY;
	if (!node || !key) {
		throw new Error('ELASTICSEARCH_URL and ELASTICSEARCH_API_KEY are required');
	}
	return new Client({ node, auth: { apiKey: key } });
}
