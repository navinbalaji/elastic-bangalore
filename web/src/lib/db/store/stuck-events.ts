import { getEsClient } from '../app-client';
import { INDICES } from '../indices';
import type { StuckEvent, StuckEventDoc } from '../types';
import { nowIso } from './utils';

function docToStuckEvent(id: string, doc: Partial<StuckEventDoc> & Pick<StuckEventDoc, 'sessionId' | 'participantId' | 'participantName' | 'module' | 'stepId' | 'stepLabel' | 'cursorIndex' | 'stuckAt'>): StuckEvent {
	return {
		id,
		sessionId: doc.sessionId,
		participantId: doc.participantId,
		participantName: doc.participantName,
		module: doc.module,
		stepId: doc.stepId,
		stepLabel: doc.stepLabel,
		cursorIndex: doc.cursorIndex,
		stuckAt: doc.stuckAt,
		resolvedAt: doc.resolvedAt ?? null,
		resolvedBy: doc.resolvedBy ?? null
	};
}

export type CreateStuckEventInput = {
	sessionId: string;
	participantId: string;
	participantName: string;
	module: string;
	stepId: string;
	stepLabel: string;
	cursorIndex: number;
	stuckAt: string;
};

export async function create(input: CreateStuckEventInput): Promise<StuckEvent> {
	const client = getEsClient();
	const id = crypto.randomUUID();
	const doc: StuckEventDoc = {
		...input,
		resolvedAt: null,
		resolvedBy: null
	};

	await client.index({
		index: INDICES.stuckEvents,
		id,
		document: doc,
		refresh: 'wait_for'
	});

	return docToStuckEvent(id, doc);
}

export async function resolveLatest(
	sessionId: string,
	resolvedBy: 'blink' | 'dismiss'
): Promise<void> {
	const client = getEsClient();
	const res = await client.search<StuckEventDoc>({
		index: INDICES.stuckEvents,
		query: {
			bool: {
				must: [{ term: { sessionId } }],
				must_not: [{ exists: { field: 'resolvedAt' } }]
			}
		},
		sort: [{ stuckAt: 'desc' }],
		size: 1
	});

	const hit = res.hits.hits[0];
	if (!hit?._id) return;

	await client.update({
		index: INDICES.stuckEvents,
		id: hit._id,
		doc: { resolvedAt: nowIso(), resolvedBy },
		refresh: false,
		retry_on_conflict: 5
	});
}

export async function listForAdmin(): Promise<StuckEvent[]> {
	const client = getEsClient();
	const res = await client.search<StuckEventDoc>({
		index: INDICES.stuckEvents,
		query: { match_all: {} },
		sort: [{ stuckAt: 'desc' }],
		size: 1000
	});

	return res.hits.hits
		.filter((hit): hit is typeof hit & { _id: string; _source: StuckEventDoc } =>
			Boolean(hit._id && hit._source)
		)
		.map((hit) => docToStuckEvent(hit._id, hit._source));
}
