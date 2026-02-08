import * as i from '../../../Interfaces/interfaces';
import config from '../../../../config/environment';
import {
  getPublicId,
  getPrivateId,
  getSecret,
  getEmail,
  getCredentialSecret,
} from '../../../DeviceStore';
import { encryptToBase64, decryptFromBase64 } from '../../../Encrypter';

// Helper function to encrypt private ID
const encryptPrivateId = async (): Promise<string> => {
  return await encryptToBase64(await getPrivateId(), await getSecret());
};

// Function to handle domain login ~ access stored credentials for an domain
export const Access = async (qrJson: i.Access)=> {
  // Request the users-encrypted credentials list
  const encryptedCredentials = await getEncryptedCredentials(qrJson);

  const decryptedCredentials: any[] = [];
            for (const domain of encryptedCredentials.credentials) {
              const decryptedCredential = await decryptFromBase64(domain.credential, await getCredentialSecret());
              if (decryptedCredential !== null) {
                decryptedCredentials.push(
                  {
                    'credential':decryptedCredential,
                    'targetId': domain.targetId,
                    'description':  domain.description,
                    'application': domain?.application
                  }
                );
              }
            };
  const path = qrJson.type === 'domain-login'
    ? config.API_LOGIN
    : config.API_ALLOW_APPLICATION_LIST;

  try {
    // Extract and remove xExtensionAuthOne from qrJson
    const { xExtensionAuthOne, ...loginData } = qrJson;
    const authToken = xExtensionAuthOne || "";

    // Build request body with encrypted data
    const body: i.AccessExtended = {
      ...loginData,
      publicId: await getPublicId(),
      privateId: await encryptPrivateId(),
      email: await getEmail(),
      update: false,
      credentials: decryptedCredentials    
    };
    console.log('Access path:', path);
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

async function getEncryptedCredentials(qrJson: i.Access){
  
   const path = qrJson.type === 'domain-login'
    ? config.API_DECRYPTED_CREDENTIALS
    : config.API_DECRYPTED_APPLICATIONS_CREDENTIALS;
   
  try {
    // Extract and remove xExtensionAuthOne from qrJson
    const { xExtensionAuthOne, ...loginData } = qrJson;
    const authToken = xExtensionAuthOne || "";

    // Build request body with encrypted data
    const body: i.AccessExtended = {
      ...loginData,
      publicId: await getPublicId(),
      privateId: await encryptPrivateId(),
      email: await getEmail(),
      update: false,
      credentials: [] // This will be filled with decrypted credentials    
    };

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
      console.error('Login failed:', response.status, response);
      return false;
    }

    return await response.json();
  } catch (error) {
    console.error('SystemHubLogin error:', error);
    return false;
  }
};