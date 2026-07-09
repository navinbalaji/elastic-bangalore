import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { participants, sessions } from '$lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { getSessionIdFromCookie } from '$lib/server/session-cookie';
import { jsonToStates } from '$lib/session';
import { progressCounts, workshopComplete } from '$lib/steps';

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function sessionPayload(row: {
	sessionId: string;
	participantId: string;
	name: string;
	userKey: string;
	stepStates: unknown;
	completedAt: Date | null;
}) {
	const states = jsonToStates((row.stepStates as never) ?? []);
	const progress = progressCounts(states);

	await db
		.update(participants)
		.set({ lastSeenAt: new Date() })
		.where(eq(participants.id, row.participantId));

	return {
		sessionId: row.sessionId,
		name: row.name,
		userKey: row.userKey,
		complete: workshopComplete(states) || Boolean(row.completedAt),
		progress,
		percent: Math.round((progress.passed / progress.total) * 100)
	};
}

export const GET: RequestHandler = async ({ url, cookies }) => {
	const userKey = url.searchParams.get('userKey')?.trim() ?? '';

	if (userKey && UUID_RE.test(userKey)) {
		const [participant] = await db
			.select({ id: participants.id, name: participants.name, userKey: participants.userKey })
			.from(participants)
			.where(eq(participants.userKey, userKey))
			.limit(1);

		if (participant) {
			const [session] = await db
				.select({
					sessionId: sessions.id,
					participantId: sessions.participantId,
					name: participants.name,
					userKey: participants.userKey,
					stepStates: sessions.stepStates,
					completedAt: sessions.completedAt
				})
				.from(sessions)
				.innerJoin(participants, eq(sessions.participantId, participants.id))
				.where(eq(sessions.participantId, participant.id))
				.orderBy(desc(sessions.updatedAt))
				.limit(1);

			if (session) {
				return json(await sessionPayload(session));
			}
		}
	}

	const sessionId = getSessionIdFromCookie(cookies);
	if (!sessionId) {
		return json({ sessionId: null });
	}

	const rows = await db
		.select({
			sessionId: sessions.id,
			participantId: sessions.participantId,
			name: participants.name,
			userKey: participants.userKey,
			stepStates: sessions.stepStates,
			completedAt: sessions.completedAt
		})
		.from(sessions)
		.innerJoin(participants, eq(sessions.participantId, participants.id))
		.where(eq(sessions.id, sessionId))
		.limit(1);

	const row = rows[0];
	if (!row) {
		return json({ sessionId: null });
	}

	return json(await sessionPayload(row));
};
