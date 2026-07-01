// Creates the first admin user from ADMIN_* env vars. There is no public
// registration, so this is how the very first account gets bootstrapped.
//
//   pnpm seed
//
import { db, users, eq, client } from '@askell/shared/db';
import { hashPassword } from '../users/lib/auth.js';

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const fullname = process.env.ADMIN_FULLNAME || 'Administrator';

  if (!username || !password) {
    console.error('ADMIN_USERNAME and ADMIN_PASSWORD must be set in the root .env file.');
    process.exitCode = 1;
    return;
  }
  // await db
  // .delete(users)
  // .where(eq(users.username, 'admin'));
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existing) {
    console.log(`Admin user "${username}" already exists (id: ${existing.id}). Nothing to do.`);
    return;
  }

  const [created] = await db
    .insert(users)
    .values({
      username,
      fullname,
      password: await hashPassword(password),
      roles: ['Админ'],
    })
    .returning({ id: users.id, username: users.username, roles: users.roles });

  console.log('Created admin user:', created);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Close the postgres.js connection so the process can exit.
    await client.end({ timeout: 5 });
  });
