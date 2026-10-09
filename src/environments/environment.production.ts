import { OFFICIAL_TALA3NY_ORIGINS } from '../app/core/qr/tala3ny-qr-payload';

export const environment = {
  production: true,
  /**
   * Same-origin so the browser stays on HTTPS (Cloudflare Pages). A Pages Function
   * forwards /api/v1 to the MonsterASP API, which does not have working TLS yet.
   */
  apiBaseUrl: '/api/v1',
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