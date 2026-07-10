export function parseDoubtMessage(body: unknown): string | null {
	const message = typeof body === 'object' && body !== null && 'message' in body
		? String((body as { message?: unknown }).message ?? '').trim()
		: '';
	if (!message) return null;
	if (message.length > 2000) return null;
	return message;
}

export function parseDoubtReply(body: unknown): string | null {
	const reply = typeof body === 'object' && body !== null && 'reply' in body
		? String((body as { reply?: unknown }).reply ?? '').trim()
		: '';
	if (!reply) return null;
	if (reply.length > 2000) return null;
	return reply;
}
