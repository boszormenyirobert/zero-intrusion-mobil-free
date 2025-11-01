import * as Keychain from 'react-native-keychain';
import { API_DEVICE_REGISTRATION } from  '@env';

export const registerDevice = async () => {
    try {      
      const response = await fetch(API_DEVICE_REGISTRATION, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      const dataObject = JSON.parse(data.content);
            console.log(dataObject);
      const { publicId, privateId, secret } = dataObject.privateSecret;

      if (publicId && privateId && secret) {
        await Keychain.setInternetCredentials('publicId', 'user', publicId);
        await Keychain.setInternetCredentials('privateId', 'user', privateId);
        await Keychain.setInternetCredentials('secret', 'user', secret);
        return true;
      }

      return false;
    } catch (e) {
      console.error('Registration failed:', e);
      return false;
    }
}