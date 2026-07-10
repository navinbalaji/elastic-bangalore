import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sessions } from '$lib/db';
import { touchParticipant } from '$lib/db/store/helpers';
import { VerifyClient, validateConfig } from '$lib/server/verify/client';
import { jsonToStates, statesToJson } from '$lib/session';
import { workshopComplete } from '$lib/steps';
import { nowIso } from '$lib/db/store/utils';
import type { WorkshopConfig } from '$lib/types';

export const POST: RequestHandler = async ({ params, request }) => {
	const row = await sessions.findById(params.sessionId);
	if (!row) error(404, 'Session not found');

	const body = await request.json();
	const stepId = String(body.stepId ?? '');
	const credentials = body.credentials as WorkshopConfig | undefined;
	const states = jsonToStates(row.stepStates ?? []);
	const idx = states.findIndex((s) => s.step.id === stepId);
	if (idx < 0) return json({ error: 'Unknown step' }, { status: 400 });

	const st = states[idx];
	if (st.step.kind !== 'verifiable') {
		return json({ error: 'This step is not auto-verified' }, { status: 400 });
	}

	if (!credentials?.apiKey?.trim() || !credentials.elasticsearchUrl?.trim()) {
		return json({ error: 'Configure Elastic credentials first' }, { status: 400 });
	}

	const config: WorkshopConfig = {
		elasticsearchUrl: credentials.elasticsearchUrl.trim(),
		apiKey: credentials.apiKey.trim()
	};

	const configErr = validateConfig(config);
	if (configErr) return json({ error: configErr }, { status: 400 });

	states[idx] = { ...st, status: 'running', reason: 'Verifying…' };
	await sessions.updateStepStates(params.sessionId, statesToJson(states), row.completedAt);

	const client = new VerifyClient(config);
	const result = await client.verify(stepId);

	states[idx] = {
		...st,
		status: result.pass ? 'pass' : 'fail',
		reason: result.reason
	};

	const complete = workshopComplete(states);
	await sessions.updateStepStates(
		params.sessionId,
		statesToJson(states),
		complete ? nowIso() : null
	);
	await touchParticipant(row.participantId, params.sessionId);

	return json({
		stepId,
		pass: result.pass,
		reason: result.reason,
		complete
	});
};
