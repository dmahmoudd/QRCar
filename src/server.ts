import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

function lanHosts(): string[] {
  const hosts = new Set<string>(['localhost', '127.0.0.1']);
  for (const extra of (process.env['NG_ALLOWED_HOSTS'] ?? '').split(',')) {
    if (extra.trim()) {
      hosts.add(extra.trim());
    }
  }

  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) {
        hosts.add(address.address);
      }
    }
  }

  return [...hosts];
}

const app = express();
const angularApp = new AngularNodeAppEngine({
  allowedHosts: lanHosts(),
});
const apiBaseUrl = (process.env['API_BASE_URL'] ?? 'http://127.0.0.1:5035/api/v1').replace(
  /\/$/,
  '',
);

app.use((req, _res, next) => {
  console.log(`${req.method} ${req.originalUrl} host=${req.headers.host} ua=${req.headers['user-agent'] ?? ''}`);
  next();
});

/**
 * Phone cameras and in-app browsers often fail to run the Angular bundle. This route
 * returns a complete page with no JavaScript so a scan still shows the number.
 */
app.get('/c/:token/call', async (req, res, next) => {
  try {
    await proxyContactRedirect(req.params['token'] ?? '', 'call', res);
  } catch (error) {
    next(error);
  }
});

app.get('/c/:token/whatsapp', async (req, res, next) => {
  try {
    await proxyContactRedirect(req.params['token'] ?? '', 'whatsapp', res);
  } catch (error) {
    next(error);
  }
});

app.get('/c/:token', async (req, res, next) => {
  try {
    const token = req.params['token'] ?? '';
    const response = await fetch(`${apiBaseUrl}/public/cars/${encodeURIComponent(token)}`);
    res
      .status(response.ok ? 200 : response.status)
      .type('html')
      .send(await renderPublicScanPage(response, token));
  } catch (error) {
    console.error('Public scan page failed', error);
    next(error);
  }
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = Number(process.env['PORT'] || 4000);
  app.listen(port, '0.0.0.0', (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://0.0.0.0:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

async function proxyContactRedirect(
  token: string,
  action: 'call' | 'whatsapp',
  res: express.Response,
): Promise<void> {
  const response = await fetch(
    `${apiBaseUrl}/public/cars/${encodeURIComponent(token)}/${action}`,
    { redirect: 'manual' },
  );
  const location = response.headers.get('location');
  if (location) {
    res.redirect(302, location);
    return;
  }

  res.status(response.status).type('html').send(
    scanDocument('Could not start the call', '<p>Try again in a moment.</p>'),
  );
}

interface PublicScanPayload {
  maskedPhone?: string;
  shareLocation?: boolean;
  lastLatitude?: number | null;
  lastLongitude?: number | null;
  lastLocatedAtUtc?: string | null;
}

async function renderPublicScanPage(response: Response, token: string): Promise<string> {
  if (response.status === 404) {
    return scanDocument(
      'This code is not recognised',
      '<p>The sticker may be damaged, or the owner may have replaced the code.</p>',
    );
  }

  if (response.status === 410) {
    return scanDocument(
      'This code is no longer active',
      '<p>The owner removed this QR code.</p>',
    );
  }

  if (!response.ok) {
    return scanDocument(
      'Could not load this code',
      `<p>The server returned ${response.status}. Try again in a moment.</p>`,
    );
  }

  const data = (await response.json()) as PublicScanPayload;
  const masked = (data.maskedPhone ?? '').trim();
  const hasLocation =
    data.shareLocation === true && data.lastLatitude != null && data.lastLongitude != null;
  const mapsUrl = hasLocation
    ? `https://www.google.com/maps?q=${data.lastLatitude},${data.lastLongitude}`
    : '';

  const locationBlock = hasLocation
    ? `<a class="btn secondary" href="${escapeHtml(mapsUrl)}">Open last location</a>
       <p class="hint">Last reported position while the owner's phone was on. A switched-off phone cannot be found.</p>`
    : `<p class="hint">No location yet. The owner has to turn on sharing. A closed phone cannot be located.</p>`;

  const safeToken = encodeURIComponent(token);
  const actions = masked
    ? `<p class="phone">${escapeHtml(masked)}</p>
       <p class="hint">The full number is not shown on this page.</p>
       <a class="btn" href="/c/${safeToken}/call">Call</a>
       <a class="btn secondary" href="/c/${safeToken}/whatsapp">WhatsApp</a>`
    : `<p>No phone number is on this code.</p>`;

  return scanDocument(
    'Contact the owner',
    `${actions}${locationBlock}<p class="hint">Ref ${escapeHtml(token)}</p>`,
  );
}

function scanDocument(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; }
    main { max-width: 28rem; margin: 0 auto; padding: 1.5rem; }
    .card { background: #fff; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 1px 3px rgb(0 0 0 / 0.08); }
    h1 { font-size: 1.25rem; margin: 0 0 1rem; }
    .phone { font-size: 1.5rem; font-family: ui-monospace, monospace; letter-spacing: 0.04em; }
    .btn { display: block; text-align: center; text-decoration: none; background: #4f46e5; color: #fff;
           border-radius: 0.75rem; padding: 0.9rem; font-weight: 600; margin: 0.6rem 0; }
    .btn.secondary { background: #fff; color: #4f46e5; border: 1px solid #c7d2fe; }
    .hint { color: #64748b; font-size: 0.8rem; line-height: 1.4; }
  </style>
</head>
<body>
  <main>
    <div class="card">
      <h1>${escapeHtml(title)}</h1>
      ${body}
    </div>
  </main>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
