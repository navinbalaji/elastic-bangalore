export function parseDoubtMessage(body: unknown): string | null {
	const message = typeof body === 'object' && body !== null && 'message' in body
		? String((body as { message?: unknown }).message ?? '').trim()
		: '';
	if (!message) return null;
	if (message.length > 2000) return null;
	return message;
}
