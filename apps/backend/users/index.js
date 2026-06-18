import { ServiceBroker, Errors } from 'moleculer';
import { db, users, eq } from '@askell/shared/db';
import { ROLES, ALL_ROLES } from '@askell/shared/roles';
import {
  hashPassword,
  comparePassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  accessTokenTtlSeconds,
} from '../lib/auth.js';

const { MoleculerClientError } = Errors;

// Columns that are safe to return to clients (never the password hash).
const publicColumns = {
  id: users.id,
  username: users.username,
  fullname: users.fullname,
  roles: users.roles,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

// Build the token bundle returned by login/refresh.
function issueTokens(user) {
  const safeUser = {
    id: user.id,
    username: user.username,
    fullname: user.fullname,
    roles: user.roles ?? [],
  };
  return {
    user: safeUser,
    accessToken: signAccessToken(safeUser),
    refreshToken: signRefreshToken(safeUser),
    expiresIn: accessTokenTtlSeconds(),
  };
}

const broker = new ServiceBroker({
  nodeID: 'users',
  transporter: 'nats://localhost:4222',
  logger: true,
});

broker.createService({
  name: 'users',

  // Base path for auto-generated REST aliases. With "/" the action `rest`
  // paths mount at the API root (e.g. POST /api/auth/login, GET /api/users).
  settings: { rest: '/' },

  actions: {
    /**
     * PUBLIC. Verify credentials and issue access + refresh tokens.
     */
    login: {
      rest: 'POST /auth/login',
      auth: false,
      params: {
        username: { type: 'string', trim: true, empty: false },
        password: { type: 'string', empty: false },
      },
      async handler(ctx) {
        const { username, password } = ctx.params;
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        // Same error whether the user is missing or the password is wrong,
        // to avoid leaking which usernames exist.
        if (!user || !(await comparePassword(password, user.password))) {
          throw new MoleculerClientError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
        }

        return issueTokens(user);
      },
    },

    /**
     * PUBLIC. Exchange a valid refresh token for a fresh access token.
     * Roles are re-read from the database so permission changes take effect.
     */
    refresh: {
      rest: 'POST /auth/refresh',
      auth: false,
      params: {
        refreshToken: { type: 'string', empty: false },
      },
      async handler(ctx) {
        let payload;
        try {
          payload = verifyRefreshToken(ctx.params.refreshToken);
        } catch {
          throw new MoleculerClientError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
        }

        const [user] = await db
          .select(publicColumns)
          .from(users)
          .where(eq(users.id, payload.id))
          .limit(1);
        if (!user) {
          throw new MoleculerClientError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
        }

        return issueTokens(user);
      },
    },

    /**
     * AUTHENTICATED. Return the current user (fresh from the database).
     */
    me: {
      rest: 'GET /auth/me',
      async handler(ctx) {
        const current = ctx.meta.user;
        if (!current) {
          throw new MoleculerClientError('Unauthorized', 401, 'UNAUTHORIZED');
        }
        const [user] = await db
          .select(publicColumns)
          .from(users)
          .where(eq(users.id, current.id))
          .limit(1);

        if (!user) {
          throw new MoleculerClientError('Unauthorized', 401, 'UNAUTHORIZED');
        }
        return user;
      },
    },

    /**
     * ADMIN ONLY. List all users.
     */
    list: {
      rest: 'GET /users',
      roles: [ROLES.ADMIN],
      async handler() {
        return db.select(publicColumns).from(users).orderBy(users.createdAt);
      },
    },

    /**
     * ADMIN ONLY. Create a new user. There is no public registration.
     */
    create: {
      rest: 'POST /users',
      roles: [ROLES.ADMIN],
      params: {
        username: { type: 'string', trim: true, empty: false },
        fullname: { type: 'string', trim: true, empty: false },
        password: { type: 'string', min: 6 },
        roles: {
          type: 'array',
          items: { type: 'enum', values: ALL_ROLES },
          optional: true,
          default: [],
        },
      },
      async handler(ctx) {
        const { username, fullname, password, roles } = ctx.params;

        const [existing] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.username, username))
          .limit(1);
        if (existing) {
          throw new MoleculerClientError('Username already exists', 409, 'USERNAME_TAKEN');
        }

        const [created] = await db
          .insert(users)
          .values({
            username,
            fullname,
            password: await hashPassword(password),
            roles,
          })
          .returning(publicColumns);
        return created;
      },
    },

    /**
     * ADMIN ONLY. Update an existing user's fullname, roles and/or password.
     */
    update: {
      rest: 'PATCH /users/:id',
      roles: [ROLES.ADMIN],
      params: {
        id: { type: 'uuid' },
        fullname: { type: 'string', trim: true, empty: false, optional: true },
        password: { type: 'string', min: 6, optional: true },
        roles: { type: 'array', items: { type: 'enum', values: ALL_ROLES }, optional: true },
      },
      async handler(ctx) {
        const { id, fullname, password, roles } = ctx.params;

        const patch = { updatedAt: new Date() };
        if (fullname !== undefined) patch.fullname = fullname;
        if (roles !== undefined) patch.roles = roles;
        if (password !== undefined) patch.password = await hashPassword(password);

        const [updated] = await db
          .update(users)
          .set(patch)
          .where(eq(users.id, id))
          .returning(publicColumns);
        if (!updated) {
          throw new MoleculerClientError('User not found', 404, 'NOT_FOUND');
        }
        return updated;
      },
    },

    /**
     * ADMIN ONLY. Delete a user.
     */
    remove: {
      rest: 'DELETE /users/:id',
      roles: [ROLES.ADMIN],
      params: {
        id: { type: 'uuid' },
      },
      async handler(ctx) {
        const [deleted] = await db
          .delete(users)
          .where(eq(users.id, ctx.params.id))
          .returning({ id: users.id });
        if (!deleted) {
          throw new MoleculerClientError('User not found', 404, 'NOT_FOUND');
        }
        return { id: deleted.id, deleted: true };
      },
    },
  },
});

broker.start();