import * as i from '../../../Interfaces/interfaces';
import config from '../../../../config/environment';
import {
  getPublicId,
  getPrivateId,
  getSecret,
  getEmail,
  getCredentialSecret,
} from '../../../DeviceStore';
import { encryptToBase64 } from '../../../Encrypter';

// Helper function to encrypt private ID
const encryptPrivateId = async (): Promise<string> => {
  return await encryptToBase64(await getPrivateId(), await getSecret());
};

// Function to handle domain registration ~ add new credentials to an domain
export const Registration = async (qrJson: i.Registration) => {
  const path = qrJson.type === 'update-applications'
    ? config.API_ALLOW_EDIT_APPLICATIONS
    : config.API_REGISTRATION;

  try {
    const { xExtensionAuthOne, ...registrationData } = qrJson;
    const authToken = xExtensionAuthOne || '';

    const secretMessage = {
      userName: qrJson.userName,
      userPassword: qrJson.userPassword,
    };

    const encryptedUserCredential: string = await encryptToBase64(
      JSON.stringify(secretMessage),
      await getCredentialSecret(),
    );

    // Build request body with encrypted data
    const body: i.RegistrationExtended = {
      ...registrationData,
      publicId: await getPublicId(),
      privateId: await encryptPrivateId(),
      email: await getEmail(),
      userCredential: encryptedUserCredential,
      update: qrJson.isNew,  
      ...(qrJson.targetId && { targetId: qrJson.targetId }),
    };

    // Make API request
    const response = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Extension-Auth': `HMAC ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    // Check response status
    if (!response.ok) {
      console.error(
        'Registration failed:',
        response.status,
        response.statusText,
      );
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