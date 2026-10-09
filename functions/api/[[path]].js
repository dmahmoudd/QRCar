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
  const location = upstream.headers.get('location');

  if (location && upstream.status >= 300 && upstream.status < 400) {
    return redirectClient(location, upstream.status);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers,
  });
}

function redirectClient(location, status) {
  const code = status === 301 ? 301 : 302;
  const safe = escapeHtml(location);

  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${safe}"></head><body><p><a href="${safe}">Continue</a></p></body></html>`,
    {
      status: code,
      headers: {
        Location: location,
        'Content-Type': 'text/html; charset=utf-8',
      },
    },
  );
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
