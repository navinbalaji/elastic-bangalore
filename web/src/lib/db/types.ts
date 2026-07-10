export type StepStateJson = {
	stepId: string;
	status: 'pending' | 'running' | 'pass' | 'fail';
	reason: string;
	marked: boolean;
	verifiedAt: string | null;
	updatedAt: string;
};

export type ParticipantDoc = {
	userKey: string;
	name: string;
	createdAt: string;
	lastSeenAt: string;
};

export type SessionDoc = {
	participantId: string;
	participantName: string;
	userKey: string;
	participantCreatedAt: string;
	participantLastSeenAt: string;
	cursorIndex: number;
	stepStates: StepStateJson[];
	completedAt: string | null;
	stuckAt: string | null;
	blinkAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type DoubtDoc = {
	sessionId: string;
	message: string;
	reply: string | null;
	repliedAt: string | null;
	createdAt: string;
};

export type StuckEventDoc = {
	sessionId: string;
	participantId: string;
	participantName: string;
	module: string;
	stepId: string;
	stepLabel: string;
	cursorIndex: number;
	stuckAt: string;
	resolvedAt: string | null;
	resolvedBy: 'blink' | 'dismiss' | null;
};

export type ModuleStepProgressDoc = {
	id: string;
	label: string;
	kind: string;
	status: string;
	reason: string;
};

export type ModuleProgressDoc = {
	sessionId: string;
	participantId: string;
	participantName: string;
	userKey: string;
	module: string;
	moduleIndex: number;
	shortName: string;
	passed: number;
	total: number;
	percent: number;
	complete: boolean;
	hasFailed: boolean;
	steps: ModuleStepProgressDoc[];
	updatedAt: string;
};

export type Participant = ParticipantDoc & { id: string };
export type Session = SessionDoc & { id: string };
export type Doubt = DoubtDoc & { id: string };
export type StuckEvent = StuckEventDoc & { id: string };
export type ModuleProgressRecord = ModuleProgressDoc & { id: string };
