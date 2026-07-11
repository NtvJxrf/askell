// Imports users migrated from the old project (see users.json in this folder)
// into the new database. Existing usernames are updated in place, so this is
// safe to re-run.
//
//   pnpm --filter backend exec node scripts/import-users.js
//
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, users, client } from '@askell/shared/db';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const raw = await readFile(path.join(__dirname, 'users.json'), 'utf8');
  const records = JSON.parse(raw);

  for (const record of records) {
    const values = {
      id: record.id,
      username: record.username,
      fullname: record.fullname,
      password: record.password,
      roles: record.roles ?? [],
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    };

    const [result] = await db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({
        target: users.username,
        set: {
          fullname: values.fullname,
          password: values.password,
          roles: values.roles,
          updatedAt: values.updatedAt,
        },
      })
      .returning({ id: users.id, username: users.username });

    console.log(`Upserted user "${result.username}" (id: ${result.id})`);
  }

  console.log(`Done. Upserted ${records.length} user(s).`);
}

main()
  .catch((err) => {
    console.error('Import failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });
