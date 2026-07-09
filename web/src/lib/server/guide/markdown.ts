import { marked } from 'marked';

function isEsql(text: string, lang?: string): boolean {
	const trimmed = text.trim();
	if (lang === 'sql' || lang === 'esql') return true;
	return /^\s*FROM\s+/i.test(trimmed) && trimmed.includes('|');
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

marked.use({
	renderer: {
		code({ text, lang }: { text: string; lang?: string }) {
			const esql = isEsql(text, lang);
			const copyLabel = esql ? 'Copy ES|QL' : 'Copy';
			const langLabel = esql ? 'ES|QL' : lang || 'code';
			return `<div class="code-block-wrap"><div class="code-block-header"><span class="code-lang">${escapeHtml(langLabel)}</span><button type="button" class="code-copy-btn">${copyLabel}</button></div><pre><code>${escapeHtml(text)}</code></pre></div>`;
		}
	}
});

export async function renderGuideMarkdown(markdown: string): Promise<string> {
	return marked.parse(markdown) as string;
}
