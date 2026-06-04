import forge from 'node-forge';
import { getRsaPrivateKey } from '../../../DeviceStore';

type SilentCredentialPayload = {
  encryptedAesKey?: string;
  encryptedData?: string;
  iv?: string;
  type?: string;
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
  const privateKeyPem = await getRsaPrivateKey();

  if (!privateKeyPem) {
    console.error('[SilentCredential] Missing stored RSA private key');
    return null;
  }

  console.log('[SilentCredential] Stored RSA private key resolved');

  try {
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const decryptedBinary = privateKey.decrypt(
      forge.util.decode64(encryptedAesKey),
      'RSA-OAEP',
      { md: forge.md.sha256.create(), mgf1: { md: forge.md.sha256.create() } },
    );

    console.log('[SilentCredential] RSA AES key decrypted successfully');

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

    console.log('[SilentCredential] AES-GCM params', {
      keyBytes: aesKeyBinary.length,
      ivBytes: ivBinary.length,
      cipherBytes: ciphertext.length,
      tagBytes: tag.length,
    });

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

export const decryptSilentNewUserCredentialPayload = async (payload: unknown) => {
  const normalized = normalizePayload(payload);

  console.log('[SilentCredential] Starting decrypt', {
    hasPayload: Boolean(normalized),
    hasEncryptedAesKey: Boolean(normalized?.encryptedAesKey),
    hasEncryptedData: Boolean(normalized?.encryptedData),
    hasIv: Boolean(normalized?.iv),
    type: normalized?.type ?? null,
    iv: normalized?.iv ?? null,
    encryptedAesKeyLength: normalized?.encryptedAesKey?.length ?? 0,
    encryptedDataLength: normalized?.encryptedData?.length ?? 0,
    encryptedDataPrefix: normalized?.encryptedData?.substring(0, 40) ?? null,
  });

  if (!normalized?.encryptedAesKey || !normalized?.encryptedData || !normalized?.iv) {
    console.error('[SilentCredential] Missing encrypted payload fields (encryptedAesKey, encryptedData, iv required)');
    return null;
  }

  const aesKeyBinary = await decryptRsaOaepAesKey(normalized.encryptedAesKey);
  if (!aesKeyBinary) {
    return null;
  }

  const decryptedText = decryptAesGcm(normalized.encryptedData, aesKeyBinary, normalized.iv);
  if (!decryptedText) {
    console.error('[SilentCredential] Failed to decrypt encryptedData');
    return null;
  }

  console.log('[SilentCredential] Decrypted payload', decryptedText);

  const parsed = parseJson(decryptedText);
  return parsed ?? decryptedText;
};
