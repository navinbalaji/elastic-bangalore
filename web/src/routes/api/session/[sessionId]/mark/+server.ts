import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sessions } from '$lib/db';
import { touchParticipant } from '$lib/db/store/helpers';
import { jsonToStates, statesToJson } from '$lib/session';
import { workshopComplete } from '$lib/steps';
import { nowIso } from '$lib/db/store/utils';

export const POST: RequestHandler = async ({ params, request }) => {
	const row = await sessions.findById(params.sessionId);
	if (!row) error(404, 'Session not found');

	const body = await request.json();
	const stepId = String(body.stepId ?? '');
	const states = jsonToStates(row.stepStates ?? []);
	const idx = states.findIndex((s) => s.step.id === stepId);
	if (idx < 0) return json({ error: 'Unknown step' }, { status: 400 });

	const st = states[idx];
	if (st.step.kind !== 'guide') {
		return json({ error: 'Only guide steps can be marked' }, { status: 400 });
	}

	states[idx] = { ...st, marked: true, reason: 'Acknowledged' };
	const complete = workshopComplete(states);

	await sessions.updateStepStates(
		params.sessionId,
		statesToJson(states),
		complete ? nowIso() : null
	);
	await touchParticipant(row.participantId, params.sessionId);

	return json({ stepId, marked: true, complete });
};
