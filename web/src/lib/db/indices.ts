export const INDICES = {
	participants: 'workshop-participants',
	sessions: 'workshop-sessions',
	doubts: 'workshop-doubts',
	stuckEvents: 'workshop-stuck-events',
	moduleProgress: 'workshop-module-progress'
} as const;

export const INDEX_MAPPINGS = {
	[INDICES.participants]: {
		mappings: {
			properties: {
				userKey: { type: 'keyword' },
				name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
				createdAt: { type: 'date' },
				lastSeenAt: { type: 'date' }
			}
		}
	},
	[INDICES.sessions]: {
		mappings: {
			properties: {
				participantId: { type: 'keyword' },
				participantName: { type: 'keyword' },
				userKey: { type: 'keyword' },
				participantCreatedAt: { type: 'date' },
				participantLastSeenAt: { type: 'date' },
				cursorIndex: { type: 'integer' },
				stepStates: { type: 'object', enabled: true },
				completedAt: { type: 'date' },
				stuckAt: { type: 'date' },
				blinkAt: { type: 'date' },
				createdAt: { type: 'date' },
				updatedAt: { type: 'date' }
			}
		}
	},
	[INDICES.doubts]: {
		mappings: {
			properties: {
				sessionId: { type: 'keyword' },
				message: { type: 'text' },
				reply: { type: 'text' },
				repliedAt: { type: 'date' },
				createdAt: { type: 'date' }
			}
		}
	},
	[INDICES.stuckEvents]: {
		mappings: {
			properties: {
				sessionId: { type: 'keyword' },
				participantId: { type: 'keyword' },
				participantName: { type: 'keyword' },
				module: { type: 'keyword' },
				stepId: { type: 'keyword' },
				stepLabel: { type: 'text', fields: { keyword: { type: 'keyword' } } },
				cursorIndex: { type: 'integer' },
				stuckAt: { type: 'date' },
				resolvedAt: { type: 'date' },
				resolvedBy: { type: 'keyword' }
			}
		}
	},
	[INDICES.moduleProgress]: {
		mappings: {
			properties: {
				sessionId: { type: 'keyword' },
				participantId: { type: 'keyword' },
				participantName: { type: 'keyword' },
				userKey: { type: 'keyword' },
				module: { type: 'keyword' },
				moduleIndex: { type: 'integer' },
				shortName: { type: 'keyword' },
				passed: { type: 'integer' },
				total: { type: 'integer' },
				percent: { type: 'integer' },
				complete: { type: 'boolean' },
				hasFailed: { type: 'boolean' },
				steps: {
					type: 'nested',
					properties: {
						id: { type: 'keyword' },
						label: { type: 'text', fields: { keyword: { type: 'keyword' } } },
						kind: { type: 'keyword' },
						status: { type: 'keyword' },
						reason: { type: 'text' }
					}
				},
				updatedAt: { type: 'date' }
			}
		}
	}
} as const;
