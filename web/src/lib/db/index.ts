import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { env } from '$env/dynamic/private';
import { createPostgresClient } from './postgres';

const connectionString =
	env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/elastic_bangalore';

const client = createPostgresClient(connectionString);
export const db = drizzle(client, { schema });
