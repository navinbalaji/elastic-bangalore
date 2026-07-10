import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { participants, sessions } from '$lib/db';
import { touchParticipant } from '$lib/db/store/helpers';
import { getSessionIdFromCookie } from '$lib/server/session-cookie';
import { jsonToStates } from '$lib/session';
import { progressCounts, workshopComplete } from '$lib/steps';

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function sessionPayload(session: Awaited<ReturnType<typeof sessions.findById>> & object) {
	const states = jsonToStates(session.stepStates ?? []);
	const progress = progressCounts(states);

	await touchParticipant(session.participantId, session.id);

	return {
		sessionId: session.id,
		name: session.participantName,
		userKey: session.userKey,
		complete: workshopComplete(states) || Boolean(session.completedAt),
		progress,
		percent: Math.round((progress.passed / progress.total) * 100)
	};
}

export const GET: RequestHandler = async ({ url, cookies }) => {
	const userKey = url.searchParams.get('userKey')?.trim() ?? '';

	if (userKey && UUID_RE.test(userKey)) {
		const participant = await participants.findByUserKey(userKey);

		if (participant) {
			const session = await sessions.findLatestByParticipantId(participant.id);

			if (session) {
				return json(await sessionPayload(session));
			}
		}
	}

	const sessionId = getSessionIdFromCookie(cookies);
	if (!sessionId) {
		return json({ sessionId: null });
	}

	const session = await sessions.findById(sessionId);
	if (!session) {
		return json({ sessionId: null });
	}

	return json(await sessionPayload(session));
};
