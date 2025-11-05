import * as i from '../../../Interfaces/interfaces';
import { API_ALLOW_DELETE_DOMAIN, API_ALLOW_DELETE_APPLICATION } from '@env';
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
export const Delete = async (qrJson: i.Delete)=> {
  const path = qrJson.type === 'delete-applications'
    ? API_ALLOW_DELETE_APPLICATION
    : API_ALLOW_DELETE_DOMAIN;

  try {
    // Extract and remove xExtensionAuthOne from qrJson
    const { xExtensionAuthOne, ...loginData } = qrJson;
    const authToken = xExtensionAuthOne || "";

    // Build request body with encrypted data
    const body: i.DeleteExtended = {
      ...loginData,
      publicId: await getPublicId(),
      privateId: await encryptPrivateId(),
      email: await getEmail()
    };

    console.log('Login Body:', body);

    // Make API request
    const response = await fetch(path, {
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