import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sessions, moduleProgress } from '$lib/db';
import { isAdminAuthed } from '$lib/server/auth';
import { jsonToStates } from '$lib/session';
import { progressCounts, workshopComplete, moduleProgress as computeModuleProgress } from '$lib/steps';

export const GET: RequestHandler = async ({ cookies }) => {
	if (!isAdminAuthed(cookies)) error(401, 'Unauthorized');

	const rows = await sessions.listForAdmin();
	const sessionIds = rows.map((row) => row.id);
	const modulesBySession = await moduleProgress.listBySessionIds(sessionIds);

	const data = rows.map((row) => {
		const states = jsonToStates(row.stepStates ?? []);
		const progress = progressCounts(states);
		const failed = states.filter((s) => s.step.kind === 'verifiable' && s.status === 'fail');
		const current = states[row.cursorIndex];

		let modules = modulesBySession.get(row.id);
		if (!modules || modules.length === 0) {
			modules = computeModuleProgress(states);
			void moduleProgress.syncForSession(row);
		}

		return {
			sessionId: row.id,
			participantId: row.participantId,
			userKey: row.userKey,
			name: row.participantName,
			progress,
			percent: Math.round((progress.passed / progress.total) * 100),
			modules,
			complete: workshopComplete(states),
			completedAt: row.completedAt,
			currentStep: current?.step.label ?? '—',
			currentModule: current?.step.module ?? '—',
			failedSteps: failed.map((f) => ({ id: f.step.id, label: f.step.label, reason: f.reason })),
			joinedAt: row.participantCreatedAt,
			lastSeenAt: row.participantLastSeenAt,
			stuckAt: row.stuckAt,
			blinkAt: row.blinkAt,
			sessionUpdatedAt: row.updatedAt
		};
	});

	return json({ participants: data, total: data.length });
};
