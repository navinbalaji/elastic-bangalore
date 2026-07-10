/** Derive Kibana base URL from an Elastic Cloud Elasticsearch endpoint (.es. → .kb.). */
export function deriveKibanaUrl(elasticsearchUrl?: string): string | null {
	const url = elasticsearchUrl?.trim();
	if (!url) return null;
	if (url.includes('.kb.')) return url.replace(/\/$/, '');
	if (url.includes('.es.')) return url.replace('.es.', '.kb.').replace(/\/$/, '');
	return null;
}
