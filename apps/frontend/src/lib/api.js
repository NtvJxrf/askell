import { auth } from '@/auth';
import { headers } from 'next/headers';

const API_BASE = 'http://localhost:6789/api'
/**
 * Server-side helper to call the Moleculer API with the current user's
 * access token. Use only in Server Components / Server Actions / Route Handlers.
 */
export async function apiFetch(path, options = {}) {
  const session = await auth();

  const headersMap = { 'Content-Type': 'application/json' };
  if (session?.accessToken) {
    headersMap.Authorization = `Bearer ${session.accessToken}`;
  }
  // Прокидываем реальный IP клиента (см. комментарий в route.js) —
  // без этого gateway всегда видит IP самого Next.js-сервера.
  const incomingHeaders = await headers();
  const forwardedFor = incomingHeaders.get('x-forwarded-for');
  if (forwardedFor) headersMap['x-forwarded-for'] = forwardedFor;
  const realIp = incomingHeaders.get('x-real-ip');
  if (realIp) headersMap['x-real-ip'] = realIp;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headersMap, ...(options.headers || {}) },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status} ${path}: ${body}`);
  }
  return res.json();
}
