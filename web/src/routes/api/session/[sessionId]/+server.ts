import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { participants, sessions } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { jsonToStates } from '$lib/session';
import { progressCounts, workshopComplete } from '$lib/steps';
import { loadLabGuide, sectionForStep } from '$lib/server/guide/sections';
import { rewriteGuideImages } from '$lib/server/guide/images';
import { renderGuideMarkdown } from '$lib/server/guide/markdown';

async function getSession(sessionId: string) {
	const rows = await db
		.select({
			id: sessions.id,
			participantId: sessions.participantId,
			name: participants.name,
			cursorIndex: sessions.cursorIndex,
			stepStates: sessions.stepStates,
			completedAt: sessions.completedAt,
			stuckAt: sessions.stuckAt,
			blinkAt: sessions.blinkAt,
			createdAt: sessions.createdAt,
			updatedAt: sessions.updatedAt
		})
		.from(sessions)
		.innerJoin(participants, eq(sessions.participantId, participants.id))
		.where(eq(sessions.id, sessionId))
		.limit(1);

	return rows[0];
}

export const GET: RequestHandler = async ({ params }) => {
	const row = await getSession(params.sessionId);
	if (!row) error(404, 'Session not found');

	const states = jsonToStates(row.stepStates ?? []);
	const progress = progressCounts(states);
	const currentStep = states[row.cursorIndex] ?? states[0];

	let guideHtml = '';
	try {
		const doc = await loadLabGuide();
		const section = sectionForStep(currentStep?.step.id ?? '', doc);
		if (section) {
			guideHtml = await renderGuideMarkdown(rewriteGuideImages(section));
		}
	} catch {
		guideHtml = '<p>Lab guide section unavailable.</p>';
	}

	return json({
		sessionId: row.id,
		participantName: row.name,
		cursorIndex: row.cursorIndex,
		states: states.map((st) => ({
			id: st.step.id,
			module: st.step.module,
			label: st.step.label,
			kind: st.step.kind,
			instructions: st.step.instructions,
			status: st.status,
			reason: st.reason,
			marked: st.marked
		})),
		progress,
		complete: workshopComplete(states),
		completedAt: row.completedAt,
		stuckAt: row.stuckAt?.toISOString() ?? null,
		blinkAt: row.blinkAt?.toISOString() ?? null,
		guideHtml
	});
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const row = await getSession(params.sessionId);
	if (!row) error(404, 'Session not found');

	const body = await request.json();
	const cursorIndex = Number(body.cursorIndex);
	if (!Number.isInteger(cursorIndex) || cursorIndex < 0) {
		return json({ error: 'Invalid cursor' }, { status: 400 });
	}

	const states = jsonToStates(row.stepStates ?? []);
	if (cursorIndex >= states.length) {
		return json({ error: 'Cursor out of range' }, { status: 400 });
	}

	await db
		.update(sessions)
		.set({ cursorIndex, updatedAt: new Date() })
		.where(eq(sessions.id, params.sessionId));

	await db
		.update(participants)
		.set({ lastSeenAt: new Date() })
		.where(eq(participants.id, row.participantId));

	return json({ ok: true, cursorIndex });
};
