export type StepKind = 'guide' | 'verifiable';
export type StepStatus = 'pending' | 'running' | 'pass' | 'fail';

export type Step = {
	id: string;
	module: string;
	label: string;
	kind: StepKind;
	instructions: string;
};

export type StepState = {
	step: Step;
	status: StepStatus;
	reason: string;
	marked: boolean;
};

export type WorkshopConfig = {
	cloudId?: string;
	elasticsearchUrl?: string;
	apiKey: string;
	kibanaUrl: string;
};
