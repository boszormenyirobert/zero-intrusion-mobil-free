import * as i from '../../../Interfaces/interfaces';
import { API_LOGIN } from '@env';
import {
  getPublicId,
  getPrivateId,
  getSecret,
  getEmail,
} from '../../../DeviceStore';
import { encryptToBase64 } from '../../../Encrypter';

// Helper function to encrypt private ID
const encryptPrivateId = async (): Promise<string> => {
  return await encryptToBase64(await getPrivateId(), await getSecret());
};

// Function to handle domain login ~ access stored credentials for an domain
export const Access = async (qrJson: i.DomainLogin)=> {
    console.log(qrJson);
  try {
    // Extract and remove xExtensionAuthOne from qrJson
    const { xExtensionAuthOne, ...loginData } = qrJson;
    const authToken = xExtensionAuthOne || "";

    // Build request body with encrypted data
    const body: i.DomainLoginExtended = {
      ...loginData, // Spread the remaining qrJson properties
      publicId: await getPublicId(),
      privateId: await encryptPrivateId(),
      email: await getEmail(),
      update: false    
    };

    console.log('Login Body:', body);

    // Make API request
    const response = await fetch(API_LOGIN, {
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