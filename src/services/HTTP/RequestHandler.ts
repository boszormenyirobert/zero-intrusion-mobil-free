import * as i from '../Interfaces/interfaces';
import {SystemHubRegistration, SystemHubLogin} from './SystemHub/SystemHub';
import {Registration as DomainRegistration} from './PasswordManager/Domain/Registration';
import {Access as DomainAccess} from './PasswordManager/Domain/Access';
import {Delete as DomainDelete} from './PasswordManager/Domain/Delete';

export class RequestHandler {
  // Map for system_hub_registration -- and any other sites, which are registrated in the Hub(async API call)
  async systemHubRegistration(data: i.HubRegistration): Promise<boolean> {
    return await SystemHubRegistration(data);
  }    

  // Map for system_hub_login -- and any other sites, which are registrated in the Hub(async API call)
  async systemHubLogin(data: i.HubLogin): Promise<boolean> {
    return await SystemHubLogin(data);
  }

  // Map for registrate credentials to domain (async API call)
  async registrationDomain(data: i.DomainRegistration): Promise<boolean> {
    return await DomainRegistration(data);
  }

   // Map for accessing domain credentials (async API call)
  async domainLogin(data: i.DomainLogin): Promise<boolean> {
    return await DomainAccess(data);
  }

   // Map for delete domain credentials (async API call)
  async domainDelete(data: i.DomainDelete): Promise<boolean> {
    return await DomainDelete(data);
  }
}