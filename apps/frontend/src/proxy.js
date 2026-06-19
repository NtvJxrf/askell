// Next.js 16 renamed Middleware to Proxy. NextAuth's `auth` wrapper protects
// routes using the `authorized` callback defined in `src/auth.js`.
export { auth as proxy } from '@/auth';

export const config = {
  // Run on everything except API routes, static assets and the favicon.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
