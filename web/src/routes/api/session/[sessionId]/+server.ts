import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sessions } from '$lib/db';
import { jsonToStates } from '$lib/session';
import { progressCounts, workshopComplete, ALL_STEPS } from '$lib/steps';
import { guideHtmlForStep, stepIdAtIndex } from '$lib/server/guide/cache';

export const GET: RequestHandler = async ({ params, url }) => {
	const poll = url.searchParams.get('poll') === '1';

	const row = await sessions.findById(params.sessionId);
	if (!row) error(404, 'Session not found');

	if (poll) {
		return json({
			stuckAt: row.stuckAt,
			blinkAt: row.blinkAt
		});
	}

	const states = jsonToStates(row.stepStates ?? []);
	const progress = progressCounts(states);
	const currentStep = states[row.cursorIndex] ?? states[0];
	const guideHtml = await guideHtmlForStep(currentStep?.step.id ?? '');

	return json({
		sessionId: row.id,
		participantName: row.participantName,
		cursorIndex: row.cursorIndex,
		states: states.map((st) => ({
			id: st.step.id,
			module: st.step.module,
			label: st.step.label,
			kind: st.step.kind,
			instructions: st.step.instructions,
			download: st.step.download ?? null,
			status: st.status,
			reason: st.reason,
			marked: st.marked
		})),
		progress,
		complete: workshopComplete(states),
		completedAt: row.completedAt,
		stuckAt: row.stuckAt,
		blinkAt: row.blinkAt,
		guideHtml
	});
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const body = await request.json();
	const cursorIndex = Number(body.cursorIndex);
	if (!Number.isInteger(cursorIndex) || cursorIndex < 0) {
		return json({ error: 'Invalid cursor' }, { status: 400 });
	}
	if (cursorIndex >= ALL_STEPS.length) {
		return json({ error: 'Cursor out of range' }, { status: 400 });
	}

	const updated = await sessions.updateCursor(params.sessionId, cursorIndex);
	if (!updated) error(404, 'Session not found');

	const stepId = stepIdAtIndex(cursorIndex);
	const guideHtml = stepId ? await guideHtmlForStep(stepId) : '';

	return json({ ok: true, cursorIndex, guideHtml });
};
