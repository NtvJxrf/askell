import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load the shared root .env (packages/shared/drizzle.config.js -> ../../.env)
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

/** @type {import('drizzle-kit').Config} */
export default {
  schema: './src/db/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
};
