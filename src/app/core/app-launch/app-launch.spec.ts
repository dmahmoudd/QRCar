import { resolveOfficialAppDeepLink, resolveOfficialStoreUrl } from './app-launch';

describe('app launch helpers', () => {
  it('returns an empty deep link until one is configured', () => {
    expect(resolveOfficialAppDeepLink('', 'AbcdefghijkLMNOP12345-')).toBe('');
    expect(resolveOfficialAppDeepLink('   ', 'AbcdefghijkLMNOP12345-')).toBe('');
  });

  it('substitutes a token placeholder when a deep link is configured later', () => {
    expect(
      resolveOfficialAppDeepLink('tala3ny://scan/{token}', 'AbcdefghijkLMNOP12345-'),
    ).toBe('tala3ny://scan/AbcdefghijkLMNOP12345-');
  });

  it('does not invent store URLs', () => {
    expect(
      resolveOfficialStoreUrl({ deepLink: '', iosStoreUrl: '', androidStoreUrl: '' }, 'iPhone'),
    ).toBe('');
  });

  it('prefers the matching store URL when both are configured', () => {
    const config = {
      deepLink: '',
      iosStoreUrl: 'https://apps.example/ios',
      androidStoreUrl: 'https://play.example/android',
    };

    expect(resolveOfficialStoreUrl(config, 'iPhone')).toBe('https://apps.example/ios');
    expect(resolveOfficialStoreUrl(config, 'Android')).toBe('https://play.example/android');
  });
});
