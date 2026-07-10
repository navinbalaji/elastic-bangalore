import type { StepStateJson } from '$lib/db/types';
import type { StepState } from '$lib/types';
import { ALL_STEPS } from '$lib/steps';

export function statesToJson(states: StepState[]): StepStateJson[] {
	const now = new Date().toISOString();
	return states.map((st) => ({
		stepId: st.step.id,
		status: st.status,
		reason: st.reason,
		marked: st.marked,
		verifiedAt: st.status === 'pass' ? now : null,
		updatedAt: now
	}));
}

export function jsonToStates(json: StepStateJson[]): StepState[] {
	const byId = new Map(json.map((j) => [j.stepId, j]));
	return ALL_STEPS.map((step) => {
		const saved = byId.get(step.id);
		return {
			step,
			status: saved?.status ?? 'pending',
			reason: saved?.reason ?? '',
			marked: saved?.marked ?? false
		};
	});
}
