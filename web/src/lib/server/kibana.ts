import { deriveKibanaUrl } from '$lib/kibana-url';

export function getKibanaConfig(): { url: string; apiKey: string } {
	const url = deriveKibanaUrl(process.env.ELASTICSEARCH_URL);
	const apiKey = process.env.ELASTICSEARCH_API_KEY;
	if (!url) {
		throw new Error('ELASTICSEARCH_URL with .es. host is required to reach Kibana');
	}
	if (!apiKey) {
		throw new Error('ELASTICSEARCH_API_KEY is required');
	}
	return { url, apiKey };
}

async function kibanaRequest(
	method: string,
	path: string,
	body?: unknown
): Promise<{ status: number; body: string }> {
	const { url, apiKey } = getKibanaConfig();
	const res = await fetch(`${url}${path}`, {
		method,
		headers: {
			Authorization: `ApiKey ${apiKey}`,
			'Content-Type': 'application/json',
			'kbn-xsrf': 'true'
		},
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	return { status: res.status, body: await res.text() };
}

export async function ensureChatQuestionsTool(): Promise<'created' | 'exists'> {
	const toolId = 'chat.questions';
	const existing = await kibanaRequest('GET', `/api/agent_builder/tools/${toolId}`);
	if (existing.status === 200) return 'exists';

	const created = await kibanaRequest('POST', '/api/agent_builder/tools', {
		id: toolId,
		type: 'index_search',
		description:
			'Searches workshop participant questions semantically using Jina embeddings on the chat index. Returns matching questions and facilitator answers.',
		configuration: {
			pattern: 'chat'
		}
	});

	if (created.status !== 200) {
		throw new Error(`Failed to create Agent Builder tool ${toolId}: ${created.status} ${created.body}`);
	}

	return 'created';
}

export async function ensureWorkshopQaAgent(): Promise<'created' | 'exists'> {
	const agentId = 'workshop-qa';
	const existing = await kibanaRequest('GET', `/api/agent_builder/agents/${agentId}`);
	if (existing.status === 200) return 'exists';

	const created = await kibanaRequest('POST', '/api/agent_builder/agents', {
		id: agentId,
		name: 'Workshop Q&A',
		description:
			'Answers questions by searching past workshop participant questions and facilitator replies using semantic search.',
		configuration: {
			instructions:
				'You help facilitators and participants find answers from past workshop questions. Always use the chat.questions tool to search for similar questions before answering. Cite the matched question and any facilitator answer when available. If no relevant match is found, say so clearly.',
			tools: [{ tool_ids: ['chat.questions'] }]
		}
	});

	if (created.status !== 200) {
		throw new Error(`Failed to create Agent Builder agent ${agentId}: ${created.status} ${created.body}`);
	}

	return 'created';
}
