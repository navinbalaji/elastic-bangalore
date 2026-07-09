import { error, json } from "@sveltejs/kit";
import { d as db, p as participants, s as sessions, a as doubts } from "../../../../../chunks/index3.js";
import { eq, desc } from "drizzle-orm";
import { i as isAdminAuthed } from "../../../../../chunks/auth.js";
const GET = async ({ cookies }) => {
  if (!isAdminAuthed(cookies)) error(401, "Unauthorized");
  const rows = await db.select({
    id: doubts.id,
    message: doubts.message,
    createdAt: doubts.createdAt,
    sessionId: sessions.id,
    participantName: participants.name,
    userKey: participants.userKey
  }).from(doubts).innerJoin(sessions, eq(doubts.sessionId, sessions.id)).innerJoin(participants, eq(sessions.participantId, participants.id)).orderBy(desc(doubts.createdAt));
  return json({
    doubts: rows.map((row) => ({
      id: row.id,
      message: row.message,
      createdAt: row.createdAt.toISOString(),
      sessionId: row.sessionId,
      participantName: row.participantName,
      userKey: row.userKey
    })),
    total: rows.length
  });
};
export {
  GET
};
