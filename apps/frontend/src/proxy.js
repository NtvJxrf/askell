// Next.js 16 renamed Middleware to Proxy. NextAuth's `auth` wrapper protects
// routes using the `authorized` callback defined in `src/auth.js`.
import { auth } from '@/auth';
export { auth as proxy };

// Логируем каждый входящий запрос (метод + путь) перед тем, как передать
// его дальше в auth() — сама логика авторизации не меняется.
// export function proxy(request, event) {
//   console.log(`[proxy] ${request.method} ${request.nextUrl.pathname}${request.nextUrl.search}`);
//   return auth(request, event);
// }

export const config = {
  // Run on everything except API routes, Next internals and static files
  // served from /public (e.g. favicon, images, standalone HTML pages like
  // logistic-request.html used by external iframes).
  matcher: ['/((?!api|_next/static|_next/image|.*\\.[\\w]+$).*)'],
};
