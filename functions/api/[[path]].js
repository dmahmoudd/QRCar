const BACKEND_ORIGIN = 'http://qrcar.runasp.net';

export async function onRequest(context) {
  const incoming = new URL(context.request.url);
  const target = `${BACKEND_ORIGIN}${incoming.pathname}${incoming.search}`;

  const headers = new Headers(context.request.headers);
  headers.delete('host');

  const init = {
    method: context.request.method,
    headers,
    redirect: 'manual',
  };

  if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
    init.body = context.request.body;
  }

  const upstream = await fetch(target, init);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers,
  });
}
