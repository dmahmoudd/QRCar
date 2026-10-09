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

app.use((req, _res, next) => {
  console.log(`${req.method} ${req.originalUrl} host=${req.headers.host} ua=${req.headers['user-agent'] ?? ''}`);
  next();
});

/**
 * Phone cameras often open /c/{token} without running Angular. That page must never
 * fetch or render vehicle details, even when JavaScript is unavailable.
 */
app.get(['/c/:token/call', '/c/:token/whatsapp', '/c/:token'], (req, res) => {
  res.status(200).type('html').send(renderAppRequiredLanding());
});

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

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = Number(process.env['PORT'] || 4000);
  app.listen(port, '0.0.0.0', (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://0.0.0.0:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);

export function renderAppRequiredLanding(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Open Tala3ny Scanner</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; }
    main { max-width: 28rem; margin: 0 auto; padding: 1.5rem; }
    .card { background: #fff; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 1px 3px rgb(0 0 0 / 0.08); text-align: center; }
    h1 { font-size: 1.25rem; margin: 0 0 1rem; }
    p { color: #64748b; font-size: 0.95rem; line-height: 1.5; }
    .hint { color: #94a3b8; font-size: 0.8rem; line-height: 1.4; }
    .btn { display: block; text-align: center; text-decoration: none; background: #4f46e5; color: #fff;
           border-radius: 0.75rem; padding: 0.9rem; font-weight: 600; margin: 1rem 0 0.6rem; }
  </style>
</head>
<body>
  <main>
    <div class="card">
      <h1>Use the official Tala3ny scanner</h1>
      <p>To verify this Tala3ny QR code and access contact options, use the official Tala3ny scanner.</p>
      <p class="hint">Tala3ny verifies QR codes with its server. A recognized code alone does not prove that the sticker is still attached to the original vehicle.</p>
      <a class="btn" href="/scan">Open Tala3ny Scanner</a>
      <p class="hint">The camera starts only after you press Start scanning.</p>
    </div>
  </main>
</body>
</html>`;
}
