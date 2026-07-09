import type { Step, StepState, StepStatus, StepKind } from '$lib/types';

export const ALL_STEPS: Step[] = [
	{
		id: 'm1-embeddings',
		module: 'Module 1 — Jina Inference',
		label: 'Test Jina embedding endpoint',
		kind: 'verifiable',
		instructions: `Open Kibana → Dev Tools and run:

POST _inference/.jina-embeddings-v5-text-small
{
  "input": "There is no reason anyone would want a computer in their home"
}

Expected: response with text_embedding array of floating-point numbers.`
	},
	{
		id: 'm1-index',
		module: 'Module 1 — Jina Inference',
		label: 'Create rerank-demo index',
		kind: 'verifiable',
		instructions: `PUT rerank-demo
{
  "mappings": {
    "properties": {
      "content": { "type": "text" }
    }
  }
}`
	},
	{
		id: 'm1-bulk',
		module: 'Module 1 — Jina Inference',
		label: 'Bulk index 11 documents',
		kind: 'verifiable',
		instructions: `POST rerank-demo/_bulk
{ "index": {} }
{ "content": "Washington, D.C. ..." }
... (11 documents total — see lab guide)

Then verify: GET rerank-demo/_count → count: 11`
	},
	{
		id: 'm1-mapping',
		module: 'Module 1 — Jina Inference',
		label: 'Verify mapping',
		kind: 'verifiable',
		instructions: `GET /rerank-demo/_mapping

Expected: content field type is "text".`
	},
	{
		id: 'm1-search',
		module: 'Module 1 — Jina Inference',
		label: 'Search without reranking',
		kind: 'verifiable',
		instructions: `POST rerank-demo/_search with match query on "Capital of the USA?"`
	},
	{
		id: 'm1-rerank',
		module: 'Module 1 — Jina Inference',
		label: 'Search with Jina reranker',
		kind: 'verifiable',
		instructions: `POST rerank-demo/_search with text_similarity_reranker using .jina-reranker-v3`
	},
	{
		id: 'm2-upload-guide',
		module: 'Module 2 — Semantic Text',
		label: 'Upload Harry Potter PDF in Kibana',
		kind: 'guide',
		instructions: `Download the Harry Potter chapter PDF, then upload it in Kibana File Uploader with semantic_text field content_jina.`,
		download: {
			href: '/harrypotter_sorcerers_stone_chapter_5-workshop-asset.pdf',
			label: "Download Harry Potter — Chapter 5 (PDF)"
		}
	},
	{
		id: 'm2-verify-index',
		module: 'Module 2 — Semantic Text',
		label: 'Verify harrypotter index',
		kind: 'verifiable',
		instructions: `Verify harrypotter index exists with content_jina semantic_text and documents.`
	},
	{
		id: 'm3-upload-guide',
		module: 'Module 3 — Multilingual ES|QL',
		label: 'Upload properties-dataset.csv',
		kind: 'guide',
		instructions: `Download properties-dataset.csv, then upload it in Kibana File Uploader with semantic_text mapping.`,
		download: {
			href: '/properties-dataset.csv',
			label: 'Download properties-dataset.csv'
		}
	},
	{
		id: 'm3-verify-index',
		module: 'Module 3 — Multilingual ES|QL',
		label: 'Verify properties index',
		kind: 'verifiable',
		instructions: `Verify properties index with body_content_jina and geo_point location.`
	},
	{
		id: 'm3-english-search',
		module: 'Module 3 — Multilingual ES|QL',
		label: 'English semantic + geo search',
		kind: 'verifiable',
		instructions: `Run English ES|QL query — expect 1 E Scott Street in top results.`
	},
	{
		id: 'm3-french-search',
		module: 'Module 3 — Multilingual ES|QL',
		label: 'French cross-language search',
		kind: 'verifiable',
		instructions: `Run French ES|QL query — same property should surface.`
	},
	{
		id: 'm3-completion',
		module: 'Module 3 — Multilingual ES|QL',
		label: 'ES|QL COMPLETION',
		kind: 'verifiable',
		instructions: `Run COMPLETION query with .anthropic-claude-4.6-opus-completion.`
	},
	{
		id: 'm3-lang-detect',
		module: 'Module 3 — Multilingual ES|QL',
		label: 'Language detection (ML UI)',
		kind: 'guide',
		instructions: `Test lang_ident_model_1 in Kibana ML UI with German and Hindi samples.`
	},
	{
		id: 'm4-index-guide',
		module: 'Module 4 — Workflows',
		label: 'Create user_emails index + your doc',
		kind: 'guide',
		instructions: `Create user_emails index and add your name and email document.`
	},
	{
		id: 'm4-verify-index',
		module: 'Module 4 — Workflows',
		label: 'Verify user_emails index',
		kind: 'verifiable',
		instructions: `Verify user_emails exists with at least 1 document.`
	},
	{
		id: 'm4-workflow-guide',
		module: 'Module 4 — Workflows',
		label: 'Create send-email-with-lookup workflow',
		kind: 'guide',
		instructions: `Create send-email-with-lookup workflow in Kibana Workflows.`
	},
	{
		id: 'm4-verify-workflow',
		module: 'Module 4 — Workflows',
		label: 'Verify workflow exists',
		kind: 'verifiable',
		instructions: `Verify workflow send-email-with-lookup exists via Kibana API.`
	},
	{
		id: 'm5-tool-email-guide',
		module: 'Module 5 — Agent Builder',
		label: 'Create potter.send.email tool',
		kind: 'guide',
		instructions: `Create potter.send.email workflow tool in Agent Builder.`
	},
	{
		id: 'm5-verify-tool-email',
		module: 'Module 5 — Agent Builder',
		label: 'Verify potter.send.email tool',
		kind: 'verifiable',
		instructions: `Verify tool potter.send.email exists.`
	},
	{
		id: 'm5-tool-search-guide',
		module: 'Module 5 — Agent Builder',
		label: 'Create potter.chapter.5 tool',
		kind: 'guide',
		instructions: `Create potter.chapter.5 index search tool.`
	},
	{
		id: 'm5-verify-tool-search',
		module: 'Module 5 — Agent Builder',
		label: 'Verify potter.chapter.5 tool',
		kind: 'verifiable',
		instructions: `Verify tool potter.chapter.5 exists.`
	},
	{
		id: 'm5-skill-guide',
		module: 'Module 5 — Agent Builder',
		label: 'Create ministry-of-magic skill',
		kind: 'guide',
		instructions: `Create ministry-of-magic skill with potter.chapter.5 tool.`
	},
	{
		id: 'm5-verify-skill',
		module: 'Module 5 — Agent Builder',
		label: 'Verify ministry-of-magic skill',
		kind: 'verifiable',
		instructions: `Verify skill ministry-of-magic exists.`
	},
	{
		id: 'm5-agent-guide',
		module: 'Module 5 — Agent Builder',
		label: 'Create potter-answers agent',
		kind: 'guide',
		instructions: `Create potter-answers agent with both tools and skill.`
	},
	{
		id: 'm5-verify-agent',
		module: 'Module 5 — Agent Builder',
		label: 'Verify potter-answers agent',
		kind: 'verifiable',
		instructions: `Verify agent potter-answers exists with both tools attached.`
	},
	{
		id: 'm5-test-guide',
		module: 'Module 5 — Agent Builder',
		label: 'Test agent in Kibana chat',
		kind: 'guide',
		instructions: `Test Potter Answers agent in Kibana chat.`
	},
	{
		id: 'm6-inspector-guide',
		module: 'Module 6 — A2A',
		label: 'Run A2A Inspector locally',
		kind: 'guide',
		instructions: `Clone and run a2a-inspector locally.`
	},
	{
		id: 'm6-verify-agent-card',
		module: 'Module 6 — A2A',
		label: 'Verify A2A agent card',
		kind: 'verifiable',
		instructions: `Verify A2A agent card at /api/agent_builder/a2a/potter-answers.json`
	},
	{
		id: 'm6-chat-guide',
		module: 'Module 6 — A2A',
		label: 'Chat via A2A Inspector',
		kind: 'guide',
		instructions: `Chat with your agent via A2A Inspector.`
	}
];

export function initialStates(): StepState[] {
	return ALL_STEPS.map((step) => ({
		step,
		status: 'pending' as StepStatus,
		reason: '',
		marked: false
	}));
}

export function workshopComplete(states: StepState[]): boolean {
	for (const st of states) {
		if (st.step.kind === 'verifiable' && st.status !== 'pass') return false;
		if (st.step.kind === 'guide' && !st.marked) return false;
	}
	return states.length > 0;
}

export function progressCounts(states: StepState[]): { passed: number; total: number } {
	let passed = 0;
	for (const st of states) {
		if (st.step.kind === 'verifiable') {
			if (st.status === 'pass') passed++;
		} else if (st.marked) {
			passed++;
		}
	}
	return { passed, total: states.length };
}

export function stepCompleted(st: StepState): boolean {
	if (st.step.kind === 'verifiable') return st.status === 'pass';
	return st.marked;
}

export function stepStatusLabel(st: StepState): string {
	if (st.step.kind === 'verifiable' && st.status === 'pass') return 'verified';
	if (st.step.kind === 'verifiable' && st.status === 'fail') return 'failed';
	if (st.step.kind === 'guide' && st.marked) return 'acknowledged';
	return 'pending';
}

export function stepById(id: string): Step | undefined {
	return ALL_STEPS.find((s) => s.id === id);
}

export type ModuleStepStatus = 'pending' | 'pass' | 'fail' | 'marked';

export type ModuleStepSummary = {
	id: string;
	label: string;
	kind: StepKind;
	status: ModuleStepStatus;
	reason: string;
};

export type ModuleProgress = {
	module: string;
	shortName: string;
	passed: number;
	total: number;
	percent: number;
	complete: boolean;
	hasFailed: boolean;
	steps: ModuleStepSummary[];
};

export const MODULE_ORDER = [
	'Module 1 — Jina Inference',
	'Module 2 — Semantic Text',
	'Module 3 — Multilingual ES|QL',
	'Module 4 — Workflows',
	'Module 5 — Agent Builder',
	'Module 6 — A2A'
] as const;

function stepModuleStatus(st: StepState): ModuleStepStatus {
	if (st.step.kind === 'verifiable') {
		if (st.status === 'pass') return 'pass';
		if (st.status === 'fail') return 'fail';
		return 'pending';
	}
	return st.marked ? 'marked' : 'pending';
}

export function moduleProgress(states: StepState[]): ModuleProgress[] {
	const grouped = new Map<string, StepState[]>();
	for (const st of states) {
		const list = grouped.get(st.step.module) ?? [];
		list.push(st);
		grouped.set(st.step.module, list);
	}

	return MODULE_ORDER.map((module) => {
		const moduleStates = grouped.get(module) ?? [];
		let passed = 0;
		let hasFailed = false;
		const steps: ModuleStepSummary[] = moduleStates.map((st) => {
			const status = stepModuleStatus(st);
			if (stepCompleted(st)) passed++;
			if (status === 'fail') hasFailed = true;
			return {
				id: st.step.id,
				label: st.step.label,
				kind: st.step.kind,
				status,
				reason: st.reason
			};
		});
		const total = moduleStates.length;
		return {
			module,
			shortName: module.split(' — ')[0] ?? module,
			passed,
			total,
			percent: total ? Math.round((passed / total) * 100) : 0,
			complete: total > 0 && passed === total,
			hasFailed,
			steps
		};
	});
}
