import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { hasPermission } from '@askell/shared';

// The Moleculer gateway base. API_URL is e.g. http://localhost:6789; routes
// live under /api.
const API_BASE = `${process.env.API_URL || 'http://localhost:6789'}/api`;
console.log('API_BASE_src auth', API_BASE);
// 30 days, matching the backend refresh-token lifetime.
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

// Route access rules, checked by the `authorized` callback (runs in the Proxy
// before a page renders). Uses the SAME permission helper as the backend
// gateway.
//   - PUBLIC_ROUTES       : reachable without signing in.
//   - PERMISSION_ROUTES   : require sign-in AND one of the listed permissions
//                           (admin always passes). Longest matching prefix wins.
// Anything not listed here just requires being signed in.
const PUBLIC_ROUTES = ['/login'];

const PERMISSION_ROUTES = [
  { prefix: '/calculators', permissions: ['Калькулятор'] },
  { prefix: '/admin', permissions: ['Админ'] },
];

async function refreshAccessToken(token) {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token.refreshToken }),
    });
    if (!res.ok) throw new Error('Failed to refresh token');

    const data = await res.json();
    return {
      ...token,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? token.refreshToken,
      accessTokenExpires: Date.now() + data.expiresIn * 1000,
      roles: data.user?.roles ?? token.roles,
      error: undefined,
    };
  } catch {
    // Force re-authentication on the next protected request.
    return { ...token, error: 'RefreshAccessTokenError' };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE },
  pages: { signIn: '/login' },

  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        // Authentication is delegated to the Moleculer backend, which owns the
        // database and issues the tokens.
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: credentials.username,
            password: credentials.password,
          }),
        });

        if (!res.ok) return null;

        const { user, accessToken, refreshToken, expiresIn } = await res.json();
        return {
          id: user.id,
          name: user.fullname,
          username: user.username,
          fullname: user.fullname,
          roles: user.roles ?? [],
          accessToken,
          refreshToken,
          expiresIn,
        };
      },
    }),
  ],

  callbacks: {
    // Used by the proxy (middleware) to protect routes.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user && !auth?.error;
      const { pathname } = nextUrl;

      //as
      // Public pages: reachable without an account.
      if (PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
        // Already signed-in users shouldn't see the login page.
        if (pathname.startsWith('/login') && isLoggedIn) {
          return Response.redirect(new URL('/', nextUrl));
        }
        return true;
      }

      // Everything else requires authentication.
      if (!isLoggedIn) return false;

      // Permission-gated pages: longest matching prefix wins.
      const rule = PERMISSION_ROUTES
        .filter((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`))
        .sort((a, b) => b.prefix.length - a.prefix.length)[0];

      if (rule && !hasPermission(auth.user, rule.permissions)) {
        // Signed in but lacking the permission -> send home (could be a /403 page).
        return Response.redirect(new URL('/', nextUrl));
      }

      return true;
    },

    async jwt({ token, user }) {
      // Initial sign in: persist user data and tokens.
      if (user) {
        return {
          ...token,
          id: user.id,
          username: user.username,
          fullname: user.fullname,
          roles: user.roles ?? [],
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          accessTokenExpires: Date.now() + (user.expiresIn ?? 0) * 1000,
        };
      }

      // Access token still valid (with a small safety buffer).
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires - 5000) {
        return token;
      }

      // Access token expired: rotate using the refresh token.
      return refreshAccessToken(token);
    },

    session({ session, token }) {
      session.user.id = token.id;
      session.user.username = token.username;
      session.user.fullname = token.fullname;
      session.user.roles = token.roles ?? [];
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
});
