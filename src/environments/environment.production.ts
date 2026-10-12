import { OFFICIAL_TALA3NY_ORIGINS } from '../app/core/qr/tala3ny-qr-payload';

const PAGES_API_BASE_URL = 'https://qrcar.pages.dev/api/v1';

function isNativeCapacitor(): boolean {
  const capacitor = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return capacitor?.isNativePlatform?.() === true;
}

export const environment = {
  production: true,
  /**
   * Website: same-origin `/api/v1` so Cloudflare Pages can proxy to MonsterASP.
   * Capacitor has no Pages Function, so the packaged app must call the live site.
   */
  get apiBaseUrl(): string {
    return isNativeCapacitor() ? PAGES_API_BASE_URL : '/api/v1';
  },
  scanAllowedOrigins: OFFICIAL_TALA3NY_ORIGINS,
  officialScannerPath: '/scan',
  /**
   * Native-app launch targets. Empty until an official Tala3ny app and store
   * listings exist. Do not invent store URLs or pretend this website is that app.
   */
  appLaunch: {
    deepLink: '',
    iosStoreUrl: '',
    androidStoreUrl: '',
  },
};