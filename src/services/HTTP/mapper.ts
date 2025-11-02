
/**
    hub registration
    {
    "corporateId":"cid_FkJ+uisyX9tHCKyf44MTE4LaZGVIulTXQSL4Nbvb4Ih8oJefxu5db1I7tahJ",
    "corporateAuthentication":"c",
    "domain":"http://82.165.219.9:8082",
    "xExtensionAuthOne":"f99b727b3d37684b45ce3e18fda4fc71fed0d7909fcbde3c7d0020714f05bbd4",
    "registrationProcessId":"WJVnfUOksK9F",
    "type":"system_hub_registration",
    "isNew":"new"}
*/

import * as i from '../../services/Interfaces/interfaces';
import { API_REGISTRATION, API_LOGIN } from '@env';
import CryptoJS from 'crypto-js';
import { getPublicId, getPrivateId, getSecret, getEmail } from '../../services/DeviceStore';

export const systemHubRegistration = async (qrJson: i.HubRegistration) => {
    /** Extended request
     publicId, privateId, secret

     // Encrypt privateId
    val encryptedUserPrivateId = CryptoHelper.encryptToBase64(privateId, secret)

    val userData = JSONObject()
    userData.put("publicId", publicId)
    userData.put("privateId", encryptedUserPrivateId)
    userData.put("email", "boszormenyirobert@yahoo.com")
    userData.put("userCredential", encryptedUserCredential)
    userData.put("corporateId", corporateId)
    userData.put("corporateAuthentication", corporateAuthentication)
    userData.put("update", isNew)
    userData.put("source", source)
    userData.put("type", type)
    userData.put("registrationProcessId", registrationProcessId)
    userData.put("xExtensionAuth", xExtensionAuth) 

    val domain = qrJson.takeIf { it.has("domain") && !it.isNull("domain") }?.getString("domain")
    val description = qrJson.takeIf { it.has("description") && !it.isNull("description") }?.getString("description")

    userData.put("domain", domain)
    userData.put("description", description)

    val charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#\$%^&*()-_=+[]{}<>?."
    val secretMessageString = (1..14)
        .map { charset.random() }
        .joinToString("")

    encryptedUserCredential = CryptoHelper.encryptToBase64(secretMessageString, secret)
    userData.put("userCredential", encryptedUserCredential)       

     */

   
    const secretMessageString = generatedSecret();
    // secret from credentials storage
    const encryptedUserCredential = encryptToBase64(secretMessageString, await getSecret());

    const body ={
        publicId: getPublicId(), 
        privateId: encryptToBase64(await getPrivateId(), await getSecret()), 
        email: await getEmail(), 
        corporateId: qrJson.corporateId,
        corporateAuthentication: qrJson.corporateAuthentication, // Missing in QR?
        update: qrJson.isNew,
        source: "extension",
        type: qrJson.type,
        registrationProcessId: qrJson.registrationProcessId,
        xExtensionAuth: qrJson.xExtensionAuthOne,
        domain: qrJson.domain,
        description: "",  
        userCredential: encryptedUserCredential
    }
   
    console.log('Registration Body:', body);

    const response = await fetch(API_REGISTRATION, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        'X-Extension-Auth': ''
        },
        body: JSON.stringify(body),
    });
    console.log(response);

  return false;
};

export const systemHubLogin = async (body: i.HubLogin) => {
  await fetch(API_LOGIN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Extension-Auth': `HMAC`
    },
    body: JSON.stringify(body),
  });
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

const encryptToBase64 = (secretMessageString: string, secret: string): string => {
  const encrypted = CryptoJS.AES.encrypt(secretMessageString, secret).toString();
  return encrypted;  // This is already base64 encoded
};


export class QRHandler {
  // Map for system_hub_registration (async API call)
  async systemHubRegistration(data: i.HubRegistration): Promise<boolean> {
    return await systemHubRegistration(data);
  }    

  // Map for system_hub_login (async API call)
  async systemHubLogin(data: i.HubLogin): Promise<boolean> {
    return await systemHubLogin(data);
  }

  // Map for registration_domain
  registrationDomain(data: i.DomainRegistration): i.DomainRegistrationResponse {
    return {
      domain: data.domain,
      xExtensionAuthOne: data.xExtensionAuthOne,
      corporateId: ""  // Not present, set default
    };
  }

  // Map for registration_application (assuming similar to domain)
  registrationApplication(data: i.DomainRegistration): i.ApplicationRegistrationResponse {
    return {
      domain: data.domain,
      corporateId: "",  // Not present, set default
      corporateAuthentication: ""  // Not present, set default
    };
  }
}