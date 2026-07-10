export type Section = {
	start: string;
	end?: string;
	module?: string;
};

const stepSections: Record<string, Section> = {
	'm1-embeddings': { start: '1.1 Jina.ai Embeddings' },
	'm1-index': { start: '1.2 Jina.ai Semantic Reranker', end: 'Step 2 — Bulk index sample documents' },
	'm1-bulk': { start: 'Step 2 — Bulk index sample documents' },
	'm1-mapping': { start: 'Step 3 — Verify the mapping', end: '1.3 Search Without Reranking' },
	'm1-search': { start: '1.3 Search Without Reranking' },
	'm1-rerank': { start: '1.4 Search With Jina Semantic Reranking' },
	'm2-upload-guide': { module: 'Module 2 — File Uploader and Semantic Text', start: 'Steps' },
	'm2-verify-index': { module: 'Module 2 — File Uploader and Semantic Text', start: 'Steps' },
	'm3-upload-guide': {
		module: 'Module 3 — Jina.ai Multi-Language Search with ES|QL',
		start: 'Objective',
		end: '3.1 Cross-Language Search'
	},
	'm3-verify-index': {
		module: 'Module 3 — Jina.ai Multi-Language Search with ES|QL',
		start: 'Objective',
		end: '3.1 Cross-Language Search'
	},
	'm3-english-search': { start: '3.1 Cross-Language Search', end: '3.2 Optional' },
	'm3-french-search': { start: '3.1 Cross-Language Search', end: '3.2 Optional' },
	'm3-completion': { start: '3.3 Chat Completions with ES|QL' },
	'm3-lang-detect': { start: '3.4 Language Detection' },
	'm4-index-guide': { start: '4.1 Create the Email Lookup Index' },
	'm4-verify-index': { start: '4.1 Create the Email Lookup Index' },
	'm4-workflow-guide': { start: '4.2 Create the Workflow' },
	'm4-verify-workflow': { start: '4.2 Create the Workflow' },
	'm5-tool-email-guide': { start: '5.1 Create a Workflow Tool' },
	'm5-verify-tool-email': { start: '5.1 Create a Workflow Tool' },
	'm5-tool-search-guide': { start: '5.2 Create an Index Search Tool' },
	'm5-verify-tool-search': { start: '5.2 Create an Index Search Tool' },
	'm5-skill-guide': { start: '5.3 Create a Skill' },
	'm5-verify-skill': { start: '5.3 Create a Skill' },
	'm5-agent-guide': { start: '5.4 Create the AI Agent' },
	'm5-verify-agent': { start: '5.4 Create the AI Agent' },
	'm5-test-guide': { start: '5.5 Test Your Agent' },
	'm6-inspector-guide': { start: '6.1 Run the A2A Inspector Locally' },
	'm6-verify-agent-card': { start: '6.2 Inspect Your Agent Card' },
	'm6-chat-guide': { start: '6.3 Chat with Your Agent via A2A' }
};

function headingLevel(line: string): number {
	const trim = line.trim();
	if (!trim.startsWith('#')) return 0;
	let n = 0;
	while (n < trim.length && trim[n] === '#') n++;
	if (n === 0 || n >= trim.length || trim[n] !== ' ') return 0;
	return n;
}

function headingContains(line: string, text: string): boolean {
	let trim = line.trim().replace(/^#+\s*/, '');
	return trim.includes(text);
}

function findHeading(lines: string[], text: string, level: number): number {
	for (let i = 0; i < lines.length; i++) {
		if (headingLevel(lines[i]) === level && headingContains(lines[i], text)) return i;
	}
	return -1;
}

function findHeadingInRange(lines: string[], text: string, from: number, until: number): number {
	for (let i = from; i < until && i < lines.length; i++) {
		if (headingLevel(lines[i]) > 0 && headingContains(lines[i], text)) return i;
	}
	return -1;
}

function findNextHeading(lines: string[], from: number, maxLevel: number): number {
	for (let i = from + 1; i < lines.length; i++) {
		const lvl = headingLevel(lines[i]);
		if (lvl > 0 && lvl <= maxLevel) return i;
	}
	return -1;
}

function extractSection(doc: string, spec: Section): string | null {
	const lines = doc.split('\n');
	let moduleStart = -1;
	if (spec.module) {
		moduleStart = findHeading(lines, spec.module, 2);
		if (moduleStart < 0) return null;
	}

	let searchFrom = 0;
	let searchUntil = lines.length;
	if (moduleStart >= 0) {
		searchFrom = moduleStart;
		searchUntil = findNextHeading(lines, moduleStart, 2);
		if (searchUntil < 0) searchUntil = lines.length;
	}

	const start = findHeadingInRange(lines, spec.start, searchFrom, searchUntil);
	if (start < 0) return null;

	const startLevel = headingLevel(lines[start]);
	let end = searchUntil;
	if (spec.end) {
		const endIdx = findHeadingInRange(lines, spec.end, start + 1, searchUntil);
		if (endIdx >= 0) end = endIdx;
	} else {
		const next = findNextHeading(lines, start, startLevel);
		if (next >= 0 && next < end) end = next;
	}

	const body = lines.slice(start, end).join('\n').trim();
	return body || null;
}

export function sectionForStep(stepId: string, doc: string): string | null {
	const spec = stepSections[stepId];
	if (!spec) return null;
	return extractSection(doc, spec);
}

export async function loadLabGuide(): Promise<string> {
	const { LAB_GUIDE_DOCUMENT } = await import('./lab-guide-content');
	return LAB_GUIDE_DOCUMENT;
}
