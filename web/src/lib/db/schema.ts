import { pgTable, uuid, text, timestamp, integer, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export type StepStateJson = {
	stepId: string;
	status: 'pending' | 'running' | 'pass' | 'fail';
	reason: string;
	marked: boolean;
	verifiedAt: string | null;
	updatedAt: string;
};

export const participants = pgTable(
	'participants',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userKey: text('user_key').notNull(),
		name: text('name').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [uniqueIndex('participants_user_key_idx').on(table.userKey)]
);

export const sessions = pgTable('sessions', {
	id: uuid('id').primaryKey().defaultRandom(),
	participantId: uuid('participant_id')
		.notNull()
		.references(() => participants.id, { onDelete: 'cascade' }),
	cloudId: text('cloud_id'),
	elasticsearchUrl: text('elasticsearch_url'),
	apiKey: text('api_key'),
	kibanaUrl: text('kibana_url'),
	cursorIndex: integer('cursor_index').notNull().default(0),
	stepStates: jsonb('step_states').$type<StepStateJson[]>().notNull().default([]),
	completedAt: timestamp('completed_at', { withTimezone: true }),
	stuckAt: timestamp('stuck_at', { withTimezone: true }),
	blinkAt: timestamp('blink_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const doubts = pgTable('doubts', {
	id: uuid('id').primaryKey().defaultRandom(),
	sessionId: uuid('session_id')
		.notNull()
		.references(() => sessions.id, { onDelete: 'cascade' }),
	message: text('message').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const participantsRelations = relations(participants, ({ many }) => ({
	sessions: many(sessions)
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
	participant: one(participants, {
		fields: [sessions.participantId],
		references: [participants.id]
	}),
	doubts: many(doubts)
}));

export const doubtsRelations = relations(doubts, ({ one }) => ({
	session: one(sessions, {
		fields: [doubts.sessionId],
		references: [sessions.id]
	})
}));
