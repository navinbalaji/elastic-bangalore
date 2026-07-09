import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createPostgresClient } from './postgres';

const connectionString =
	process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/elastic_bangalore';

const client = createPostgresClient(connectionString, 1);
const db = drizzle(client);

await migrate(db, { migrationsFolder: './drizzle' });
await client.end();
console.log('Migrations complete');
