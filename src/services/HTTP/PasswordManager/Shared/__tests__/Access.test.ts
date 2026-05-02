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
  decryptFromBase64: jest.fn(async value => `decrypted:${value}`),
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
import { decryptFromBase64 } from '../../../../Encrypter';
import { Access } from '../Access';

const fetchMock = global.fetch as unknown as jest.Mock;
const getApiUrlMock = () => getApiUrl as unknown as jest.Mock;
const mockFetchResolvedOnce = (value: unknown) => fetchMock.mockResolvedValueOnce(value);
const mockFetchRejectedOnce = (value: unknown) => fetchMock.mockRejectedValueOnce(value);

const response = (body: unknown, ok = true) => ({
  ok,
  status: ok ? 200 : 500,
  statusText: ok ? 'OK' : 'Error',
  json: jest.fn(async () => body),
});

describe('PasswordManager Access', () => {
  beforeEach(() => {
    getApiUrlMock()
      .mockResolvedValueOnce('https://tenant.example.com/read-encrypted')
      .mockResolvedValueOnce('https://tenant.example.com/submit');
    (getPublicId as jest.Mock).mockResolvedValue('public-id');
    (getPrivateId as jest.Mock).mockResolvedValue('private-id');
    (getSecret as jest.Mock).mockResolvedValue('secret');
    (getEmail as jest.Mock).mockResolvedValue('user@example.com');
    (getCredentialSecret as jest.Mock).mockResolvedValue('credential-secret');
  });

  it('decrypts credentials and submits them', async () => {
    mockFetchResolvedOnce(response({
      credentials: [
        { credential: 'cipher-1', targetId: 't1', description: 'first', application: 'app' },
      ],
    }));
    mockFetchResolvedOnce(response({ accepted: true }));

    await expect(Access({
      domain: 'example.com',
      domainProcessId: 'process',
      xExtensionAuthOne: 'token',
      type: 'domain-login',
      source: 'extension',
      iv: 'iv',
    } as never)).resolves.toBe(true);

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('returns false when submission fails', async () => {
    getApiUrlMock()
      .mockResolvedValueOnce('https://tenant.example.com/read-apps')
      .mockResolvedValueOnce('https://tenant.example.com/submit-apps');
    mockFetchResolvedOnce(response({
      credentials: [
        { credential: 'cipher-1', targetId: 't1', description: 'first', application: 'app' },
      ],
    }));
    mockFetchResolvedOnce(response({ accepted: false }, false));

    await expect(Access({
      domain: 'example.com',
      domainProcessId: 'process',
      xExtensionAuthOne: 'token',
      type: 'applications',
      source: 'extension',
      iv: 'iv',
    } as never)).resolves.toBe(false);
  });

  it('returns false when encrypted credentials cannot be loaded', async () => {
    mockFetchResolvedOnce(response(false, false));

    await expect(Access({
      domain: 'example.com',
      domainProcessId: 'process',
      xExtensionAuthOne: 'token',
      type: 'domain-login',
      source: 'extension',
      iv: 'iv',
    } as never)).resolves.toBe(false);
  });

  it('skips null decrypted credentials and handles submit exceptions', async () => {
    (decryptFromBase64 as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('decrypted:cipher-2');

    mockFetchResolvedOnce(response({
      credentials: [
        { credential: 'cipher-1', targetId: 't1', description: 'first' },
        { credential: 'cipher-2', targetId: 't2', description: 'second' },
      ],
    }));
    mockFetchRejectedOnce(new Error('submit-failed'));

    await expect(Access({
      domain: 'example.com',
      domainProcessId: 'process',
      xExtensionAuthOne: 'token',
      type: 'domain-login',
      source: 'extension',
      iv: 'iv',
    } as never)).resolves.toBe(false);
  });

  it('returns false when the encrypted credential response shape is invalid', async () => {
    mockFetchResolvedOnce(response({}));

    await expect(Access({
      domain: 'example.com',
      domainProcessId: 'process',
      xExtensionAuthOne: 'token',
      type: 'domain-login',
      source: 'extension',
      iv: 'iv',
    } as never)).resolves.toBe(false);
  });

  it('returns false when loading encrypted credentials throws', async () => {
    mockFetchRejectedOnce(new Error('read-failed'));

    await expect(Access({
      domain: 'example.com',
      domainProcessId: 'process',
      xExtensionAuthOne: 'token',
      type: 'domain-login',
      source: 'extension',
      iv: 'iv',
    } as never)).resolves.toBe(false);
  });

  it('supports missing auth tokens and optional application fields', async () => {
    mockFetchResolvedOnce(response({
      credentials: [
        { credential: 'cipher-1', targetId: 't1', description: 'first' },
      ],
    }));
    mockFetchResolvedOnce(response({ accepted: true }));

    await expect(Access({
      domain: 'example.com',
      domainProcessId: 'process',
      type: 'domain-login',
      source: 'extension',
      iv: 'iv',
    } as never)).resolves.toBe(true);

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'https://tenant.example.com/submit',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Extension-Auth': 'HMAC ' }),
      }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://tenant.example.com/read-encrypted',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Extension-Auth': 'HMAC ' }),
        body: expect.stringContaining('"description":"first"'),
      }),
    );
  });
});
