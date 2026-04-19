import { registerDevice } from './HTTP/registerDevice';
import { getActiveProfile } from './DeviceStore';

class DeviceRegistration {
  // Verify device registration, if not registered, register it
  async initialize() {    
    let allExist = await this.checkDeviceRegistrationStoredKeys();    

    if (!allExist) {      
      await registerDevice();
    }
  }

  // Check if all required keys to the device-registration are stored
  async checkDeviceRegistrationStoredKeys() {
    const activeProfile = await getActiveProfile();

    return Boolean(
      activeProfile?.publicId &&
      activeProfile?.privateId &&
      activeProfile?.secret &&
      activeProfile?.credentialSecret,
    );
  }
}

export default new DeviceRegistration();
