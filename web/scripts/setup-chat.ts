import { createEsClient } from '../src/lib/db/es-client.js';
import { syncAllFromDoubtsWithClient } from '../src/lib/db/store/chat-sync.js';
import { ensureIndices } from '../src/lib/db/store/bootstrap.js';
import { ensureChatQuestionsTool, ensureWorkshopQaAgent } from '../src/lib/server/kibana.js';

const client = createEsClient();

await ensureIndices(client);
console.log('Elasticsearch indices ready');

const synced = await syncAllFromDoubtsWithClient(client);
console.log(`Synced ${synced} doubt(s) to chat index`);

const toolStatus = await ensureChatQuestionsTool();
console.log(`Agent Builder tool chat.questions: ${toolStatus}`);

const agentStatus = await ensureWorkshopQaAgent();
console.log(`Agent Builder agent workshop-qa: ${agentStatus}`);

console.log('Chat semantic search setup complete');
