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

  it('returns false for unknown or invalid qr payloads', async () => {
    await expect(handleQRScan(JSON.stringify({ type: 'unknown-route' }))).resolves.toBe(false);
    await expect(handleQRScan('{invalid')).resolves.toBe(false);
  });
});
