/** Map lab-guide filenames to files in web/images */
const FILENAME_ALIASES: Record<string, string> = {
	'image48.png': 'image-48.png'
};

const GITHUB_IMAGES_RE =
	/!\[([^\]]*)\]\(https:\/\/github\.com\/elastic\/meetups\/blob\/main\/Mumbai\/27-06-2026_Jina-Elastic-Genai-A2A-Workshop\/images\/([^)]+)\)/g;

const RELATIVE_IMAGES_RE = /!\[([^\]]*)\]\(images\/([^)]+)\)/g;

function localImagePath(filename: string): string {
	const base = filename.split('/').pop() ?? filename;
	const resolved = FILENAME_ALIASES[base] ?? base;
	return `/images/${resolved}`;
}

/** Rewrite lab-guide image links to local /images/ assets (web/images). */
export function rewriteGuideImages(markdown: string): string {
	let md = markdown.replace(GITHUB_IMAGES_RE, (_, alt: string, file: string) => {
		return `![${alt}](${localImagePath(file)})`;
	});
	md = md.replace(RELATIVE_IMAGES_RE, (_, alt: string, file: string) => {
		return `![${alt}](${localImagePath(file)})`;
	});
	return md;
}
