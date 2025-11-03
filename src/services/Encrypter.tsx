import 'react-native-get-random-values';
import { getPrivateId, getPublicId, getSecret } from './DeviceStore';
import nacl from 'tweetnacl';
import { encodeBase64, decodeUTF8 } from 'tweetnacl-util';
import blake2b from 'blake2b';
import * as i from './Interfaces/interfaces';

export default async function getEncryptedIdentification(): Promise<typeof i.Device> {
  const privateId = await getPrivateId();          
  const secret = await getSecret();
  const publicId = await getPublicId();

  const encryptedUserPrivateId = await encryptToBase64(privateId, secret);

  return {
    publicId: publicId,
    privateId: encryptedUserPrivateId,
    email : '',
    phone : '' ,
    privacyPolicy : false,
    fcmToken: ''
  };
}

async function encryptToBase64(message: string, secret: string): Promise<string> {
  // 1. Convert string to Uint8Array for React Native compatibility
  const secretBytes = decodeUTF8(secret);
  
  // 2. 32 byte key hash using Blake2b (exact libsodium compatibility)
  const keyArray = blake2b(32).update(secretBytes).digest();

  // 3. Generate nonce (24 bytes for XSalsa20)
  const nonce = nacl.randomBytes(24);

  // 4. Encrypt using NaCl secretbox (XSalsa20 + Poly1305)
  const messageBytes = decodeUTF8(message);
  const cipher = nacl.secretbox(messageBytes, nonce, keyArray);

  // 5. Combine nonce + cipher
  const combined = new Uint8Array(nonce.length + cipher.length);
  combined.set(nonce);
  combined.set(cipher, nonce.length);

  // 6. Return as base64
  return encodeBase64(combined);
}

// Export the function for use in other files
export { encryptToBase64 };
