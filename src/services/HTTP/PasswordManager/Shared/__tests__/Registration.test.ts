jest.mock('../../../../DeviceStore', () => ({
  getApiUrl: jest.fn(),
  getPublicId: jest.fn(),
  getPrivateId: jest.fn(),
  getSecret: jest.fn(),
  getEmail: jest.fn(),
  getCredentialSecret: jest.fn(),
}));

jest.mock('../../../../Encrypter', () => ({
  encryptToBase64: jest.fn(async value => `encrypted:${value}`),
}));

jest.mock('../../../httpLogger', () => ({
  logHttpRequest: jest.fn(),
  logHttpResponse: jest.fn(),
}));

import {
  getApiUrl,
  getCredentialSecret,
  getEmail,
  getPrivateId,
  getPublicId,
  getSecret,
} from '../../../../DeviceStore';
import { Registration } from '../Registration';

const fetchMock = global.fetch as unknown as jest.Mock;

const response = (body: unknown, ok = true) => ({
  ok,
  status: ok ? 200 : 500,
  statusText: ok ? 'OK' : 'Error',
  json: jest.fn(async () => body),
});

describe('PasswordManager Registration', () => {
  beforeEach(() => {
    (getApiUrl as jest.Mock)
      .mockResolvedValueOnce('https://tenant.example.com/raw')
      .mockResolvedValueOnce('https://tenant.example.com/save');
    (getPublicId as jest.Mock).mockResolvedValue('public-id');
    (getPrivateId as jest.Mock).mockResolvedValue('private-id');
    (getSecret as jest.Mock).mockResolvedValue('secret');
    (getEmail as jest.Mock).mockResolvedValue('user@example.com');
    (getCredentialSecret as jest.Mock).mockResolvedValue('credential-secret');
  });

  it('retrieves raw credentials and saves encrypted credentials', async () => {
    fetchMock
      .mockResolvedValueOnce(response({
        registration_process_init: JSON.stringify({
          userName: 'john',
          userPassword: 'doe',
          description: 'Test credential',
        }),
      }))
      .mockResolvedValueOnce(response({ saved: true }));

    await expect(Registration({
      userName: 'john',
      userPassword: 'doe',
      registrationProcessId: 'process',
      xExtensionAuthOne: 'token',
      type: 'registration-domain',
      source: 'extension',
      isNew: 'true',
      description: '',
      domain: 'example.com',
      application: null,
    } as never)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns false when the raw credential request fails', async () => {
    fetchMock.mockResolvedValueOnce(response({}, false));

    await expect(Registration({
      userName: 'john',
      userPassword: 'doe',
      registrationProcessId: 'process',
      xExtensionAuthOne: 'token',
      type: 'update-applications',
      source: 'extension',
      isNew: 'false',
      description: '',
      domain: 'example.com',
      application: 'mail',
      targetId: 'target-id',
    } as never)).resolves.toBe(false);
  });

  it('uses the update-applications path and propagates save failures', async () => {
    (getApiUrl as jest.Mock).mockReset();
    (getApiUrl as jest.Mock)
      .mockResolvedValueOnce('https://tenant.example.com/raw')
      .mockResolvedValueOnce('https://tenant.example.com/update');

    fetchMock
      .mockResolvedValueOnce(response({
        registration_process_init: JSON.stringify({
          userName: 'john',
          userPassword: 'doe',
          description: 'Updated credential',
        }),
      }))
      .mockResolvedValueOnce(response({}, false));

    await expect(Registration({
      userName: 'john',
      userPassword: 'doe',
      registrationProcessId: 'process',
      xExtensionAuthOne: 'token',
      type: 'update-applications',
      source: 'extension',
      isNew: 'false',
      description: '',
      domain: 'example.com',
      application: 'mail',
      targetId: 'target-id',
    } as never)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://tenant.example.com/update',
      expect.objectContaining({
        body: expect.stringContaining('registrationProcessId'),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://tenant.example.com/raw',
      expect.objectContaining({
        body: expect.stringContaining('target-id'),
      }),
    );
  });

  it('supports missing auth tokens and omits optional identifiers when absent', async () => {
    (getApiUrl as jest.Mock).mockReset();
    (getApiUrl as jest.Mock)
      .mockResolvedValueOnce('https://tenant.example.com/raw')
      .mockResolvedValueOnce('https://tenant.example.com/save');

    fetchMock
      .mockResolvedValueOnce(response({
        registration_process_init: JSON.stringify({
          userName: 'john',
          userPassword: 'doe',
          description: 'Tokenless credential',
        }),
      }))
      .mockResolvedValueOnce(response({ saved: true }));

    await expect(Registration({
      userName: 'john',
      userPassword: 'doe',
      type: 'registration-domain',
      source: 'extension',
      isNew: 'true',
      description: '',
      domain: 'example.com',
      application: null,
    } as never)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://tenant.example.com/save',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Extension-Auth': 'HMAC ' }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://tenant.example.com/raw',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Extension-Auth': 'HMAC ' }),
      }),
    );

    const rawRequestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    const saveRequestBody = JSON.parse(fetchMock.mock.calls[1][1].body);

    expect(rawRequestBody.targetId).toBeUndefined();
    expect(saveRequestBody.registrationProcessId).toBeUndefined();
  });
});
