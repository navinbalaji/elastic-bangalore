export const HELP_ELASTICSEARCH_URL = `Elasticsearch URL

1. Go to cloud.elastic.co
2. Open your project / deployment
3. Click Help (?) → Connection details
4. Endpoints tab → copy "Elasticsearch endpoint"

Example:
https://my-project-d9fc53.es.us-central1.gcp.elastic.cloud`;

export const HELP_API_KEY = `API key (Encoded / base64)

1. Open Kibana (Elastic Cloud → Open Kibana)
2. Search bar → type "API keys"
3. Create API key → set privileges → Create
4. Copy the ENCODED key shown once (long base64 string)

Use in Authorization header as:
ApiKey <your-encoded-key>

Do NOT paste the API key into the Kibana URL field.`;

export const HELP_KIBANA_URL = `Kibana URL

1. Go to cloud.elastic.co
2. Open your project / deployment
3. Click "Open Kibana" (or find Kibana under Applications)
4. Copy the browser URL base (no path after the host)

Example:
https://my-project-d9fc53.kb.us-central1.gcp.elastic.cloud:9243

Serverless: Help (?) → Connection details may list the Kibana endpoint.

Must start with https:// — this is NOT your API key.`;

export const CREDENTIALS_DOCS_URL =
	'https://www.elastic.co/docs/solutions/elasticsearch-solution-project/search-connection-details';
