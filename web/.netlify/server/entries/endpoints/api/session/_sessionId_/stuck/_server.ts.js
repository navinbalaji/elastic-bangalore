import { error, json } from "@sveltejs/kit";
import { d as db, s as sessions, p as participants } from "../../../../../../chunks/index3.js";
import { eq } from "drizzle-orm";
const POST = async ({ params }) => {
  const rows = await db.select({ id: sessions.id, participantId: sessions.participantId }).from(sessions).where(eq(sessions.id, params.sessionId)).limit(1);
  const row = rows[0];
  if (!row) error(404, "Session not found");
  const now = /* @__PURE__ */ new Date();
  await db.update(sessions).set({ stuckAt: now, blinkAt: null, updatedAt: now }).where(eq(sessions.id, params.sessionId));
  await db.update(participants).set({ lastSeenAt: now }).where(eq(participants.id, row.participantId));
  return json({ ok: true, stuckAt: now.toISOString() });
};
const DELETE = async ({ params }) => {
  const rows = await db.select({ id: sessions.id, participantId: sessions.participantId }).from(sessions).where(eq(sessions.id, params.sessionId)).limit(1);
  const row = rows[0];
  if (!row) error(404, "Session not found");
  const now = /* @__PURE__ */ new Date();
  await db.update(sessions).set({ stuckAt: null, updatedAt: now }).where(eq(sessions.id, params.sessionId));
  await db.update(participants).set({ lastSeenAt: now }).where(eq(participants.id, row.participantId));
  return json({ ok: true });
};
export {
  DELETE,
  POST
};
