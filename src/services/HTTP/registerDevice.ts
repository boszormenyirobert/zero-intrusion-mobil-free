import * as Keychain from 'react-native-keychain';
import config from '../../config/environment';

// Exception HMAC the registerDevice
export const registerDevice = async () => {
    try {      
      console.log('🌐 Attempting to connect to:', config.API_DEVICE_REGISTRATION);
      
      const response = await fetch(config.API_DEVICE_REGISTRATION, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('🌐 Response status:', response.status);
      console.log('🌐 Response ok:', response.ok);

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
      console.error('❌ Device registration failed:');
      console.error('❌ Error details:', e);
      console.error('❌ API URL was:', config.API_DEVICE_REGISTRATION);
      return false;
    }
}