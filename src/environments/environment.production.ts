export const environment = {
  production: true,
  /**
   * Same-origin so the browser stays on HTTPS (Cloudflare Pages). A Pages Function
   * forwards /api/v1 to the MonsterASP API, which does not have working TLS yet.
   */
  apiBaseUrl: '/api/v1',
};
