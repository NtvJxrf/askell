// Smoke-tests for the backend API.
//
// Run:  node apps/backend/test.js   (or: pnpm --filter backend test)
//
// The gateway protects every route with a Bearer token. Public routes are only
// POST /api/auth/login and POST /api/auth/refresh. So the flow is:
//   1) login with admin creds -> get accessToken
//   2) send `Authorization: Bearer <accessToken>` on every other request
//
// Admin creds come from the root .env (ADMIN_USERNAME / ADMIN_PASSWORD),
// the same ones `pnpm seed` used to create the first admin.
import '@askell/shared/env';
import got from 'got';

const BASE = process.env.NEXT_PUBLIC_ENV === 'development' ? 'http://localhost:6789' : process.env.API_URL

const api = got.extend({
  prefixUrl: BASE,
  throwHttpErrors: false, // we assert on statusCode ourselves
  responseType: 'json',
  timeout: { request: 30_000 },
});

// ---- tiny test helpers --------------------------------------------------
let passed = 0;
let failed = 0;

function check(name, cond, extra) {
  if (cond) {
    passed++;
    console.log(`  \u2713 ${name}`);
  } else {
    failed++;
    console.error(`  \u2717 ${name}`, extra ?? '');
  }
}

// ---- auth ---------------------------------------------------------------
async function login() {
  const res = await api.post('api/auth/login', {
    json: {
      username: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_PASSWORD,
    },
  });
  if (res.statusCode !== 200) {
    throw new Error(`login failed: ${res.statusCode} ${JSON.stringify(res.body)}`);
  }
  return res.body; // { user, accessToken, refreshToken, expiresIn }
}

// An `api` instance that automatically sends the Bearer token.
function authed(accessToken) {
  return api.extend({ headers: { authorization: `Bearer ${accessToken}` } });
}

// ---- tests --------------------------------------------------------------
async function main() {
  console.log(`Testing ${BASE}\n`);

  // 1) protected route without a token must be rejected
  const anon = await api.get('api/users');
  check('GET /api/users without token -> 401', anon.statusCode === 401, anon.statusCode);

  // 2) login
  const { accessToken, user } = await login();
  check('login returns an access token', typeof accessToken === 'string' && accessToken.length > 0);
  check('login returns the user', user?.username === process.env.ADMIN_USERNAME);
  const client = authed(accessToken);

  // 3) /auth/me with the token
  const me = await client.get('api/me');
  check('GET /api/me -> 200', me.statusCode === 200, me.statusCode);
  check('me is the admin', me.body?.username === process.env.ADMIN_USERNAME);

  // 4) admin-only list
  const list = await client.get('api/users');
  check('GET /api/users (admin) -> 200', list.statusCode === 200, list.statusCode);
  check('users list is an array', Array.isArray(list.body));

  // 5) add your own endpoint checks here, e.g.:
  // const sklad = await client.get('api/proxy/sklad');
  // check('GET /api/proxy/sklad -> 200', sklad.statusCode === 200, sklad.statusCode);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error('Test run crashed:', err);
  process.exit(1);
});