import * as i from '../../../services/Interfaces/interfaces';
import config from '../../../config/environment';
import { getPublicId, getPrivateId, getSecret, getEmail } from '../../../services/DeviceStore';
import { encryptToBase64 } from '../../Encrypter';

// Helper function to generate random secret
const generatedSecret = (): string => {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}<>?.";
  let result = '';
  for (let i = 0; i < 14; i++) {
    result += charset[Math.floor(Math.random() * charset.length)];
  }
  return result;
};

// Helper function to encrypt private ID
const encryptPrivateId = async (): Promise<string> => {
  return await encryptToBase64(await getPrivateId(), await getSecret());
};

export const SystemHubRegistration = async (qrJson: i.HubRegistration): Promise<boolean> => {
  try {
    // Extract auth token from QR data
    const { xExtensionAuthOne, ...registrationData } = qrJson;
    const authToken = xExtensionAuthOne || "";

    // Generate secret and encrypt user credential
    const secretMessageString = generatedSecret();
    const encryptedUserCredential = await encryptToBase64(secretMessageString, await getSecret());

    // Build request body
    const body: i.HubRegistrationExtended = {
      ...registrationData,
      publicId: await getPublicId(), 
      privateId: await encryptPrivateId(), 
      email: await getEmail(), 
      update: qrJson.isNew,
      source: "extension",
      xExtensionAuth: authToken,
      description: "",  
      userCredential: encryptedUserCredential
    };

    // Make API request
    const response = await fetch(config.API_REGISTRATION, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Extension-Auth': `HMAC ${authToken}`
      },
      body: JSON.stringify(body),
    });

    // Check response status
    if (!response.ok) {
      console.error('Registration failed:', response.status, response.statusText);
      return false;
    }

    const result = await response.json();
    console.log('Registration successful:', result);
    return true;

  } catch (error) {
    console.error('SystemHubRegistration error:', error);
    return false;
  }
};

export const SystemHubLogin = async (qrJson: i.HubLogin): Promise<boolean> => {
  try {
    // Extract and remove xExtensionAuthOne from qrJson
    const { xExtensionAuthOne, ...loginData } = qrJson;
    const authToken = xExtensionAuthOne || "";

    // Build request body with encrypted data
    const body: i.HubLoginExtended = {
      ...loginData, // Spread the remaining qrJson properties
      publicId: await getPublicId(),
      privateId: await encryptPrivateId(),
      email: await getEmail()        
    };

    console.log('Login Body:', body);

    // Make API request
    const response = await fetch(config.API_LOGIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Extension-Auth': `HMAC ${authToken}`
      },
      body: JSON.stringify(body),
    });

    // Check response status
    if (!response.ok) {
      console.error('Login failed:', response.status, response.statusText);
      return false;
    }

    const result = await response.json();
    console.log('Login successful:', result);
    return true;

  } catch (error) {
    console.error('SystemHubLogin error:', error);
    return false;
  }
};