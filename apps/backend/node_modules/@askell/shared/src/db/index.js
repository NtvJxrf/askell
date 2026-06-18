// Ensure environment variables (DATABASE_URL, ...) are loaded before we read them.
import '../initEnv.js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Add it to the root .env file.');
}

// Single shared postgres.js client + drizzle instance.
export const client = postgres(connectionString);
export const db = drizzle(client, { schema });

// Re-export the schema so consumers can `import { db, users } from '@askell/shared/db'`.
export * from './schema.js';

// Re-export commonly used query operators so backend services don't need a
// direct dependency on `drizzle-orm`.
export { eq, and, or, ne, inArray, sql } from 'drizzle-orm';
