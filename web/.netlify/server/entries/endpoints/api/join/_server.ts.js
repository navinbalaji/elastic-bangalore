import { json } from "@sveltejs/kit";
import { d as db, p as participants, s as sessions } from "../../../../chunks/index3.js";
import { eq, desc } from "drizzle-orm";
import { i as initialStates } from "../../../../chunks/steps.js";
import { s as statesToJson } from "../../../../chunks/session.js";
import { s as setSessionCookie } from "../../../../chunks/session-cookie.js";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUserKey(key) {
  return UUID_RE.test(key);
}
async function resumeParticipant(userKey, name, cookies) {
  const [existing] = await db.select({ id: participants.id, name: participants.name }).from(participants).where(eq(participants.userKey, userKey)).limit(1);
  if (!existing) return null;
  if (existing.name !== name) {
    await db.update(participants).set({ name, lastSeenAt: /* @__PURE__ */ new Date() }).where(eq(participants.id, existing.id));
  } else {
    await db.update(participants).set({ lastSeenAt: /* @__PURE__ */ new Date() }).where(eq(participants.id, existing.id));
  }
  const [session] = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.participantId, existing.id)).orderBy(desc(sessions.updatedAt)).limit(1);
  if (session) {
    setSessionCookie(cookies, session.id);
    return {
      participantId: existing.id,
      sessionId: session.id,
      name,
      userKey,
      resumed: true
    };
  }
  const [newSession] = await db.insert(sessions).values({
    participantId: existing.id,
    stepStates: statesToJson(initialStates())
  }).returning({ id: sessions.id });
  setSessionCookie(cookies, newSession.id);
  return {
    participantId: existing.id,
    sessionId: newSession.id,
    name,
    userKey,
    resumed: false
  };
}
const POST = async ({ request, cookies }) => {
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const userKey = String(body.userKey ?? "").trim();
  if (!name || name.length < 2) {
    return json({ error: "Please enter your name (at least 2 characters)" }, { status: 400 });
  }
  if (name.length > 100) {
    return json({ error: "Name is too long" }, { status: 400 });
  }
  if (!isValidUserKey(userKey)) {
    return json({ error: "Invalid user key" }, { status: 400 });
  }
  const resumed = await resumeParticipant(userKey, name, cookies);
  if (resumed) {
    return json(resumed);
  }
  const [participant] = await db.insert(participants).values({ userKey, name }).returning({ id: participants.id, name: participants.name });
  const [session] = await db.insert(sessions).values({
    participantId: participant.id,
    stepStates: statesToJson(initialStates())
  }).returning({ id: sessions.id });
  setSessionCookie(cookies, session.id);
  return json({
    participantId: participant.id,
    sessionId: session.id,
    name: participant.name,
    userKey,
    resumed: false
  });
};
export {
  POST
};
