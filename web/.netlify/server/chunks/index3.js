import { drizzle } from "drizzle-orm/postgres-js";
import { pgTable, timestamp, text, uuid, uniqueIndex, jsonb, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { b as private_env } from "./shared-server.js";
import postgres from "postgres";
const participants = pgTable(
  "participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userKey: text("user_key").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [uniqueIndex("participants_user_key_idx").on(table.userKey)]
);
const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  participantId: uuid("participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }),
  cloudId: text("cloud_id"),
  elasticsearchUrl: text("elasticsearch_url"),
  apiKey: text("api_key"),
  kibanaUrl: text("kibana_url"),
  cursorIndex: integer("cursor_index").notNull().default(0),
  stepStates: jsonb("step_states").$type().notNull().default([]),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  stuckAt: timestamp("stuck_at", { withTimezone: true }),
  blinkAt: timestamp("blink_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
const doubts = pgTable("doubts", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
const participantsRelations = relations(participants, ({ many }) => ({
  sessions: many(sessions)
}));
const sessionsRelations = relations(sessions, ({ one, many }) => ({
  participant: one(participants, {
    fields: [sessions.participantId],
    references: [participants.id]
  }),
  doubts: many(doubts)
}));
const doubtsRelations = relations(doubts, ({ one }) => ({
  session: one(sessions, {
    fields: [doubts.sessionId],
    references: [sessions.id]
  })
}));
const schema = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  doubts,
  doubtsRelations,
  participants,
  participantsRelations,
  sessions,
  sessionsRelations
}, Symbol.toStringTag, { value: "Module" }));
function isSupabaseUrl(connectionString2) {
  return connectionString2.includes("supabase.com") || connectionString2.includes("supabase.co");
}
function createPostgresClient(connectionString2, max = 10) {
  const supabase = isSupabaseUrl(connectionString2);
  return postgres(connectionString2, {
    max,
    ssl: supabase ? "require" : void 0,
    // Supabase transaction pooler (port 6543) does not support prepared statements.
    prepare: supabase ? false : void 0
  });
}
const connectionString = private_env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/elastic_bangalore";
const client = createPostgresClient(connectionString);
const db = drizzle(client, { schema });
export {
  doubts as a,
  db as d,
  participants as p,
  sessions as s
};
