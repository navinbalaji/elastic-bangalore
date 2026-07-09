import postgres from 'postgres';

function isSupabaseUrl(connectionString: string): boolean {
	return connectionString.includes('supabase.com') || connectionString.includes('supabase.co');
}

/** Postgres client tuned for local dev and Supabase (SSL + no prepared statements on pooler). */
export function createPostgresClient(connectionString: string, max = 10) {
	const supabase = isSupabaseUrl(connectionString);
	return postgres(connectionString, {
		max,
		ssl: supabase ? 'require' : undefined,
		// Supabase transaction pooler (port 6543) does not support prepared statements.
		prepare: supabase ? false : undefined
	});
}
