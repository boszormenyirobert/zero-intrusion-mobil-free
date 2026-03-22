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

// Domain or Application registration or Update-application
export const Registration = async (qrJson: i.Registration) => {
  const path =
    qrJson.type === 'update-applications'
      ? config.API_ALLOW_EDIT_APPLICATIONS
      : config.API_REGISTRATION;

  try {
      const rawCredentials = await getRawCredentialsRequest(qrJson);
      console.log('Raw credentials retrieved:', rawCredentials);  
      await registrateEncryptedCredentialsRequest(qrJson, path, rawCredentials);          
  } catch (error) {
    console.error('Registration error:', error);
    return false;
  }
};

const getRawCredentialsRequest = async (qrJson: i.Registration) => {
  const authToken = getAuthToken(qrJson);

  const response = await fetch(config.API_REGISTRATION_TO_ENCRYPT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Extension-Auth': `HMAC ${authToken}`,
    },
    body: JSON.stringify(buildGetRawCredentialsPayload(qrJson)),
  });

  if (!response.ok) {
    console.error(
      'Retriving credentials failed:',
      response.status,
      response.statusText,
    );
    return false;
  }
  return await response.json();
};

const getAuthToken = qrJson => {
  const { xExtensionAuthOne } = qrJson;
  return xExtensionAuthOne || '';
};

const buildGetRawCredentialsPayload = (qrJson: i.Registration) => {
  const credentialsByTargetId: i.RequestCredentialsToEncrypt = {
    type: qrJson.type,
    source: qrJson.source,
    ...(qrJson.registrationProcessId && {
      registrationProcessId: qrJson.registrationProcessId,
    }),
  };

  return credentialsByTargetId;
};

const registrateEncryptedCredentialsRequest = async (qrJson: i.Registration, path: string, rawCredentials: any) => {
  const authToken = getAuthToken(qrJson);
  // Build request body with encrypted data
  const body_to_encrypt: i.RegistrationExtended =
  await buildEncryptedCredentialsPayload(qrJson, rawCredentials);

  // Make API request to save the encrypted credentials
  const response_final = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Extension-Auth': `HMAC ${authToken}`,
    },
    body: JSON.stringify(body_to_encrypt),
  });
  console.log('Registration request sent:', path, body_to_encrypt);
  // Check response status
  if (!response_final.ok) {
    console.error(
      'Registration failed:',
      response_final.status,
      response_final.statusText,
    );
    return false;
  }

  const result = await response_final.json();
  console.log('Registration response received:', result);
};

const buildEncryptedCredentialsPayload = async (
  qrJson: i.Registration,
  rawCredentials: any,
) => {
  const { ...registrationData } = qrJson;
  const rawUserCredential = JSON.parse(
    rawCredentials.registration_process_init,
  );
  const secretMessage = {
    userName: rawUserCredential.userName,
    userPassword: rawUserCredential.userPassword,
  };
  const encryptedUserCredential: string = await encryptToBase64(
    JSON.stringify(secretMessage),
    await getCredentialSecret(),
  );

  const payload: i.RegistrationExtended = {
    ...registrationData,
    description: rawUserCredential.description,
    publicId: await getPublicId(),
    privateId: await encryptPrivateId(),
    email: await getEmail(),
    userCredential: encryptedUserCredential,
    update: qrJson.isNew,
    ...(qrJson.targetId && { targetId: qrJson.targetId }),
  };
  return payload;
};

const encryptPrivateId = async (): Promise<string> => {
  return await encryptToBase64(await getPrivateId(), await getSecret());
};
