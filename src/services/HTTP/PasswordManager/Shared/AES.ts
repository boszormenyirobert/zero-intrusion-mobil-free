import CryptoJS from 'crypto-js';

export interface AesEncryptionResult {
  encryptedData: string;
  key: string;
  iv: string;
}

const normalizeData = (data: unknown): string => {
  if (typeof data === 'string') {
    return data;
  }

  return JSON.stringify(data ?? null);
};

export const encryptWithGeneratedAesKey = (data: unknown): AesEncryptionResult => {
  const payload = normalizeData(data);

  const key = CryptoJS.lib.WordArray.random(32);
  const iv = CryptoJS.lib.WordArray.random(16);

  const encrypted = CryptoJS.AES.encrypt(payload, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();

  return {
    encryptedData: encrypted,
    key: CryptoJS.enc.Base64.stringify(key),
    iv: CryptoJS.enc.Base64.stringify(iv),
  };
};
