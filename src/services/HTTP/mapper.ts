import * as i from '../../services/Interfaces/interfaces';
import {  API_LOGIN } from '@env';
import {SystemHubRegistration} from './SystemHub/SystemHub';

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


export class QRHandler {
  // Map for system_hub_registration (async API call)
  async systemHubRegistration(data: i.HubRegistration): Promise<boolean> {
    return await SystemHubRegistration(data);
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