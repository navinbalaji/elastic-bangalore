import { json, error } from "@sveltejs/kit";
import { d as db, a as doubts, s as sessions, p as participants } from "../../../../../../chunks/index3.js";
import { eq, desc } from "drizzle-orm";
const GET = async ({ params }) => {
  const rows = await db.select({
    id: doubts.id,
    message: doubts.message,
    createdAt: doubts.createdAt
  }).from(doubts).where(eq(doubts.sessionId, params.sessionId)).orderBy(desc(doubts.createdAt));
  return json({
    doubts: rows.map((row) => ({
      id: row.id,
      message: row.message,
      createdAt: row.createdAt.toISOString()
    }))
  });
};
const POST = async ({ params, request }) => {
  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) error(400, "Message is required");
  if (message.length > 2e3) error(400, "Message is too long (max 2000 characters)");
  const sessionRows = await db.select({ id: sessions.id, participantId: sessions.participantId }).from(sessions).where(eq(sessions.id, params.sessionId)).limit(1);
  const session = sessionRows[0];
  if (!session) error(404, "Session not found");
  const now = /* @__PURE__ */ new Date();
  const [row] = await db.insert(doubts).values({ sessionId: params.sessionId, message }).returning({
    id: doubts.id,
    message: doubts.message,
    createdAt: doubts.createdAt
  });
  await db.update(participants).set({ lastSeenAt: now }).where(eq(participants.id, session.participantId));
  return json({
    doubt: {
      id: row.id,
      message: row.message,
      createdAt: row.createdAt.toISOString()
    }
  });
};
export {
  GET,
  POST
};
