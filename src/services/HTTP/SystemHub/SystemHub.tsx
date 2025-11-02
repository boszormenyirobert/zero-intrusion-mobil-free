import * as i from '../../../services/Interfaces/interfaces';
import { API_REGISTRATION } from '@env';
import { getPublicId, getPrivateId, getSecret, getEmail } from '../../../services/DeviceStore';
import {encryptToBase64} from '../../Encrypter';

export const SystemHubRegistration = async (qrJson: i.HubRegistration) => {

    const secretMessageString = generatedSecret();
    // secret from credentials storage
    const encryptedUserCredential = await encryptToBase64(secretMessageString, await getSecret());
    const body ={
        publicId: await getPublicId(), 
        privateId: await encryptToBase64(await getPrivateId(), await getSecret()), 
        email: await getEmail(), 
        corporateId: qrJson.corporateId,
        corporateAuthentication: qrJson.corporateAuthentication,
        update: qrJson.isNew,
        source: "extension",
        type: qrJson.type,
        registrationProcessId: qrJson.registrationProcessId,
        xExtensionAuth: qrJson.xExtensionAuthOne,
        domain: qrJson.domain,
        description: "",  
        userCredential: encryptedUserCredential
    }

    const response = await fetch(API_REGISTRATION, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'X-Extension-Auth': `HMAC ${qrJson.xExtensionAuthOne}`
        },
        body: JSON.stringify(body),
    });
    console.log(response);

  return false;
};

const generatedSecret = (): string => {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}<>?.";
  let result = '';
  for (let i = 0; i < 14; i++) {
    result += charset[Math.floor(Math.random() * charset.length)];
  }
  return result;
};

export class QRHandler {
  // Map for system_hub_registration (async API call)
  async systemHubRegistration(data: i.HubRegistration): Promise<boolean> {
    return await SystemHubRegistration(data);
  }    

}