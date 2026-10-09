export interface AppLaunchConfig {
  /** Custom scheme or universal link for the official native scan screen. */
  deepLink: string;
  iosStoreUrl: string;
  androidStoreUrl: string;
}

export function resolveOfficialAppDeepLink(deepLink: string, token: string): string {
  const template = deepLink.trim();
  if (!template) {
    return '';
  }

  return template.replaceAll('{token}', encodeURIComponent(token));
}

export function resolveOfficialStoreUrl(
  config: AppLaunchConfig,
  userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent,
): string {
  const ios = config.iosStoreUrl.trim();
  const android = config.androidStoreUrl.trim();

  if (/iPhone|iPad|iPod/i.test(userAgent) && ios) {
    return ios;
  }

  if (/Android/i.test(userAgent) && android) {
    return android;
  }

  return android || ios;
}
