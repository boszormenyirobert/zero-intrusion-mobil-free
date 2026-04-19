import * as i from '../../../Interfaces/interfaces';
import {
  getApiUrl,
  getPublicId,
  getPrivateId,
  getSecret,
  getEmail,
} from '../../../DeviceStore';
import { encryptToBase64 } from '../../../Encrypter';
import { logHttpRequest, logHttpResponse } from '../../httpLogger';

// Helper function to encrypt private ID
const encryptPrivateId = async (): Promise<string> => {
  return await encryptToBase64(await getPrivateId(), await getSecret());
};

// Function to handle domain login ~ access stored credentials for an domain
export const Delete = async (qrJson: i.Delete)=> {
  const path = qrJson.type === 'delete-applications'
    ? await getApiUrl('API_ALLOW_DELETE_APPLICATIONS')
    : await getApiUrl('API_ALLOW_DELETE_DOMAIN');

  try {
    // Extract and remove xExtensionAuthOne from qrJson
    const { xExtensionAuthOne, ...loginData } = qrJson;
    const authToken = xExtensionAuthOne || "";
    console.log('Login Body 1:', loginData);
    // Build request body with encrypted data
    const body: i.DeleteExtended = {
      ...loginData,
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

    logHttpRequest('PasswordManagerDelete', path, requestOptions);
    const response = await fetch(path, requestOptions);
    await logHttpResponse('PasswordManagerDelete', response);

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