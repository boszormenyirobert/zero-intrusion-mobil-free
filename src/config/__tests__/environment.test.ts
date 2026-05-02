import config, { API_PATHS, buildApiConfig, normalizeApiBaseUrl } from '../environment';

describe('environment config', () => {
  it('normalizes base urls', () => {
    expect(normalizeApiBaseUrl(' https://example.com/// ')).toBe('https://example.com');
  });

  it('builds api config from a base url', () => {
    const apiConfig = buildApiConfig('https://example.com/');

    expect(apiConfig.API_REGISTRATION).toBe('https://example.com/api/credential-hub/shared/registration/new');
    expect(Object.keys(apiConfig)).toEqual(Object.keys(API_PATHS));
  });

  it('exports default config with normalized endpoints', () => {
    expect(config.API_BASE).toBe('http://82.165.219.9:8085');
    expect(config.API_DEVICE_REGISTRATION).toBe(`${config.API_BASE}${API_PATHS.API_DEVICE_REGISTRATION}`);
  });
});
