// Next.js 16 renamed Middleware to Proxy. NextAuth's `auth` wrapper protects
// routes using the `authorized` callback defined in `src/auth.js`.
export { auth as proxy } from '@/auth';

export const config = {
  // Run on everything except API routes, Next internals and static files
  // served from /public (e.g. favicon, images, standalone HTML pages like
  // logistic-request.html used by external iframes).
  matcher: ['/((?!api|_next/static|_next/image|.*\\.[\\w]+$).*)'],
};
