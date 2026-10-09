export const environment = {
  production: true,
  /**
   * Absolute public API URL. Cloudflare Pages and Render are different origins, so this
   * cannot be a relative `/api/v1` path. Change the host to match the Render service.
   */
  apiBaseUrl: 'https://qrcar-api.onrender.com/api/v1',
};
