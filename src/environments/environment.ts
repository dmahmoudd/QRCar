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
};
