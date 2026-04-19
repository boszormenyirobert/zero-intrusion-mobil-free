import * as i from '../Interfaces/interfaces';
import config, { buildApiConfig, normalizeApiBaseUrl } from '../../config/environment';
import { saveProfile, setActiveProfile } from '../DeviceStore';
import { logHttpRequest, logHttpResponse } from './httpLogger';

// Exception HMAC the registerDevice
// Registers the device by fetching credentials from the API
export const requestDeviceRegistration = async (
  apiBaseUrl = config.API_BASE,
): Promise<i.DeviceRegistrationSecrets | null> => {
    try {      
      const normalizedBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
      const apiConfig = buildApiConfig(normalizedBaseUrl);

      console.log('Attempting to connect to:', apiConfig.API_DEVICE_REGISTRATION);
      
      const requestOptions: RequestInit = {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      };

      logHttpRequest('requestDeviceRegistration', apiConfig.API_DEVICE_REGISTRATION, requestOptions);
      const response = await fetch(apiConfig.API_DEVICE_REGISTRATION, requestOptions);
      await logHttpResponse('requestDeviceRegistration', response);

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      const data = await response.json();
      const dataObject = JSON.parse(data.content);
      const { publicId, privateId, secret, credentialSecret } = dataObject.privateSecret;

      if (publicId && privateId && secret) {
        return {
          publicId,
          privateId,
          secret,
          credentialSecret,
        };
      }

      return null;
    } catch (e) {
      console.error(' Device registration failed:');
      console.error(' Error details:', e);
      console.error(' API URL was:', apiBaseUrl);
      return null;
    }
};

export const registerDevice = async (apiBaseUrl = config.API_BASE) => {
    const deviceSecrets = await requestDeviceRegistration(apiBaseUrl);

    if (!deviceSecrets) {
      return false;
    }

    await setActiveProfile({
      ...deviceSecrets,
      email: '',
      phone: '',
      privacyPolicy: false,
      url: normalizeApiBaseUrl(apiBaseUrl),
    });

    return true;
};

// Registers the device by QR-clone scanning
export const registerDeviceAndUserByClone = async (cloneData: i.Clone) => {
    try {   
        const clonedProfile: i.UserProfile = {
          publicId: cloneData.publicId,
          privateId: cloneData.privateId,
          secret: cloneData.secret,
          credentialSecret: cloneData.credentialSecret,
          email: cloneData.email ?? '',
          phone: cloneData.phone ?? '',
          privacyPolicy: Boolean(cloneData.privacyPolicy),
          url: normalizeApiBaseUrl(cloneData.url ?? config.API_BASE),
        };

        await setActiveProfile(clonedProfile);

        if (clonedProfile.email) {
          await saveProfile(clonedProfile, { previousEmail: clonedProfile.email, setActive: true });
        }

        return true;
    } catch (e) {
      console.error(' Device registration failed:');
      console.error(' Error details:', e);
      console.error(' API URL was:', cloneData.url ?? config.API_BASE);
      return false;
    }
};