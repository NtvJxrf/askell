import { auth } from '@/auth';

const API_BASE = process.env.NEXT_PUBLIC_ENV === 'development' ? 'http://localhost:6789/api' : `${process.env.API_URL}/api`;
/**
 * Server-side helper to call the Moleculer API with the current user's
 * access token. Use only in Server Components / Server Actions / Route Handlers.
 */
export async function apiFetch(path, options = {}) {
  const session = await auth();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status} ${path}: ${body}`);
  }
  return res.json();
}
