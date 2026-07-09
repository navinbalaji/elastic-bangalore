import { error, json } from "@sveltejs/kit";
import { d as db, s as sessions, p as participants } from "../../../../../chunks/index3.js";
import { eq } from "drizzle-orm";
import { j as jsonToStates } from "../../../../../chunks/session.js";
import { p as progressCounts, w as workshopComplete } from "../../../../../chunks/steps.js";
import { marked } from "marked";
const stepSections = {
  "m1-embeddings": { start: "1.1 Jina.ai Embeddings" },
  "m1-index": { start: "1.2 Jina.ai Semantic Reranker", end: "Step 2 — Bulk index sample documents" },
  "m1-bulk": { start: "Step 2 — Bulk index sample documents" },
  "m1-mapping": { start: "Step 3 — Verify the mapping", end: "1.3 Search Without Reranking" },
  "m1-search": { start: "1.3 Search Without Reranking" },
  "m1-rerank": { start: "1.4 Search With Jina Semantic Reranking" },
  "m2-upload-guide": { module: "Module 2 — File Uploader and Semantic Text", start: "Steps" },
  "m2-verify-index": { module: "Module 2 — File Uploader and Semantic Text", start: "Steps" },
  "m3-upload-guide": {
    module: "Module 3 — Jina.ai Multi-Language Search with ES|QL",
    start: "Objective",
    end: "3.1 Cross-Language Search"
  },
  "m3-verify-index": {
    module: "Module 3 — Jina.ai Multi-Language Search with ES|QL",
    start: "Objective",
    end: "3.1 Cross-Language Search"
  },
  "m3-english-search": { start: "3.1 Cross-Language Search", end: "3.2 Optional" },
  "m3-french-search": { start: "3.1 Cross-Language Search", end: "3.2 Optional" },
  "m3-completion": { start: "3.3 Chat Completions with ES|QL" },
  "m3-lang-detect": { start: "3.4 Language Detection" },
  "m4-index-guide": { start: "4.1 Create the Email Lookup Index" },
  "m4-verify-index": { start: "4.1 Create the Email Lookup Index" },
  "m4-workflow-guide": { start: "4.2 Create the Workflow" },
  "m4-verify-workflow": { start: "4.2 Create the Workflow" },
  "m5-tool-email-guide": { start: "5.1 Create a Workflow Tool" },
  "m5-verify-tool-email": { start: "5.1 Create a Workflow Tool" },
  "m5-tool-search-guide": { start: "5.2 Create an Index Search Tool" },
  "m5-verify-tool-search": { start: "5.2 Create an Index Search Tool" },
  "m5-skill-guide": { start: "5.3 Create a Skill" },
  "m5-verify-skill": { start: "5.3 Create a Skill" },
  "m5-agent-guide": { start: "5.4 Create the AI Agent" },
  "m5-verify-agent": { start: "5.4 Create the AI Agent" },
  "m5-test-guide": { start: "5.5 Test Your Agent" },
  "m6-inspector-guide": { start: "6.1 Run the A2A Inspector Locally" },
  "m6-verify-agent-card": { start: "6.2 Inspect Your Agent Card" },
  "m6-chat-guide": { start: "6.3 Chat with Your Agent via A2A" }
};
function headingLevel(line) {
  const trim = line.trim();
  if (!trim.startsWith("#")) return 0;
  let n = 0;
  while (n < trim.length && trim[n] === "#") n++;
  if (n === 0 || n >= trim.length || trim[n] !== " ") return 0;
  return n;
}
function headingContains(line, text) {
  let trim = line.trim().replace(/^#+\s*/, "");
  return trim.includes(text);
}
function findHeading(lines, text, level) {
  for (let i = 0; i < lines.length; i++) {
    if (headingLevel(lines[i]) === level && headingContains(lines[i], text)) return i;
  }
  return -1;
}
function findHeadingInRange(lines, text, from, until) {
  for (let i = from; i < until && i < lines.length; i++) {
    if (headingLevel(lines[i]) > 0 && headingContains(lines[i], text)) return i;
  }
  return -1;
}
function findNextHeading(lines, from, maxLevel) {
  for (let i = from + 1; i < lines.length; i++) {
    const lvl = headingLevel(lines[i]);
    if (lvl > 0 && lvl <= maxLevel) return i;
  }
  return -1;
}
function extractSection(doc, spec) {
  const lines = doc.split("\n");
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
  const body = lines.slice(start, end).join("\n").trim();
  return body || null;
}
function sectionForStep(stepId, doc) {
  const spec = stepSections[stepId];
  if (!spec) return null;
  return extractSection(doc, spec);
}
async function loadLabGuide() {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const paths = [
    join(process.cwd(), "static", "lab-guide.md"),
    join(process.cwd(), "..", "lab-guide.md")
  ];
  for (const p of paths) {
    try {
      return await readFile(p, "utf-8");
    } catch {
    }
  }
  throw new Error("lab-guide.md not found");
}
const FILENAME_ALIASES = {
  "image48.png": "image-48.png"
};
const GITHUB_IMAGES_RE = /!\[([^\]]*)\]\(https:\/\/github\.com\/elastic\/meetups\/blob\/main\/Mumbai\/27-06-2026_Jina-Elastic-Genai-A2A-Workshop\/images\/([^)]+)\)/g;
const RELATIVE_IMAGES_RE = /!\[([^\]]*)\]\(images\/([^)]+)\)/g;
function localImagePath(filename) {
  const base = filename.split("/").pop() ?? filename;
  const resolved = FILENAME_ALIASES[base] ?? base;
  return `/images/${resolved}`;
}
function rewriteGuideImages(markdown) {
  let md = markdown.replace(GITHUB_IMAGES_RE, (_, alt, file) => {
    return `![${alt}](${localImagePath(file)})`;
  });
  md = md.replace(RELATIVE_IMAGES_RE, (_, alt, file) => {
    return `![${alt}](${localImagePath(file)})`;
  });
  return md;
}
function isEsql(text, lang) {
  const trimmed = text.trim();
  if (lang === "sql" || lang === "esql") return true;
  return /^\s*FROM\s+/i.test(trimmed) && trimmed.includes("|");
}
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
marked.use({
  renderer: {
    code({ text, lang }) {
      const esql = isEsql(text, lang);
      const copyLabel = esql ? "Copy ES|QL" : "Copy";
      const langLabel = esql ? "ES|QL" : lang || "code";
      return `<div class="code-block-wrap"><div class="code-block-header"><span class="code-lang">${escapeHtml(langLabel)}</span><button type="button" class="code-copy-btn">${copyLabel}</button></div><pre><code>${escapeHtml(text)}</code></pre></div>`;
    }
  }
});
async function renderGuideMarkdown(markdown) {
  return marked.parse(markdown);
}
async function getSession(sessionId) {
  const rows = await db.select({
    id: sessions.id,
    participantId: sessions.participantId,
    name: participants.name,
    cursorIndex: sessions.cursorIndex,
    stepStates: sessions.stepStates,
    completedAt: sessions.completedAt,
    stuckAt: sessions.stuckAt,
    blinkAt: sessions.blinkAt,
    createdAt: sessions.createdAt,
    updatedAt: sessions.updatedAt
  }).from(sessions).innerJoin(participants, eq(sessions.participantId, participants.id)).where(eq(sessions.id, sessionId)).limit(1);
  return rows[0];
}
const GET = async ({ params }) => {
  const row = await getSession(params.sessionId);
  if (!row) error(404, "Session not found");
  const states = jsonToStates(row.stepStates ?? []);
  const progress = progressCounts(states);
  const currentStep = states[row.cursorIndex] ?? states[0];
  let guideHtml = "";
  try {
    const doc = await loadLabGuide();
    const section = sectionForStep(currentStep?.step.id ?? "", doc);
    if (section) {
      guideHtml = await renderGuideMarkdown(rewriteGuideImages(section));
    }
  } catch {
    guideHtml = "<p>Lab guide section unavailable.</p>";
  }
  return json({
    sessionId: row.id,
    participantName: row.name,
    cursorIndex: row.cursorIndex,
    states: states.map((st) => ({
      id: st.step.id,
      module: st.step.module,
      label: st.step.label,
      kind: st.step.kind,
      instructions: st.step.instructions,
      status: st.status,
      reason: st.reason,
      marked: st.marked
    })),
    progress,
    complete: workshopComplete(states),
    completedAt: row.completedAt,
    stuckAt: row.stuckAt?.toISOString() ?? null,
    blinkAt: row.blinkAt?.toISOString() ?? null,
    guideHtml
  });
};
const PATCH = async ({ params, request }) => {
  const row = await getSession(params.sessionId);
  if (!row) error(404, "Session not found");
  const body = await request.json();
  const cursorIndex = Number(body.cursorIndex);
  if (!Number.isInteger(cursorIndex) || cursorIndex < 0) {
    return json({ error: "Invalid cursor" }, { status: 400 });
  }
  const states = jsonToStates(row.stepStates ?? []);
  if (cursorIndex >= states.length) {
    return json({ error: "Cursor out of range" }, { status: 400 });
  }
  await db.update(sessions).set({ cursorIndex, updatedAt: /* @__PURE__ */ new Date() }).where(eq(sessions.id, params.sessionId));
  await db.update(participants).set({ lastSeenAt: /* @__PURE__ */ new Date() }).where(eq(participants.id, row.participantId));
  return json({ ok: true, cursorIndex });
};
export {
  GET,
  PATCH
};
