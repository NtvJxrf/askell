import { NextResponse } from 'next/server';
import { auth } from '@/auth';

const API_BASE = process.env.NEXT_PUBLIC_ENV === 'development' ? 'http://localhost:6789/api/moysklad' : `${process.env.API_URL}/api/moysklad`;
// Generic same-origin proxy to the Moleculer gateway. The browser calls
// /api/backend/<anything> and this handler forwards it 1:1, attaching the
// user's Bearer token server-side. The access token never reaches the client.
async function forward(request, { params }) {
  const session = await auth();

  const { path = [] } = await params;
  const search = request.nextUrl.search; // includes leading "?" or ""
  const target = `${API_BASE}/${path.join('/')}${search}`;

  const headers = { 'Content-Type': 'application/json' };
  if (session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }
  // fetch() не пробрасывает IP исходного запроса сам по себе — без этого
  // gateway всегда видел бы IP этого Next.js-сервера, а не браузера.
  // nginx уже положил реальный IP клиента в эти заголовки (real_ip_header),
  // просто ретранслируем их дальше на gateway.
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) headers['x-forwarded-for'] = forwardedFor;
  const realIp = request.headers.get('x-real-ip');
  if (realIp) headers['x-real-ip'] = realIp;

  const method = request.method;
  const hasBody = method !== 'GET' && method !== 'HEAD';

  const res = await fetch(target, {
    method,
    headers,
    body: hasBody ? await request.text() : undefined,
    cache: 'no-store',
  });

  return new NextResponse(res.body, {
    status: res.status,
    headers: new Headers(res.headers),
  });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
