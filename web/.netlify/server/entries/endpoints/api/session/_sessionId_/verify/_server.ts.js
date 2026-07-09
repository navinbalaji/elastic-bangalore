import { error, json } from "@sveltejs/kit";
import { d as db, s as sessions, p as participants } from "../../../../../../chunks/index3.js";
import { eq } from "drizzle-orm";
import { v as validateConfig, V as VerifyClient } from "../../../../../../chunks/client.js";
import { j as jsonToStates, s as statesToJson } from "../../../../../../chunks/session.js";
import { w as workshopComplete } from "../../../../../../chunks/steps.js";
const POST = async ({ params, request }) => {
  const [row] = await db.select().from(sessions).where(eq(sessions.id, params.sessionId)).limit(1);
  if (!row) error(404, "Session not found");
  const body = await request.json();
  const stepId = String(body.stepId ?? "");
  const credentials = body.credentials;
  const states = jsonToStates(row.stepStates ?? []);
  const idx = states.findIndex((s) => s.step.id === stepId);
  if (idx < 0) return json({ error: "Unknown step" }, { status: 400 });
  const st = states[idx];
  if (st.step.kind !== "verifiable") {
    return json({ error: "This step is not auto-verified" }, { status: 400 });
  }
  if (!credentials?.apiKey?.trim() || !credentials.kibanaUrl?.trim() || !credentials.elasticsearchUrl?.trim()) {
    return json({ error: "Configure Elastic credentials first" }, { status: 400 });
  }
  const config = {
    elasticsearchUrl: credentials.elasticsearchUrl.trim(),
    apiKey: credentials.apiKey.trim(),
    kibanaUrl: credentials.kibanaUrl.trim()
  };
  const configErr = validateConfig(config);
  if (configErr) return json({ error: configErr }, { status: 400 });
  states[idx] = { ...st, status: "running", reason: "Verifying…" };
  await db.update(sessions).set({ stepStates: statesToJson(states), updatedAt: /* @__PURE__ */ new Date() }).where(eq(sessions.id, params.sessionId));
  const client = new VerifyClient(config);
  const result = await client.verify(stepId);
  states[idx] = {
    ...st,
    status: result.pass ? "pass" : "fail",
    reason: result.reason
  };
  const complete = workshopComplete(states);
  await db.update(sessions).set({
    stepStates: statesToJson(states),
    completedAt: complete ? /* @__PURE__ */ new Date() : null,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(sessions.id, params.sessionId));
  await db.update(participants).set({ lastSeenAt: /* @__PURE__ */ new Date() }).where(eq(participants.id, row.participantId));
  return json({
    stepId,
    pass: result.pass,
    reason: result.reason,
    complete
  });
};
export {
  POST
};
