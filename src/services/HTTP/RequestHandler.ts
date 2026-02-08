import * as i from '../Interfaces/interfaces';
import {SystemHubRegistration, SystemHubLogin, SystemHubSecureDevice} from './SystemHub/SystemHub';
import {Registration as SharedRegistration} from './PasswordManager/Shared/Registration';
import {Access} from './PasswordManager/Shared/Access';
import {Delete as DomainDelete} from './PasswordManager/Shared/Delete';
import { registerDeviceAndUserByClone } from './registerDevice';

export class RequestHandler {
  // Map for system_hub_registration -- and any other sites, which are registrated in the Hub(async API call)
  async systemHubRegistration(data: i.HubRegistration): Promise<boolean> {
    return await SystemHubRegistration(data);
  }    

  // Map for system_hub_login -- and any other sites, which are registrated in the Hub(async API call)
  async systemHubLogin(data: i.HubLogin): Promise<boolean> {
    return await SystemHubLogin(data);
  }

  // Shared domain/application access
  // Map for accessing domain or application credentials (async API call)
  async access(data: i.Access): Promise<boolean> {
    return await Access(data);
  }  

  // Map for registrate credentials to domain (async API call)
  async sharedRegistration(data: i.Registration): Promise<boolean> {
    return await SharedRegistration(data);
  }

  // Map for delete domain or applicatoin credentials (async API call)
  async delete(data: i.Delete): Promise<boolean> {
    return await DomainDelete(data);
  }

  async clone(data: i.Clone): Promise<boolean> {
    return await registerDeviceAndUserByClone(data);    
  } 

  // Map for secure device  (async API call)
  async systemHubSecureDevice(data: i.SecureDevice): Promise<boolean> {
    return await SystemHubSecureDevice(data);    
  }     
}