import * as i from '../Interfaces/interfaces';
import * as Keychain from 'react-native-keychain';
import config from '../../config/environment';

// Exception HMAC the registerDevice
// Registers the device by fetching credentials from the API
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

// Registers the device by QR-clone scanning
export const registerDeviceAndUserByClone = async (cloneData: i.Clone) => {
    try {   
        await Keychain.setInternetCredentials('publicId', 'user', cloneData.publicId);
        await Keychain.setInternetCredentials('privateId', 'user', cloneData.privateId);
        await Keychain.setInternetCredentials('secret', 'user', cloneData.secret);
        console.log("Device registered successfully via clone data");
        return true;
    } catch (e) {
      console.error('❌ Device registration failed:');
      console.error('❌ Error details:', e);
      console.error('❌ API URL was:', config.API_DEVICE_REGISTRATION);
      return false;
    }
}