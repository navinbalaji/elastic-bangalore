import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { sectionForStep } from '../src/lib/server/guide/sections.ts';
import { rewriteGuideLinks } from '../src/lib/server/guide/images.ts';
import { ALL_STEPS } from '../src/lib/steps.ts';

const root = process.cwd();
const guidePath = join(root, 'static', 'lab-guide.md');
const imagesDir = join(root, 'static', 'images');

const doc = readFileSync(guidePath, 'utf8');
const imgRe = /!\[[^\]]*\]\(([^)]+)\)/g;
const linkRe = /\[[^\]]+\]\(([^)]+)\)/g;

let errors = 0;

function fail(msg: string) {
	console.error('ERROR:', msg);
	errors++;
}

// Every image reference in the full guide should resolve locally.
for (const match of doc.matchAll(imgRe)) {
	const ref = match[1];
	if (ref.startsWith('http')) {
		fail(`GitHub/remote image still in lab-guide.md: ${ref}`);
		continue;
	}
	const file = ref.replace(/^images\//, '');
	const path = join(imagesDir, file);
	if (!existsSync(path)) {
		fail(`Missing image file: static/images/${file} (referenced as ${ref})`);
	}
}

// Workshop asset links
for (const asset of [
	'harrypotter_sorcerers_stone_chapter_5-workshop-asset.pdf',
	'properties-dataset.csv'
]) {
	if (!existsSync(join(root, 'static', asset))) {
		fail(`Missing workshop asset: static/${asset}`);
	}
}

// Every workshop step should have guide content; images in each section must exist.
for (const step of ALL_STEPS) {
	const section = sectionForStep(step.id, doc);
	if (!section) {
		fail(`No lab-guide section for step ${step.id} (${step.label})`);
		continue;
	}

	const rewritten = rewriteGuideLinks(section);
	for (const match of rewritten.matchAll(imgRe)) {
		const src = match[1];
		if (!src.startsWith('/images/')) {
			fail(`Step ${step.id}: unexpected image src after rewrite: ${src}`);
			continue;
		}
		const file = src.replace('/images/', '');
		if (!existsSync(join(imagesDir, file))) {
			fail(`Step ${step.id}: missing image ${file}`);
		}
	}

	const imgs = [...rewritten.matchAll(imgRe)].length;
	const links = [...section.matchAll(linkRe)].filter((m) => !m[1].startsWith('http'));
	console.log(`OK  ${step.id.padEnd(22)} ${String(section.length).padStart(5)} chars  ${imgs} imgs  ${links.length} local links`);
}

if (errors > 0) {
	console.error(`\n${errors} problem(s) found`);
	process.exit(1);
}

console.log(`\nAll ${ALL_STEPS.length} steps validated — images and assets present.`);
