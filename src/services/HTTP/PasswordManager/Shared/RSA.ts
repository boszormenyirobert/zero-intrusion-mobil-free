import forge from 'node-forge';

const normalizeData = (data: unknown): string => {
  if (typeof data === 'string') {
    return data;
  }

  return JSON.stringify(data ?? null);
};

type RsaJwkPublicKey = {
  kty: 'RSA';
  n: string;
  e: string;
  alg?: string;
};

const base64UrlToBase64 = (value: string): string => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (base64.length % 4)) % 4;
  return base64 + '='.repeat(padding);
};

const jwkToForgePublicKey = (jwk: RsaJwkPublicKey): forge.pki.rsa.PublicKey => {
  const nHex = forge.util.bytesToHex(forge.util.decode64(base64UrlToBase64(jwk.n)));
  const eHex = forge.util.bytesToHex(forge.util.decode64(base64UrlToBase64(jwk.e)));
  const BigInteger = forge.jsbn.BigInteger;

  return forge.pki.setRsaPublicKey(
    new BigInteger(nHex, 16),
    new BigInteger(eHex, 16),
  );
};

const parsePublicKey = (publicKey: string): forge.pki.rsa.PublicKey => {
  try {
    const parsed = JSON.parse(publicKey) as Partial<RsaJwkPublicKey>;
    if (parsed.kty === 'RSA' && parsed.n && parsed.e) {
      return jwkToForgePublicKey(parsed as RsaJwkPublicKey);
    }
  } catch {
    // Fall through to a normalized key-format error.
  }

  throw new Error('Invalid RSA public key format. Expected JWK JSON with kty/n/e.');
};

export const encryptWithRsaPublicKey = (data: unknown, publicKey: string): string => {
  const payload = normalizeData(data);
  const publicKeyObject = parsePublicKey(publicKey);

  const encryptedBinary = publicKeyObject.encrypt(payload, 'RSA-OAEP', {
    md: forge.md.sha256.create(),
    mgf1: {
      md: forge.md.sha256.create(),
    },
  });

  return forge.util.encode64(encryptedBinary);
};
