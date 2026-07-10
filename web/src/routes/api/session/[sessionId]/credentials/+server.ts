import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sessions } from '$lib/db';
import { VerifyClient, validateConfig } from '$lib/server/verify/client';
import type { WorkshopConfig } from '$lib/types';

/** Validate Elastic credentials without persisting them (stored in browser localStorage). */
export const PUT: RequestHandler = async ({ params, request }) => {
	const existing = await sessions.findById(params.sessionId);
	if (!existing) error(404, 'Session not found');

	const body = await request.json();
	const apiKey = String(body.apiKey ?? '').trim();
	if (!apiKey) return json({ error: 'API key is required' }, { status: 400 });

	const config: WorkshopConfig = {
		elasticsearchUrl: String(body.elasticsearchUrl ?? '').trim() || undefined,
		apiKey
	};

	const err = validateConfig(config);
	if (err) return json({ error: err }, { status: 400 });

	const client = new VerifyClient(config);
	try {
		await client.validateConnection();
	} catch (e) {
		return json({ error: `Elasticsearch connection failed: ${e}` }, { status: 400 });
	}

	return json({ ok: true });
};
