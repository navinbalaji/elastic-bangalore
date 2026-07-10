/** Map lab-guide filenames to files in web/images */
const FILENAME_ALIASES: Record<string, string> = {
	'image48.png': 'image-48.png'
};

const WORKSHOP_ASSETS: Record<string, string> = {
	'harrypotter_sorcerers_stone_chapter_5-workshop-asset.pdf':
		'/harrypotter_sorcerers_stone_chapter_5-workshop-asset.pdf',
	'properties-dataset.csv': '/properties-dataset.csv'
};

const GITHUB_IMAGES_RE =
	/!\[([^\]]*)\]\(https:\/\/github\.com\/elastic\/meetups\/blob\/main\/Mumbai\/27-06-2026_Jina-Elastic-Genai-A2A-Workshop\/images\/([^)]+)\)/g;

const RELATIVE_IMAGES_RE = /!\[([^\]]*)\]\(images\/([^)]+)\)/g;

function localImagePath(filename: string): string {
	const base = filename.split('/').pop() ?? filename;
	const resolved = FILENAME_ALIASES[base] ?? base;
	return `/images/${resolved}`;
}

/** Rewrite lab-guide image links to local /images/ assets (web/static/images). */
export function rewriteGuideImages(markdown: string): string {
	let md = markdown.replace(GITHUB_IMAGES_RE, (_, alt: string, file: string) => {
		return `![${alt}](${localImagePath(file)})`;
	});
	md = md.replace(RELATIVE_IMAGES_RE, (_, alt: string, file: string) => {
		return `![${alt}](${localImagePath(file)})`;
	});
	return md;
}

/** Rewrite relative workshop asset links (PDF, CSV) to static paths. */
export function rewriteGuideAssets(markdown: string): string {
	let md = markdown;
	for (const [relative, absolute] of Object.entries(WORKSHOP_ASSETS)) {
		md = md.replaceAll(`](${relative})`, `](${absolute})`);
	}
	return md;
}

/** Apply all lab-guide link rewrites before rendering. */
export function rewriteGuideLinks(markdown: string): string {
	return rewriteGuideAssets(rewriteGuideImages(markdown));
}
