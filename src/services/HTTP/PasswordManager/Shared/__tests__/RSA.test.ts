import forge from 'node-forge';
import { encryptWithRsaPublicKey } from '../RSA';

const toBase64Url = (base64: string): string => {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const bigIntegerToBase64Url = (value: forge.jsbn.BigInteger): string => {
  let hex = value.toString(16);
  if (hex.length % 2 !== 0) {
    hex = `0${hex}`;
  }
  while (hex.startsWith('00') && hex.length > 2) {
    hex = hex.slice(2);
  }
  return toBase64Url(forge.util.encode64(forge.util.hexToBytes(hex)));
};

const toJwkJson = (publicKey: forge.pki.rsa.PublicKey): string => {
  return JSON.stringify({
    kty: 'RSA',
    e: bigIntegerToBase64Url(publicKey.e),
    n: bigIntegerToBase64Url(publicKey.n),
    alg: 'RSA-OAEP-256',
    ext: true,
    key_ops: ['encrypt'],
  });
};

describe('RSA shared service', () => {
  it('encrypts string payload with the provided public key', () => {
    const { privateKey, publicKey } = forge.pki.rsa.generateKeyPair({ bits: 2048 });
    const publicKeyJwk = toJwkJson(publicKey);
    const encrypted = encryptWithRsaPublicKey('sensitive-data', publicKeyJwk);

    const decrypted = privateKey.decrypt(forge.util.decode64(encrypted), 'RSA-OAEP', {
      md: forge.md.sha256.create(),
      mgf1: {
        md: forge.md.sha256.create(),
      },
    });

    expect(decrypted).toBe('sensitive-data');
  });

  it('accepts object payloads', () => {
    const payload = { domain: 'example.com', user: 'john.doe' };
    const { privateKey, publicKey } = forge.pki.rsa.generateKeyPair({ bits: 2048 });
    const publicKeyJwk = toJwkJson(publicKey);

    const encrypted = encryptWithRsaPublicKey(payload, publicKeyJwk);
    const decrypted = privateKey.decrypt(forge.util.decode64(encrypted), 'RSA-OAEP', {
      md: forge.md.sha256.create(),
      mgf1: {
        md: forge.md.sha256.create(),
      },
    });

    expect(decrypted).toBe(JSON.stringify(payload));
  });

  it('throws on PEM key input', () => {
    const { publicKey } = forge.pki.rsa.generateKeyPair({ bits: 2048 });
    const publicKeyPem = forge.pki.publicKeyToPem(publicKey);

    expect(() => encryptWithRsaPublicKey('sensitive-data', publicKeyPem)).toThrow(
      'Invalid RSA public key format',
    );
  });
});
