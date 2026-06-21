// Client-side helper to call any backend action through the same-origin proxy
// (see app/api/backend/[...path]/route.js). Usage from client components:
//   await backend('/orders/order', { params: { name: 'test' } });
//   await backend('/users/create', { method: 'POST', body: { ... } });
export async function backend(path, { method = 'GET', params, body } = {}) {
  const qs = params ? `?${new URLSearchParams(params)}` : '';
  const res = await fetch(`/api/backend${path}${qs}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend ${res.status} ${path}: ${text}`);
  }
  return res.json();
}
