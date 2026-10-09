import { OFFICIAL_TALA3NY_ORIGINS } from '../app/core/qr/tala3ny-qr-payload';

function currentHostname(): string {
  try {
    const location = (globalThis as { location?: { hostname?: string } }).location;
    return location?.hostname || 'localhost';
  } catch {
    return 'localhost';
  }
}

export const environment = {
  production: false,
  get apiBaseUrl(): string {
    // A phone opening the scan page cannot reach "localhost" on the developer's PC.
    return `http://${currentHostname()}:5035/api/v1`;
  },
  /**
   * Origins the in-app scanner will accept in a printed `/c/{token}` URL.
   * Official production stickers plus explicit local dev hosts only.
   */
  get scanAllowedOrigins(): readonly string[] {
    return [
      ...OFFICIAL_TALA3NY_ORIGINS,
      'http://localhost:4200',
      'http://127.0.0.1:4200',
      `http://${currentHostname()}:4200`,
    ];
  },
  /**
   * Official website scanner. Production is https://qrcar.pages.dev/scan.
   * The camera is not started by opening this path.
   */
  officialScannerPath: '/scan',
  /**
   * Native-app launch targets. Empty until an official Tala3ny app and store
   * listings exist. Do not invent store URLs.
   */
  appLaunch: {
    deepLink: '',
    iosStoreUrl: '',
    androidStoreUrl: '',
  },
};