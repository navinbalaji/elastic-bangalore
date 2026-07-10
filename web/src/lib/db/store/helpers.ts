import * as participants from './participants';
import * as sessions from './sessions';
import * as moduleProgressStore from './module-progress';

export async function touchParticipant(
	participantId: string,
	sessionId?: string
): Promise<string> {
	const now = await participants.updateLastSeen(participantId);
	if (sessionId) {
		await sessions.updateParticipantLastSeen(sessionId, now);
	} else {
		await sessions.updateParticipantLastSeenOnSessions(participantId, now);
	}
	return now;
}

export async function updateParticipantName(
	participantId: string,
	name: string
): Promise<void> {
	await participants.updateName(participantId, name);
	const participant = await participants.findById(participantId);
	if (participant) {
		await sessions.syncParticipantFields(participantId, participant);
		await moduleProgressStore.syncParticipantFields(
			participantId,
			participant.name,
			participant.userKey
		);
	}
}
