jest.mock('../../../../DeviceStore', () => ({
  getApiUrl: jest.fn(),
  getPublicId: jest.fn(),
  getPrivateId: jest.fn(),
  getSecret: jest.fn(),
  getEmail: jest.fn(),
}));

jest.mock('../../../../Encrypter', () => ({
  encryptToBase64: jest.fn(async value => `encrypted:${value}`),
}));

jest.mock('../../../httpLogger', () => ({
  logHttpRequest: jest.fn(),
  logHttpResponse: jest.fn(),
}));

import { getApiUrl, getEmail, getPrivateId, getPublicId, getSecret } from '../../../../DeviceStore';
import { Delete } from '../Delete';

const fetchMock = global.fetch as unknown as jest.Mock;

const response = (ok = true) => ({
  ok,
  status: ok ? 200 : 500,
  statusText: ok ? 'OK' : 'Error',
  json: jest.fn(async () => ({ ok })),
});

describe('PasswordManager Delete', () => {
  beforeEach(() => {
    (getApiUrl as jest.Mock).mockResolvedValue('https://tenant.example.com/delete');
    (getPublicId as jest.Mock).mockResolvedValue('public-id');
    (getPrivateId as jest.Mock).mockResolvedValue('private-id');
    (getSecret as jest.Mock).mockResolvedValue('secret');
    (getEmail as jest.Mock).mockResolvedValue('user@example.com');
  });

  it('submits delete requests successfully', async () => {
    fetchMock.mockResolvedValueOnce(response(true));

    await expect(Delete({
      domain: 'example.com',
      type: 'delete-domain',
      source: 'extension',
      removeProcessId: 'process',
      xExtensionAuthOne: 'token',
    })).resolves.toBe(true);
  });

  it('returns false for failed responses', async () => {
    fetchMock.mockResolvedValueOnce(response(false));

    await expect(Delete({
      domain: 'example.com',
      type: 'delete-applications',
      source: 'extension',
      removeProcessId: 'process',
      xExtensionAuthOne: 'token',
    })).resolves.toBe(false);
  });

  it('returns false when the delete request throws', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network'));

    await expect(Delete({
      domain: 'example.com',
      type: 'delete-domain',
      source: 'extension',
      removeProcessId: 'process',
      xExtensionAuthOne: 'token',
    })).resolves.toBe(false);
  });

  it('supports delete requests without an auth token', async () => {
    fetchMock.mockResolvedValueOnce(response(true));

    await expect(Delete({
      domain: 'example.com',
      type: 'delete-domain',
      source: 'extension',
      removeProcessId: 'process',
    } as never)).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://tenant.example.com/delete',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Extension-Auth': 'HMAC ' }),
      }),
    );
  });
});
