import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { participants, sessions } from '$lib/db';
import { updateParticipantName, touchParticipant } from '$lib/db/store/helpers';
import { initialStates } from '$lib/steps';
import { statesToJson } from '$lib/session';
import { setSessionCookie } from '$lib/server/session-cookie';

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUserKey(key: string): boolean {
	return UUID_RE.test(key);
}

async function resumeParticipant(
	userKey: string,
	name: string,
	cookies: Parameters<RequestHandler>[0]['cookies']
) {
	const existing = await participants.findByUserKey(userKey);
	if (!existing) return null;

	const session = await sessions.findLatestByParticipantId(existing.id);

	if (existing.name !== name) {
		await updateParticipantName(existing.id, name);
	} else if (session) {
		await touchParticipant(existing.id, session.id);
	} else {
		await touchParticipant(existing.id);
	}

	if (session) {
		setSessionCookie(cookies, session.id);
		return {
			participantId: existing.id,
			sessionId: session.id,
			name,
			userKey,
			resumed: true
		};
	}

	const newSession = await sessions.create(existing, statesToJson(initialStates()));
	setSessionCookie(cookies, newSession.id);

	return {
		participantId: existing.id,
		sessionId: newSession.id,
		name,
		userKey,
		resumed: false
	};
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json();
	const name = String(body.name ?? '').trim();
	const userKey = String(body.userKey ?? '').trim();

	if (!name || name.length < 2) {
		return json({ error: 'Please enter your name (at least 2 characters)' }, { status: 400 });
	}
	if (name.length > 100) {
		return json({ error: 'Name is too long' }, { status: 400 });
	}
	if (!isValidUserKey(userKey)) {
		return json({ error: 'Invalid user key' }, { status: 400 });
	}

	const resumed = await resumeParticipant(userKey, name, cookies);
	if (resumed) {
		return json(resumed);
	}

	const participant = await participants.create(userKey, name);
	const session = await sessions.create(participant, statesToJson(initialStates()));

	setSessionCookie(cookies, session.id);

	return json({
		participantId: participant.id,
		sessionId: session.id,
		name: participant.name,
		userKey,
		resumed: false
	});
};
