export function nowIso(): string {
	return new Date().toISOString();
}

export function toDate(iso: string | null | undefined): Date | null {
	if (!iso) return null;
	return new Date(iso);
}
