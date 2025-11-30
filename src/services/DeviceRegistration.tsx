import * as Keychain from 'react-native-keychain';
import { registerDevice } from './HTTP/registerDevice';

class DeviceRegistration {
  keys = ['publicId', 'privateId', 'secret', 'credentialSecret'];

  // Verify device registration, if not registered, register it
  async initialize() {    
    let allExist = await this.checkDeviceRegistrationStoredKeys();    

    if (!allExist) {      
      await registerDevice();
    }
  }

  // Check if all required keys to the device-registration are stored
  async checkDeviceRegistrationStoredKeys() {
    for (const key of this.keys) {
      try {
        const item = await Keychain.getInternetCredentials(key);        
        if (!item || !item.password) return false;
      } catch (e) {
        console.error('Error accessing Keychain for key', key, e);
        return false;
      }
    }
    return true;
  }
}

export default new DeviceRegistration();
