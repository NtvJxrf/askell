import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  // username is used as the login
  username: text('username').notNull().unique(),
  fullname: text('fullname').notNull(),
  // bcrypt hash, never the plain password
  password: text('password').notNull(),
  // array of role names, e.g. ['admin'], ['user']
  roles: text('roles')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});