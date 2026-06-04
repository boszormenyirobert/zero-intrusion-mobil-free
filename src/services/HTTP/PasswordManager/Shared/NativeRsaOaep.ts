import { NativeModules, Platform } from 'react-native';

type RsaOaepModule = {
  decryptAesKeyBase64: (
    encryptedAesKeyBase64: string,
    privateKeyPem: string,
  ) => Promise<string>;
  decryptAesGcmUtf8: (
    encryptedDataBase64: string,
    aesKeyBase64: string,
    ivBase64: string,
  ) => Promise<string>;
};

const nativeModule: RsaOaepModule | null =
  Platform.OS === 'android' ? (NativeModules.RsaOaepModule as RsaOaepModule | undefined) ?? null : null;

export const nativeRsaOaepDecryptAesKey = async (
  encryptedAesKeyBase64: string,
  privateKeyPem: string,
): Promise<string | null> => {
  if (!nativeModule) {
    return null;
  }

  try {
    return await nativeModule.decryptAesKeyBase64(encryptedAesKeyBase64, privateKeyPem);
  } catch {
    return null;
  }
};

export const nativeAesGcmDecryptUtf8 = async (
  encryptedDataBase64: string,
  aesKeyBase64: string,
  ivBase64: string,
): Promise<string | null> => {
  if (!nativeModule) {
    return null;
  }

  try {
    return await nativeModule.decryptAesGcmUtf8(encryptedDataBase64, aesKeyBase64, ivBase64);
  } catch {
    return null;
  }
};
