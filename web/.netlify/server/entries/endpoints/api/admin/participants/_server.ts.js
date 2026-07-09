import { error, json } from "@sveltejs/kit";
import { d as db, s as sessions, p as participants } from "../../../../../chunks/index3.js";
import { eq, desc } from "drizzle-orm";
import { i as isAdminAuthed } from "../../../../../chunks/auth.js";
import { j as jsonToStates } from "../../../../../chunks/session.js";
import { p as progressCounts, w as workshopComplete, m as moduleProgress } from "../../../../../chunks/steps.js";
const GET = async ({ cookies }) => {
  if (!isAdminAuthed(cookies)) error(401, "Unauthorized");
  const rows = await db.select({
    sessionId: sessions.id,
    participantId: participants.id,
    userKey: participants.userKey,
    name: participants.name,
    createdAt: participants.createdAt,
    lastSeenAt: participants.lastSeenAt,
    sessionCreatedAt: sessions.createdAt,
    sessionUpdatedAt: sessions.updatedAt,
    completedAt: sessions.completedAt,
    stuckAt: sessions.stuckAt,
    blinkAt: sessions.blinkAt,
    cursorIndex: sessions.cursorIndex,
    stepStates: sessions.stepStates
  }).from(sessions).innerJoin(participants, eq(sessions.participantId, participants.id)).orderBy(desc(sessions.updatedAt));
  const data = rows.map((row) => {
    const states = jsonToStates(row.stepStates ?? []);
    const progress = progressCounts(states);
    const failed = states.filter((s) => s.step.kind === "verifiable" && s.status === "fail");
    const current = states[row.cursorIndex];
    return {
      sessionId: row.sessionId,
      participantId: row.participantId,
      userKey: row.userKey,
      name: row.name,
      progress,
      percent: Math.round(progress.passed / progress.total * 100),
      modules: moduleProgress(states),
      complete: workshopComplete(states),
      completedAt: row.completedAt,
      currentStep: current?.step.label ?? "—",
      currentModule: current?.step.module ?? "—",
      failedSteps: failed.map((f) => ({ id: f.step.id, label: f.step.label, reason: f.reason })),
      joinedAt: row.createdAt,
      lastSeenAt: row.lastSeenAt,
      stuckAt: row.stuckAt?.toISOString() ?? null,
      blinkAt: row.blinkAt?.toISOString() ?? null,
      sessionUpdatedAt: row.sessionUpdatedAt
    };
  });
  return json({ participants: data, total: data.length });
};
export {
  GET
};
