import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  /*
   * Token routes cannot be prerendered (the token is unknown at build time). They used to
   * be RenderMode.Server for local SSR; the production Cloudflare Pages build is static,
   * which cannot emit a Node server. Client rendering plus the Pages SPA fallback is enough.
   * Local `ng serve` still uses the Express /c/:token HTML page in server.ts.
   */
  { path: 'c/:token', renderMode: RenderMode.Client },
  { path: 'r/:trackingRef', renderMode: RenderMode.Client },

  { path: 'login', renderMode: RenderMode.Prerender },
  { path: 'register', renderMode: RenderMode.Prerender },

  /*
   * Everything else is behind the auth guard and depends on a token held in localStorage,
   * which the server cannot see, so rendering it server-side would only produce a redirect.
   */
  { path: '**', renderMode: RenderMode.Client },
];
