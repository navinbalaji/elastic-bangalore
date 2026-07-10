export const INDICES = {
	participants: 'workshop-participants',
	sessions: 'workshop-sessions',
	doubts: 'workshop-doubts',
	stuckEvents: 'workshop-stuck-events',
	moduleProgress: 'workshop-module-progress',
	chat: 'chat'
} as const;

const JINA_EMBEDDINGS_V5_SMALL = '.jina-embeddings-v5-text-small';

const jinaSemanticTextField = {
	type: 'semantic_text' as const,
	inference_id: JINA_EMBEDDINGS_V5_SMALL,
	model_settings: {
		task_type: 'text_embedding' as const,
		dimensions: 1024,
		similarity: 'cosine' as const,
		element_type: 'float' as const
	},
	index_options: {
		dense_vector: {
			type: 'flat' as const
		}
	}
};

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
	},
	[INDICES.chat]: {
		mappings: {
			properties: {
				doubtId: { type: 'keyword' },
				question: {
					type: 'text',
					copy_to: ['question_semantic']
				},
				question_semantic: jinaSemanticTextField,
				answer: { type: 'text' },
				sessionId: { type: 'keyword' },
				createdAt: { type: 'date' },
				repliedAt: { type: 'date' }
			}
		}
	}
} as const;
