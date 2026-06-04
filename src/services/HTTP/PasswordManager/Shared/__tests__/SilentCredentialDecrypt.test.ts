jest.mock('../../../../DeviceStore', () => ({
  getRsaPrivateKey: jest.fn(),
}));

import forge from 'node-forge';
import { getRsaPrivateKey } from '../../../../DeviceStore';
import { decryptSilentNewUserCredentialPayload } from '../SilentCredentialDecrypt';

const uint8ArrayToBinaryString = (bytes: Uint8Array): string =>
  Array.from(bytes, b => String.fromCharCode(b)).join('');

const encryptAesGcm = async (
  plaintext: string,
  keyBytes: Uint8Array,
  ivBytes: Uint8Array,
): Promise<string> => {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  );
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBytes },
    cryptoKey,
    new TextEncoder().encode(plaintext),
  );
  return Buffer.from(cipherBuffer).toString('base64');
};

const rsaEncryptKey = (publicKey: forge.pki.rsa.PublicKey, keyBytes: Uint8Array): string =>
  forge.util.encode64(
    publicKey.encrypt(uint8ArrayToBinaryString(keyBytes), 'RSA-OAEP', {
      md: forge.md.sha256.create(),
      mgf1: { md: forge.md.sha256.create() },
    }),
  );

describe('SilentCredentialDecrypt', () => {
  it('decrypts encrypted AES key and encrypted payload with iv', async () => {
    const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
    const privateKeyPem = forge.pki.privateKeyToPem(keyPair.privateKey);
    (getRsaPrivateKey as jest.Mock).mockResolvedValue(privateKeyPem);

    const payload = { userName: 'john', userPassword: 'secret' };
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const ivBytes = crypto.getRandomValues(new Uint8Array(12));

    const encryptedData = await encryptAesGcm(JSON.stringify(payload), keyBytes, ivBytes);
    const iv = Buffer.from(ivBytes).toString('base64');
    const encryptedAesKey = rsaEncryptKey(keyPair.publicKey, keyBytes);

    await expect(
      decryptSilentNewUserCredentialPayload({
        type: 'new-user-credential-silent',
        encryptedAesKey,
        encryptedData,
        iv,
      }),
    ).resolves.toEqual(payload);
  });

  it('decrypts when payload is nested under qrContent', async () => {
    const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
    const privateKeyPem = forge.pki.privateKeyToPem(keyPair.privateKey);
    (getRsaPrivateKey as jest.Mock).mockResolvedValue(privateKeyPem);

    const payload = { userName: 'alice', userPassword: 'p@ss' };
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const ivBytes = crypto.getRandomValues(new Uint8Array(12));

    const encryptedData = await encryptAesGcm(JSON.stringify(payload), keyBytes, ivBytes);
    const iv = Buffer.from(ivBytes).toString('base64');
    const encryptedAesKey = rsaEncryptKey(keyPair.publicKey, keyBytes);

    await expect(
      decryptSilentNewUserCredentialPayload({
        qrContent: {
          type: 'new-user-credential-silent',
          encryptedAesKey,
          encryptedData,
          iv,
        },
      }),
    ).resolves.toEqual(payload);
  });

  it('returns null when iv is missing', async () => {
    const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
    const privateKeyPem = forge.pki.privateKeyToPem(keyPair.privateKey);
    (getRsaPrivateKey as jest.Mock).mockResolvedValue(privateKeyPem);

    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const ivBytes = crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await encryptAesGcm('{"data":"test"}', keyBytes, ivBytes);
    const encryptedAesKey = rsaEncryptKey(keyPair.publicKey, keyBytes);

    await expect(
      decryptSilentNewUserCredentialPayload({
        type: 'new-user-credential-silent',
        encryptedAesKey,
        encryptedData,
        // iv missing intentionally
      }),
    ).resolves.toBeNull();
  });

  it('returns null when RSA decryption fails (wrong private key)', async () => {
    const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
    const wrongKeyPair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
    (getRsaPrivateKey as jest.Mock).mockResolvedValue(
      forge.pki.privateKeyToPem(wrongKeyPair.privateKey),
    );

    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const ivBytes = crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await encryptAesGcm('{"data":"test"}', keyBytes, ivBytes);
    const iv = Buffer.from(ivBytes).toString('base64');
    const encryptedAesKey = rsaEncryptKey(keyPair.publicKey, keyBytes);

    await expect(
      decryptSilentNewUserCredentialPayload({
        type: 'new-user-credential-silent',
        encryptedAesKey,
        encryptedData,
        iv,
      }),
    ).resolves.toBeNull();
  });

  it('returns null when private key is unavailable', async () => {
    (getRsaPrivateKey as jest.Mock).mockResolvedValue(null);

    await expect(
      decryptSilentNewUserCredentialPayload({
        type: 'new-user-credential-silent',
        encryptedAesKey: 'invalid',
        encryptedData: 'invalid',
        iv: 'aW52YWxpZA==',
      }),
    ).resolves.toBeNull();
  });
});

