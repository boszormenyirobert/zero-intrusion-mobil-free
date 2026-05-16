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

jest.mock('../AES', () => ({
  encryptWithGeneratedAesKey: jest.fn(() => ({
    encryptedData: 'aes-encrypted-credentials',
    iv: 'aes-generated-iv',
    key: 'aes-generated-key',
  })),
}));

jest.mock('../RSA', () => ({
  encryptWithRsaPublicKey: jest.fn(() => 'rsa-encrypted-key'),
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
import { encryptWithGeneratedAesKey } from '../AES';
import { encryptWithRsaPublicKey } from '../RSA';
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
    fetchMock.mockReset();
    (decryptFromBase64 as jest.Mock).mockClear();
    (encryptWithGeneratedAesKey as jest.Mock).mockClear();
    (encryptWithRsaPublicKey as jest.Mock).mockClear();
    getApiUrlMock()
      .mockReset()
      .mockResolvedValueOnce('https://tenant.example.com/read-encrypted')
      .mockResolvedValueOnce('https://tenant.example.com/submit');
    (getPublicId as jest.Mock).mockReset().mockResolvedValue('public-id');
    (getPrivateId as jest.Mock).mockReset().mockResolvedValue('private-id');
    (getSecret as jest.Mock).mockReset().mockResolvedValue('secret');
    (getEmail as jest.Mock).mockReset().mockResolvedValue('user@example.com');
    (getCredentialSecret as jest.Mock).mockReset().mockResolvedValue('credential-secret');
    (decryptFromBase64 as jest.Mock).mockImplementation(async value => `decrypted:${value}`);
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
      'https://tenant.example.com/read-encrypted',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Extension-Auth': 'HMAC ' }),
      }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://tenant.example.com/submit',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Extension-Auth': 'HMAC ' }),
        body: expect.stringContaining('"description":"first"'),
      }),
    );
  });

  it('sends only cache keys and device identity in the first request body (not full QR payload)', async () => {
    mockFetchResolvedOnce(response({
      credentials: [
        { credential: 'cipher-1', targetId: 't1', description: 'first' },
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
      qrCacheKey: 'qr-cache-1',
      credentialCacheKey: 'cred-cache-1',
    } as never)).resolves.toBe(true);

    const allRequests = (global.fetch as jest.Mock).mock.calls;
    const decryptedCredentialsRequest = allRequests.find(
      call => call[0] === 'https://tenant.example.com/read-encrypted',
    );

    expect(decryptedCredentialsRequest).toBeDefined();

    const requestOptions = decryptedCredentialsRequest?.[1] as RequestInit;
    const parsedBody = JSON.parse(requestOptions.body as string);

    // Verify required fields are present in first request
    expect(parsedBody.qrCacheKey).toBe('qr-cache-1');
    expect(parsedBody.credentialCacheKey).toBe('cred-cache-1');
    expect(parsedBody.publicId).toBe('public-id');
    expect(parsedBody.privateId).toBe('encrypted:private-id');
    expect(parsedBody.email).toBe('user@example.com');
    expect(parsedBody.update).toBe(false);
    
    // The second request (submitCredentials) should have the full QR payload
    const submitRequest = allRequests.find(
      call => call[0] === 'https://tenant.example.com/submit',
    );
    expect(submitRequest).toBeDefined();
    
    const submitRequestOptions = submitRequest?.[1] as RequestInit;
    const submitBody = JSON.parse(submitRequestOptions.body as string);
    
    // Second request should include domain info for login submission
    expect(submitBody.publicId).toBe('public-id');
    expect(submitBody.credentials).toBeDefined();
  });

  it('uses the decrypted response publicKey for QR-read domain submit encryption', async () => {
    mockFetchResolvedOnce(response({
      credentials: [
        { credential: 'cipher-1', targetId: 't1', description: 'first' },
      ],
      domainProcessId: 'response-process',
      publicKey: '{"kty":"RSA","n":"response-n","e":"AQAB"}',
    }));
    mockFetchResolvedOnce(response({ accepted: true }));

    await expect(Access({
      type: 'domain-login',
      source: 'extension',
      qrCacheKey: 'qr-cache-1',
      credentialCacheKey: 'cred-cache-1',
    } as never)).resolves.toBe(true);

    expect(encryptWithGeneratedAesKey).toHaveBeenCalledWith([
      {
        credential: 'decrypted:cipher-1',
        targetId: 't1',
        description: 'first',
        application: undefined,
      },
    ]);
    expect(encryptWithRsaPublicKey).toHaveBeenCalledWith(
      'aes-generated-key',
      '{"kty":"RSA","n":"response-n","e":"AQAB"}',
    );

    const submitRequest = (global.fetch as jest.Mock).mock.calls.find(
      call => call[0] === 'https://tenant.example.com/submit',
    );

    expect(submitRequest).toBeDefined();

    const submitBody = JSON.parse((submitRequest?.[1] as RequestInit).body as string);
    expect(submitBody.credentials).toBe('aes-encrypted-credentials');
    expect(submitBody.rsaEncryptedKey).toBe('rsa-encrypted-key');
    expect(submitBody.iv).toBe('aes-generated-iv');
    expect(submitBody.domainProcessId).toBe('response-process');
  });
});
