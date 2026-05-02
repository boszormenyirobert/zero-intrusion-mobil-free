jest.mock('../../../DeviceStore', () => ({
  getApiUrl: jest.fn(),
  getPublicId: jest.fn(),
  getPrivateId: jest.fn(),
  getSecret: jest.fn(),
  getEmail: jest.fn(),
}));

jest.mock('../../../Encrypter', () => ({
  encryptToBase64: jest.fn(async value => `encrypted:${value}`),
}));

jest.mock('../../httpLogger', () => ({
  logHttpRequest: jest.fn(),
  logHttpResponse: jest.fn(),
}));

import {
  getApiUrl,
  getEmail,
  getPrivateId,
  getPublicId,
  getSecret,
} from '../../../DeviceStore';
import { SystemHubLogin, SystemHubRegistration, SystemHubSecureDevice } from '../SystemHub';

const fetchMock = () => global.fetch as unknown as jest.Mock;
const mockFetchResolvedOnce = (value: unknown) => fetchMock().mockResolvedValueOnce(value);
const mockFetchRejectedOnce = (value: unknown) => fetchMock().mockRejectedValueOnce(value);

const response = (ok = true) => ({
  ok,
  status: ok ? 200 : 500,
  statusText: ok ? 'OK' : 'Error',
  json: jest.fn(async () => ({ ok })),
});

describe('SystemHub api', () => {
  beforeEach(() => {
    (getApiUrl as jest.Mock).mockResolvedValue('https://tenant.example.com/path');
    (getPublicId as jest.Mock).mockResolvedValue('public-id');
    (getPrivateId as jest.Mock).mockResolvedValue('private-id');
    (getSecret as jest.Mock).mockResolvedValue('secret');
    (getEmail as jest.Mock).mockResolvedValue('user@example.com');
  });

  it('submits registration payloads', async () => {
    mockFetchResolvedOnce(response(true));

    await expect(SystemHubRegistration({
      corporateId: 'corp',
      corporateAuthentication: 'auth',
      domain: 'example.com',
      xExtensionAuthOne: 'token',
      registrationProcessId: 'process',
      type: 'system_hub_registration',
      isNew: 'true',
    })).resolves.toBe(true);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://tenant.example.com/path',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Extension-Auth': 'HMAC token' }),
      }),
    );
  });

  it('returns false on failed login responses', async () => {
    mockFetchResolvedOnce(response(false));

    await expect(SystemHubLogin({
      domain: 'example.com',
      domainProcessId: 'process',
      xExtensionAuthOne: 'token',
      type: 'system_hub_login',
      corporateId: 'corp',
      corporateAuthentication: 'auth',
      source: 'extension',
    })).resolves.toBe(false);
  });

  it('returns false when secure device throws', async () => {
    mockFetchRejectedOnce(new Error('network'));

    await expect(SystemHubSecureDevice({
      oneTouchProcessId: 'process',
      source: 'extension',
      type: 'secure',
      xExtensionAuthOne: 'token',
      validCommunication: [],
    })).resolves.toBe(false);
  });

  it('submits login payloads successfully', async () => {
    mockFetchResolvedOnce(response(true));

    await expect(SystemHubLogin({
      domain: 'example.com',
      domainProcessId: 'process',
      xExtensionAuthOne: 'token',
      type: 'system_hub_login',
      corporateId: 'corp',
      corporateAuthentication: 'auth',
      source: 'extension',
    })).resolves.toBe(true);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://tenant.example.com/path',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Extension-Auth': 'HMAC token' }),
      }),
    );
  });

  it('returns false when registration throws', async () => {
    mockFetchRejectedOnce(new Error('network'));

    await expect(SystemHubRegistration({
      corporateId: 'corp',
      corporateAuthentication: 'auth',
      domain: 'example.com',
      registrationProcessId: 'process',
      type: 'system_hub_registration',
      isNew: 'true',
    })).resolves.toBe(false);
  });

  it('returns false on failed registration responses', async () => {
    mockFetchResolvedOnce(response(false));

    await expect(SystemHubRegistration({
      corporateId: 'corp',
      corporateAuthentication: 'auth',
      domain: 'example.com',
      xExtensionAuthOne: '',
      registrationProcessId: 'process',
      type: 'system_hub_registration',
      isNew: 'false',
    })).resolves.toBe(false);
  });

  it('returns false when login throws', async () => {
    mockFetchRejectedOnce(new Error('network'));

    await expect(SystemHubLogin({
      domain: 'example.com',
      domainProcessId: 'process',
      xExtensionAuthOne: '',
      type: 'system_hub_login',
      corporateId: 'corp',
      corporateAuthentication: 'auth',
      source: 'extension',
    })).resolves.toBe(false);
  });

  it('returns false on failed secure device responses', async () => {
    mockFetchResolvedOnce(response(false));

    await expect(SystemHubSecureDevice({
      oneTouchProcessId: 'process',
      source: 'extension',
      type: 'secure',
      validCommunication: [],
    })).resolves.toBe(false);
  });

  it('submits secure device payloads successfully without an auth token', async () => {
    mockFetchResolvedOnce(response(true));

    await expect(SystemHubSecureDevice({
      oneTouchProcessId: 'process',
      source: 'extension',
      type: 'secure',
      validCommunication: ['email'],
    })).resolves.toBe(true);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://tenant.example.com/path',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Extension-Auth': 'HMAC ' }),
      }),
    );
  });
});
