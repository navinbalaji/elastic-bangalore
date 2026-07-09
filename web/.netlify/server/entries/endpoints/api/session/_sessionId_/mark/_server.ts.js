import { error, json } from "@sveltejs/kit";
import { d as db, s as sessions, p as participants } from "../../../../../../chunks/index3.js";
import { eq } from "drizzle-orm";
import { j as jsonToStates, s as statesToJson } from "../../../../../../chunks/session.js";
import { w as workshopComplete } from "../../../../../../chunks/steps.js";
const POST = async ({ params, request }) => {
  const [row] = await db.select().from(sessions).where(eq(sessions.id, params.sessionId)).limit(1);
  if (!row) error(404, "Session not found");
  const body = await request.json();
  const stepId = String(body.stepId ?? "");
  const states = jsonToStates(row.stepStates ?? []);
  const idx = states.findIndex((s) => s.step.id === stepId);
  if (idx < 0) return json({ error: "Unknown step" }, { status: 400 });
  const st = states[idx];
  if (st.step.kind !== "guide") {
    return json({ error: "Only guide steps can be marked" }, { status: 400 });
  }
  states[idx] = { ...st, marked: true, reason: "Acknowledged" };
  const complete = workshopComplete(states);
  await db.update(sessions).set({
    stepStates: statesToJson(states),
    completedAt: complete ? /* @__PURE__ */ new Date() : null,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(sessions.id, params.sessionId));
  await db.update(participants).set({ lastSeenAt: /* @__PURE__ */ new Date() }).where(eq(participants.id, row.participantId));
  return json({ stepId, marked: true, complete });
};
export {
  POST
};
