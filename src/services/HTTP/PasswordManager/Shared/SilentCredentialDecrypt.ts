import forge from 'node-forge';
import { getRsaPrivateKey } from '../../../DeviceStore';
import { nativeAesGcmDecryptUtf8, nativeRsaOaepDecryptAesKey } from './NativeRsaOaep';

type SilentCredentialPayload = {
  encryptedAesKey?: string;
  encryptedData?: string;
  iv?: string;
  type?: string;
};

const MAX_DECRYPT_CACHE_SIZE = 32;

let cachedPrivateKeyPem: string | null = null;
let cachedPrivateKey: forge.pki.rsa.PrivateKey | null = null;
const decryptedAesKeyCache = new Map<string, string>();

const getCachedPrivateKey = (privateKeyPem: string): forge.pki.rsa.PrivateKey => {
  if (cachedPrivateKey && cachedPrivateKeyPem === privateKeyPem) {
    return cachedPrivateKey;
  }

  cachedPrivateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  cachedPrivateKeyPem = privateKeyPem;
  return cachedPrivateKey;
};

const readCachedAesKey = (encryptedAesKey: string): string | null => {
  const cached = decryptedAesKeyCache.get(encryptedAesKey);
  if (!cached) {
    return null;
  }

  // Refresh entry recency for simple LRU behavior.
  decryptedAesKeyCache.delete(encryptedAesKey);
  decryptedAesKeyCache.set(encryptedAesKey, cached);
  return cached;
};

const writeCachedAesKey = (encryptedAesKey: string, aesKeyBinary: string): void => {
  decryptedAesKeyCache.set(encryptedAesKey, aesKeyBinary);
  if (decryptedAesKeyCache.size <= MAX_DECRYPT_CACHE_SIZE) {
    return;
  }

  const oldestKey = decryptedAesKeyCache.keys().next().value;
  if (oldestKey) {
    decryptedAesKeyCache.delete(oldestKey);
  }
};

const parseJson = (value: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

const normalizePayload = (payload: unknown): SilentCredentialPayload | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const payloadRecord = payload as Record<string, unknown>;
  const nested = payloadRecord.qrContent;

  if (nested && typeof nested === 'object') {
    return nested as SilentCredentialPayload;
  }

  return payloadRecord as SilentCredentialPayload;
};

const decryptRsaOaepAesKey = async (encryptedAesKey: string): Promise<string | null> => {
  const cachedAesKey = readCachedAesKey(encryptedAesKey);
  if (cachedAesKey) {
    return cachedAesKey;
  }

  const privateKeyPem = await getRsaPrivateKey();

  if (!privateKeyPem) {
    console.error('[SilentCredential] Missing stored RSA private key');
    return null;
  }

  try {
    const nativeDecryptedBase64 = await nativeRsaOaepDecryptAesKey(encryptedAesKey, privateKeyPem);
    if (nativeDecryptedBase64) {
      const nativeDecryptedBinary = forge.util.decode64(nativeDecryptedBase64);
      writeCachedAesKey(encryptedAesKey, nativeDecryptedBinary);
      return nativeDecryptedBinary;
    }

    const privateKey = getCachedPrivateKey(privateKeyPem);
    const decryptedBinary = privateKey.decrypt(
      forge.util.decode64(encryptedAesKey),
      'RSA-OAEP',
      { md: forge.md.sha256.create(), mgf1: { md: forge.md.sha256.create() } },
    );

    writeCachedAesKey(encryptedAesKey, decryptedBinary);

    return decryptedBinary;
  } catch (error) {
    console.error('[SilentCredential] Failed to decrypt RSA AES key:', error);
    return null;
  }
};

// AES-GCM: ciphertext = payload || authTag (last 16 bytes)
const GCM_TAG_BYTES = 16;

const decryptAesGcm = (
  encryptedDataBase64: string,
  aesKeyBinary: string,
  ivBase64: string,
): string | null => {
  try {
    const ivBinary = forge.util.decode64(ivBase64);
    const ciphertextWithTag = forge.util.decode64(encryptedDataBase64);

    if (ciphertextWithTag.length <= GCM_TAG_BYTES) {
      console.error('[SilentCredential] AES-GCM ciphertext too short');
      return null;
    }

    const ciphertext = ciphertextWithTag.slice(0, ciphertextWithTag.length - GCM_TAG_BYTES);
    const tag = ciphertextWithTag.slice(ciphertextWithTag.length - GCM_TAG_BYTES);

    const decipher = forge.cipher.createDecipher('AES-GCM', forge.util.createBuffer(aesKeyBinary));
    decipher.start({
      iv: forge.util.createBuffer(ivBinary),
      tag: forge.util.createBuffer(tag),
    });
    decipher.update(forge.util.createBuffer(ciphertext));
    const pass = decipher.finish();

    if (!pass) {
      console.error('[SilentCredential] AES-GCM auth tag verification failed');
      return null;
    }

    return decipher.output.toString();
  } catch (error) {
    console.error('[SilentCredential] AES-GCM decrypt failed:', error);
    return null;
  }
};

const decryptAesGcmWithNativeFirst = async (
  encryptedDataBase64: string,
  aesKeyBinary: string,
  ivBase64: string,
): Promise<string | null> => {
  const aesKeyBase64 = forge.util.encode64(aesKeyBinary);
  const nativeResult = await nativeAesGcmDecryptUtf8(encryptedDataBase64, aesKeyBase64, ivBase64);
  if (nativeResult !== null) {
    return nativeResult;
  }

  return decryptAesGcm(encryptedDataBase64, aesKeyBinary, ivBase64);
};

export const decryptSilentNewUserCredentialPayload = async (payload: unknown) => {
  const normalized = normalizePayload(payload);

  if (!normalized?.encryptedAesKey || !normalized?.encryptedData || !normalized?.iv) {
    console.error('[SilentCredential] Missing encrypted payload fields (encryptedAesKey, encryptedData, iv required)');
    return null;
  }

  const aesKeyBinary = await decryptRsaOaepAesKey(normalized.encryptedAesKey);
  if (!aesKeyBinary) {
    return null;
  }

  const decryptedText = await decryptAesGcmWithNativeFirst(
    normalized.encryptedData,
    aesKeyBinary,
    normalized.iv,
  );
  if (!decryptedText) {
    console.error('[SilentCredential] Failed to decrypt encryptedData');
    return null;
  }

  const parsed = parseJson(decryptedText);
  return parsed ?? decryptedText;
};
