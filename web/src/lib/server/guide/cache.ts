import { loadLabGuide, sectionForStep } from './sections';
import { rewriteGuideLinks } from './images';
import { renderGuideMarkdown } from './markdown';
import { ALL_STEPS } from '$lib/steps';

let labGuideDoc: string | null = null;
const htmlByStepId = new Map<string, string>();

async function getLabGuideDoc(): Promise<string> {
	if (!labGuideDoc) {
		labGuideDoc = await loadLabGuide();
	}
	return labGuideDoc;
}

export async function guideHtmlForStep(stepId: string): Promise<string> {
	const cached = htmlByStepId.get(stepId);
	if (cached) return cached;

	try {
		const doc = await getLabGuideDoc();
		const section = sectionForStep(stepId, doc);
		if (!section) {
			const fallback = '<p>Lab guide section unavailable.</p>';
			htmlByStepId.set(stepId, fallback);
			return fallback;
		}
		const html = await renderGuideMarkdown(rewriteGuideLinks(section));
		htmlByStepId.set(stepId, html);
		return html;
	} catch {
		const fallback = '<p>Lab guide section unavailable.</p>';
		htmlByStepId.set(stepId, fallback);
		return fallback;
	}
}

export function stepIdAtIndex(index: number): string | null {
	return ALL_STEPS[index]?.id ?? null;
}
