import * as i from '../../../services/Interfaces/interfaces';
import { getApiUrl, getPublicId, getPrivateId, getSecret, getEmail } from '../../../services/DeviceStore';
import { encryptToBase64 } from '../../Encrypter';
import { logHttpRequest, logHttpResponse } from '../httpLogger';

// Helper function to generate random secret
const generatedSecret = (): string => {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}<>?.";
  let result = '';
  for (let index = 0; index < 14; index++) {
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
    const path = await getApiUrl('API_REGISTRATION');
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
    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Extension-Auth': `HMAC ${authToken}`
      },
      body: JSON.stringify(body),
    };

    logHttpRequest('SystemHubRegistration', path, requestOptions);
    const response = await fetch(path, requestOptions);
    await logHttpResponse('SystemHubRegistration', response);

    // Check response status
    if (!response.ok) {
      console.error('Registration failed:', response.status, response.statusText);
      return false;
    }

    const result = await response.json();
    return true;

  } catch (error) {
    console.error('SystemHubRegistration error:', error);
    return false;
  }
};

export const SystemHubLogin = async (qrJson: i.HubLogin): Promise<boolean> => {
  try {
    const path = await getApiUrl('API_LOGIN');
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

    // Make API request
    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Extension-Auth': `HMAC ${authToken}`
      },
      body: JSON.stringify(body),
    };

    logHttpRequest('SystemHubLogin', path, requestOptions);
    const response = await fetch(path, requestOptions);
    await logHttpResponse('SystemHubLogin', response);

    // Check response status
    if (!response.ok) {
      console.error('Login failed:', response.status, response.statusText);
      return false;
    }

    const result = await response.json();
    return true;

  } catch (error) {
    console.error('SystemHubLogin error:', error);
    return false;
  }
};

export const SystemHubSecureDevice = async (qrJson: i.SecureDevice): Promise<boolean> => {
  try {
    const path = await getApiUrl('API_SECURE_DEVICE');
    // Extract and remove xExtensionAuthOne from qrJson
    const { xExtensionAuthOne, oneTouchProcessId, ...inputData } = qrJson;
    const authToken = xExtensionAuthOne || "";

    // Build request body with encrypted data
    const body: any = {
      publicId: await getPublicId(),      
      privateId: await encryptPrivateId(),
      email: await getEmail(),
      processId: oneTouchProcessId,
      oneTouchProcessId: oneTouchProcessId,
      ...inputData        
    };

    // Make API request
    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Extension-Auth': `HMAC ${authToken}`
      },
      body: JSON.stringify(body),
    };

    logHttpRequest('SystemHubSecureDevice', path, requestOptions);
    const response = await fetch(path, requestOptions);
    await logHttpResponse('SystemHubSecureDevice', response);

    // Check response status
    if (!response.ok) {
      console.error('Process failed:', response.status, response.statusText);
      return false;
    }

    const result = await response.json();
    return true;

  } catch (error) {
    console.error('SystemHubLogin error:', error);
    return false;
  }
};