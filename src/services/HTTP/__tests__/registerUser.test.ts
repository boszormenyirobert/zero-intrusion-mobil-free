jest.mock('../../DeviceStore', () => ({
  getApiUrl: jest.fn(),
}));

jest.mock('../httpLogger', () => ({
  logHttpRequest: jest.fn(),
  logHttpResponse: jest.fn(),
}));

import { getApiUrl } from '../../DeviceStore';
import { logHttpRequest, logHttpResponse } from '../httpLogger';
import { registerUser } from '../registerUser';

describe('registerUser', () => {
  it('uses the active profile url when no override is provided', async () => {
    (getApiUrl as jest.Mock).mockResolvedValue('https://tenant.example.com/recovery');
    global.fetch.mockResolvedValue({ ok: true });

    await expect(registerUser({ email: 'user@example.com' })).resolves.toBe(true);

    expect(logHttpRequest).toHaveBeenCalledWith(
      'registerUser',
      'https://tenant.example.com/recovery',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(logHttpResponse).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      'https://tenant.example.com/recovery',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Extension-Auth': 'HMAC ' }),
      }),
    );
  });

  it('uses the provided api base override', async () => {
    global.fetch.mockResolvedValue({ ok: false });

    await expect(registerUser({ id: 1 }, 'https://custom.example.com')).resolves.toBe(false);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://custom.example.com/api/secret/recovery-settings',
      expect.any(Object),
    );
  });
});
