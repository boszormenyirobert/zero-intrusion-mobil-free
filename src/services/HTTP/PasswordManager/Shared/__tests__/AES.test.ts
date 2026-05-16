import CryptoJS from 'crypto-js';
import { encryptWithGeneratedAesKey } from '../AES';

const decryptAes = (encryptedData: string, key: string, iv: string) => {
  const keyWords = CryptoJS.enc.Base64.parse(key);
  const ivWords = CryptoJS.enc.Base64.parse(iv);

  const decrypted = CryptoJS.AES.decrypt(encryptedData, keyWords, {
    iv: ivWords,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return CryptoJS.enc.Utf8.stringify(decrypted);
};

describe('AES shared service', () => {
  it('generates key and encrypts string data', () => {
    const result = encryptWithGeneratedAesKey('sensitive-data');

    expect(result.encryptedData).toBeTruthy();
    expect(result.key).toBeTruthy();
    expect(result.iv).toBeTruthy();
    expect(decryptAes(result.encryptedData, result.key, result.iv)).toBe(
      'sensitive-data',
    );
  });

  it('accepts object data', () => {
    const payload = { userName: 'john.doe', userPassword: 'secret' };
    const result = encryptWithGeneratedAesKey(payload);

    expect(decryptAes(result.encryptedData, result.key, result.iv)).toBe(
      JSON.stringify(payload),
    );
  });
});
