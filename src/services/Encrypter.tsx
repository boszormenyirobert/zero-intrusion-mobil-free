import 'react-native-get-random-values';
import nacl from 'tweetnacl';
import { encodeBase64, decodeUTF8 } from 'tweetnacl-util';
import { getPrivateId, getPublicId, getSecret } from './DeviceStore';

export default async function getEncryptedIdentification() {
  const privateId = await getPrivateId();          
  const secret = await getSecret();
  const publicId = await getPublicId();

  const encryptedUserPrivateId = await encryptToBase64(privateId, secret);

  return {
    publicId,
    privateId: encryptedUserPrivateId,
    email : '',
    phone : '' ,
    privacyPolicy : false,
    fcmToken: ''
  };
}

function encryptToBase64(message: string, secret: string) {
  const key = decodeUTF8(secret).slice(0, 32);
  const nonce = nacl.randomBytes(24);
  const cipher = nacl.secretbox(decodeUTF8(message), nonce, key);
  const combined = new Uint8Array(nonce.length + cipher.length);
  combined.set(nonce);
  combined.set(cipher, nonce.length);
  return encodeBase64(combined);
}
