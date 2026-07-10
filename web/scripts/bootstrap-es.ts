import { createEsClient } from '../src/lib/db/es-client.js';
import { ensureIndices } from '../src/lib/db/store/bootstrap.js';

const client = createEsClient();
await ensureIndices(client);
console.log('Elasticsearch indices ready');
