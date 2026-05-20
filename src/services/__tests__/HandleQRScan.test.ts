const mockHandler = {
  systemHubRegistration: jest.fn(),
  systemHubLogin: jest.fn(),
  systemHubSecureDevice: jest.fn(),
  sharedRegistration: jest.fn(),
  access: jest.fn(),
  delete: jest.fn(),
  clone: jest.fn(),
};

jest.mock('../HTTP/RequestHandler', () => ({
  RequestHandler: jest.fn(() => mockHandler),
}));

import { handleQRScan } from '../HandleQRScan';

describe('handleQRScan', () => {
  it('returns early when no data is provided', async () => {
    await expect(handleQRScan('')).resolves.toBeUndefined();
  });

  it('dispatches system hub and clone routes', async () => {
    mockHandler.systemHubRegistration.mockResolvedValueOnce(true);
    mockHandler.clone.mockResolvedValueOnce(true);

    await expect(handleQRScan(JSON.stringify({ type: 'system_hub_registration' }))).resolves.toEqual({
      type: 'system_hub_registration',
      result: true,
    });
    await expect(handleQRScan(JSON.stringify({ type: 'clone' }))).resolves.toEqual({
      type: 'clone',
      result: true,
    });

    expect(mockHandler.systemHubRegistration).toHaveBeenCalledWith({ type: 'system_hub_registration' });
    expect(mockHandler.clone).toHaveBeenCalledWith({ type: 'clone' });
  });

  it('dispatches domain-read and vault-read access routes', async () => {
    mockHandler.access.mockResolvedValue(true);

    await expect(handleQRScan(JSON.stringify({ type: 'domain-read' }))).resolves.toEqual({
      type: 'domain-read',
      result: true,
    });
    await expect(handleQRScan(JSON.stringify({ type: 'vault-read' }))).resolves.toEqual({
      type: 'vault-read',
      result: true,
    });

    expect(mockHandler.access).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: 'domain-read', source: 'extension' }),
    );
    expect(mockHandler.access).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: 'vault-read', source: 'extension' }),
    );
  });

  it('returns false for unknown or invalid qr payloads', async () => {
    await expect(handleQRScan(JSON.stringify({ type: 'unknown-route' }))).resolves.toBe(false);
    await expect(handleQRScan('{invalid')).resolves.toBe(false);
  });

  it('treats non-json scanner token as domain-login and forwards raw payload', async () => {
    mockHandler.access.mockResolvedValueOnce(true);

    await expect(handleQRScan('638a87aca8b2ee6a2d0e331ba641fbd3')).resolves.toEqual({
      type: 'domain-login',
      result: true,
    });

    expect(mockHandler.access).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'domain-login',
        qrCacheKey: '638a87aca8b2ee6a2d0e331ba641fbd3::domain-login',
        credentialCacheKey: '638a87aca8b2ee6a2d0e331ba641fbd3',
        source: 'extension',
        rawQrData: '638a87aca8b2ee6a2d0e331ba641fbd3',
      }),
    );
  });

  it('preserves fallback vault-read type for opaque scanner token', async () => {
    mockHandler.access.mockResolvedValueOnce(true);

    await expect(handleQRScan('638a87aca8b2ee6a2d0e331ba641fbd3', 'vault-read')).resolves.toEqual({
      type: 'vault-read',
      result: true,
    });

    expect(mockHandler.access).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'vault-read',
        qrCacheKey: '638a87aca8b2ee6a2d0e331ba641fbd3::applications',
        credentialCacheKey: '638a87aca8b2ee6a2d0e331ba641fbd3',
        source: 'extension',
        rawQrData: '638a87aca8b2ee6a2d0e331ba641fbd3',
      }),
    );
  });

  it('unwraps applicationProcessId payload and routes by inner applications type', async () => {
    mockHandler.access.mockResolvedValueOnce(true);

    const wrappedPayload = {
      type: 'domain-login',
      applicationProcessId: JSON.stringify({
        source: 'extension',
        type: 'applications',
        userPublicId: '',
        payload: {
          source: 'extension',
          type: 'applications',
          domain: 'hub.local:8082',
          userPublicId: '',
          publicKey: '{"alg":"RSA-OAEP-256"}',
        },
        publicKey: '{"alg":"RSA-OAEP-256"}',
      }),
      publicKey: '{"alg":"RSA-OAEP-256"}',
    };

    await expect(handleQRScan(JSON.stringify(wrappedPayload))).resolves.toEqual({
      type: 'applications',
      result: true,
    });

    expect(mockHandler.access).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'applications',
        source: 'extension',
        domain: 'hub.local:8082',
        rawQrData: JSON.stringify(wrappedPayload),
      }),
    );
  });
});
