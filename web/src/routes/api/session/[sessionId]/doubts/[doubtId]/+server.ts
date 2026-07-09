import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { doubts } from '$lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { parseDoubtMessage } from '$lib/server/doubts';

async function getSessionDoubt(sessionId: string, doubtId: string) {
	const [row] = await db
		.select({
			id: doubts.id,
			message: doubts.message,
			createdAt: doubts.createdAt,
			sessionId: doubts.sessionId
		})
		.from(doubts)
		.where(and(eq(doubts.id, doubtId), eq(doubts.sessionId, sessionId)))
		.limit(1);

	return row;
}

function doubtJson(row: { id: string; message: string; createdAt: Date }) {
	return {
		id: row.id,
		message: row.message,
		createdAt: row.createdAt.toISOString()
	};
}

export const PATCH: RequestHandler = async ({ params, request }) => {
	const body = await request.json().catch(() => ({}));
	const message = parseDoubtMessage(body);
	if (!message) return json({ error: 'Message is required (max 2000 characters)' }, { status: 400 });

	const existing = await getSessionDoubt(params.sessionId, params.doubtId);
	if (!existing) error(404, 'Question not found');

	const [row] = await db
		.update(doubts)
		.set({ message })
		.where(eq(doubts.id, params.doubtId))
		.returning({
			id: doubts.id,
			message: doubts.message,
			createdAt: doubts.createdAt
		});

	return json({ doubt: doubtJson(row) });
};

export const DELETE: RequestHandler = async ({ params }) => {
	const existing = await getSessionDoubt(params.sessionId, params.doubtId);
	if (!existing) error(404, 'Question not found');

	await db.delete(doubts).where(eq(doubts.id, params.doubtId));

	return json({ ok: true });
};
