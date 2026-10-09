export const environment = {
  production: true,
  /**
   * Absolute public API URL. Cloudflare Pages and Render are different origins, so this
   * cannot be a relative `/api/v1` path. Replace the host when the Render service exists.
   * Override at build time with:
   *   ng build --define QRCAR_API_BASE_URL='"https://YOUR-SERVICE.onrender.com/api/v1"'
   */
  apiBaseUrl: productionApiBaseUrl(),
};

declare const QRCAR_API_BASE_URL: string | undefined;

function productionApiBaseUrl(): string {
  const fromDefine =
    typeof QRCAR_API_BASE_URL === 'string' ? QRCAR_API_BASE_URL.trim() : '';
  const value = (fromDefine || 'https://qrcar-api.onrender.com/api/v1').replace(/\/$/, '');

  if (/localhost|127\.0\.0\.1/i.test(value)) {
    throw new Error('Production apiBaseUrl must not point at localhost.');
  }

  return value;
}
