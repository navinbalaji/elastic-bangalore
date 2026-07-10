import { getEsClient } from '../app-client';
import { INDICES } from '../indices';
import type { ModuleProgressDoc, ModuleProgressRecord, Session } from '../types';
import { jsonToStates } from '$lib/session';
import { moduleProgress, MODULE_ORDER, type ModuleProgress } from '$lib/steps';
import { nowIso } from './utils';

function docToRecord(id: string, doc: ModuleProgressDoc): ModuleProgressRecord {
	return { id, ...doc };
}

function toModuleProgress(doc: ModuleProgressDoc): ModuleProgress {
	return {
		module: doc.module,
		shortName: doc.shortName,
		passed: doc.passed,
		total: doc.total,
		percent: doc.percent,
		complete: doc.complete,
		hasFailed: doc.hasFailed,
		steps: doc.steps.map((s) => ({
			id: s.id,
			label: s.label,
			kind: s.kind as ModuleProgress['steps'][0]['kind'],
			status: s.status as ModuleProgress['steps'][0]['status'],
			reason: s.reason
		}))
	};
}

function buildDoc(session: Session, mod: ModuleProgress, moduleIndex: number, updatedAt: string): ModuleProgressDoc {
	return {
		sessionId: session.id,
		participantId: session.participantId,
		participantName: session.participantName,
		userKey: session.userKey,
		module: mod.module,
		moduleIndex,
		shortName: mod.shortName,
		passed: mod.passed,
		total: mod.total,
		percent: mod.percent,
		complete: mod.complete,
		hasFailed: mod.hasFailed,
		steps: mod.steps.map((s) => ({
			id: s.id,
			label: s.label,
			kind: s.kind,
			status: s.status,
			reason: s.reason
		})),
		updatedAt
	};
}

export async function syncForSession(session: Session): Promise<void> {
	const states = jsonToStates(session.stepStates ?? []);
	const modules = moduleProgress(states);
	const updatedAt = nowIso();
	const client = getEsClient();

	const operations = modules.flatMap((mod, moduleIndex) => {
		const doc = buildDoc(session, mod, moduleIndex, updatedAt);
		return [
			{ index: { _index: INDICES.moduleProgress, _id: `${session.id}:${moduleIndex}` } },
			doc
		];
	});

	if (operations.length === 0) return;

	await client.bulk({
		operations,
		refresh: false
	});
}

export async function listBySessionIds(sessionIds: string[]): Promise<Map<string, ModuleProgress[]>> {
	const map = new Map<string, ModuleProgress[]>();
	if (sessionIds.length === 0) return map;

	const client = getEsClient();
	const res = await client.search<ModuleProgressDoc>({
		index: INDICES.moduleProgress,
		query: { terms: { sessionId: sessionIds } },
		sort: [{ moduleIndex: 'asc' }],
		size: sessionIds.length * MODULE_ORDER.length
	});

	for (const hit of res.hits.hits) {
		if (!hit._source) continue;
		const sessionId = hit._source.sessionId;
		const list = map.get(sessionId) ?? [];
		list.push(toModuleProgress(hit._source));
		map.set(sessionId, list);
	}

	for (const sessionId of sessionIds) {
		const list = map.get(sessionId);
		if (list && list.length > 0) continue;
		map.set(sessionId, []);
	}

	return map;
}

export async function listForAdmin(): Promise<ModuleProgressRecord[]> {
	const client = getEsClient();
	const res = await client.search<ModuleProgressDoc>({
		index: INDICES.moduleProgress,
		query: { match_all: {} },
		sort: [{ module: 'asc' }, { participantName: 'asc' }],
		size: 6000
	});

	return res.hits.hits
		.filter((hit): hit is typeof hit & { _id: string; _source: ModuleProgressDoc } =>
			Boolean(hit._id && hit._source)
		)
		.map((hit) => docToRecord(hit._id, hit._source));
}

export type ModuleRosterEntry = {
	sessionId: string;
	participantId: string;
	participantName: string;
	userKey: string;
	passed: number;
	total: number;
	percent: number;
	complete: boolean;
	hasFailed: boolean;
	steps: ModuleProgress['steps'];
	updatedAt: string;
};

export async function listGroupedByModule(): Promise<Record<string, ModuleRosterEntry[]>> {
	const records = await listForAdmin();
	const grouped: Record<string, ModuleRosterEntry[]> = {};

	for (const moduleName of MODULE_ORDER) {
		grouped[moduleName] = [];
	}

	for (const record of records) {
		const entry: ModuleRosterEntry = {
			sessionId: record.sessionId,
			participantId: record.participantId,
			participantName: record.participantName,
			userKey: record.userKey,
			passed: record.passed,
			total: record.total,
			percent: record.percent,
			complete: record.complete,
			hasFailed: record.hasFailed,
			steps: record.steps.map((s) => ({
				id: s.id,
				label: s.label,
				kind: s.kind as ModuleProgress['steps'][0]['kind'],
				status: s.status as ModuleProgress['steps'][0]['status'],
				reason: s.reason
			})),
			updatedAt: record.updatedAt
		};
		const list = grouped[record.module] ?? [];
		list.push(entry);
		grouped[record.module] = list;
	}

	return grouped;
}

export async function syncParticipantFields(
	participantId: string,
	participantName: string,
	userKey: string
): Promise<void> {
	const client = getEsClient();
	await client.updateByQuery({
		index: INDICES.moduleProgress,
		query: { term: { participantId } },
		script: {
			source: `
				ctx._source.participantName = params.participantName;
				ctx._source.userKey = params.userKey;
			`,
			params: { participantName, userKey }
		},
		refresh: false
	});
}

export async function deleteBySessionId(sessionId: string): Promise<void> {
	const client = getEsClient();
	await client.deleteByQuery({
		index: INDICES.moduleProgress,
		query: { term: { sessionId } },
		refresh: false
	});
}
