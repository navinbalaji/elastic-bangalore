import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sessions, stuckEvents } from '$lib/db';
import { touchParticipant } from '$lib/db/store/helpers';
import { jsonToStates } from '$lib/session';

export const POST: RequestHandler = async ({ params }) => {
	const row = await sessions.findById(params.sessionId);
	if (!row) error(404, 'Session not found');
	if (row.stuckAt) return json({ ok: true, stuckAt: row.stuckAt });

	const stuckAt = await sessions.setStuck(params.sessionId);
	await touchParticipant(row.participantId, params.sessionId);

	const states = jsonToStates(row.stepStates ?? []);
	const current = states[row.cursorIndex];

	await stuckEvents.create({
		sessionId: params.sessionId,
		participantId: row.participantId,
		participantName: row.participantName,
		module: current?.step.module ?? 'Unknown',
		stepId: current?.step.id ?? 'unknown',
		stepLabel: current?.step.label ?? 'Unknown',
		cursorIndex: row.cursorIndex,
		stuckAt
	});

	return json({ ok: true, stuckAt });
};
