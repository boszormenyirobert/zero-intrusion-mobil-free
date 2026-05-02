import getEncryptedIdentification, { decryptFromBase64, encryptToBase64 } from '../Encrypter';

describe('Encrypter', () => {
  it('encrypts and decrypts round trips', async () => {
    const secret = 'top-secret';
    const cipherText = await encryptToBase64('hello-world', secret);

    expect(cipherText).not.toBe('hello-world');
    await expect(decryptFromBase64(cipherText, secret)).resolves.toBe('hello-world');
  });

  it('returns null for invalid ciphertext', async () => {
    await expect(decryptFromBase64('invalid-base64', 'secret')).resolves.toBeNull();
  });

  it('returns null when decrypting with the wrong secret', async () => {
    const cipherText = await encryptToBase64('hello-world', 'correct-secret');

    await expect(decryptFromBase64(cipherText, 'wrong-secret')).resolves.toBeNull();
  });

  it('builds the encrypted identification payload from a profile', async () => {
    const profile = {
      publicId: 'public-id',
      privateId: 'private-id',
      secret: 'my-secret',
      credentialSecret: 'credential-secret',
      email: 'user@example.com',
      phone: '123',
      privacyPolicy: true,
      url: 'https://example.com',
    };

    const identification = await getEncryptedIdentification(profile);

    expect(identification.publicId).toBe('public-id');
    expect(identification.privateId).not.toBe('private-id');
    expect(identification.credentialSecret).toBe('credential-secret');
    expect(identification.email).toBe('');
    expect(identification.phone).toBe('');
    expect(identification.privacyPolicy).toBe(false);
  });

  it('falls back to the device store when no profile is provided', async () => {
    jest.resetModules();

    jest.doMock('../DeviceStore', () => ({
      getActiveProfile: jest.fn(async () => null),
      getCredentialSecret: jest.fn(async () => 'credential-secret'),
      getPrivateId: jest.fn(async () => 'private-id'),
      getPublicId: jest.fn(async () => 'public-id'),
      getSecret: jest.fn(async () => 'secret'),
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = require('../Encrypter');
    const identification = await module.default();

    expect(identification).toEqual(expect.objectContaining({
      publicId: 'public-id',
      credentialSecret: 'credential-secret',
    }));
    expect(identification.privateId).not.toBe('private-id');
  });

  it('accepts empty message and secret values during encryption', async () => {
    await expect(encryptToBase64(undefined, undefined)).resolves.toEqual(expect.any(String));
  });

  it('falls back to device getters for missing profile fields', async () => {
    jest.resetModules();

    jest.doMock('../DeviceStore', () => ({
      getActiveProfile: jest.fn(async () => null),
      getCredentialSecret: jest.fn(async () => 'fallback-credential'),
      getPrivateId: jest.fn(async () => 'fallback-private'),
      getPublicId: jest.fn(async () => 'fallback-public'),
      getSecret: jest.fn(async () => 'fallback-secret'),
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = require('../Encrypter');
    const identification = await module.default({
      publicId: '',
      privateId: '',
      secret: '',
      credentialSecret: '',
      email: 'user@example.com',
      phone: '123',
      privacyPolicy: true,
      url: 'https://example.com',
    });

    expect(identification.publicId).toBe('');
    expect(identification.privateId).toEqual(expect.any(String));
    expect(identification.credentialSecret).toBe('');
  });
});
