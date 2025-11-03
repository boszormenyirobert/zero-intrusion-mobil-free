// Define discriminated union for QRData based on type
interface UserProperties {
  publicId: string;
  privateId: string;
  email: string;
}

// Base interfaces for QR data
export interface HubRegistration {
  corporateId: string;
  corporateAuthentication: string;
  domain: string;
  xExtensionAuthOne: string;
  registrationProcessId: string;
  type: 'system_hub_registration';
  isNew: string;
}

// Extended interfaces for API requests
export interface HubRegistrationExtended
  extends Omit<HubRegistration, 'xExtensionAuthOne'>,
    UserProperties {
  update: string;
  source: string;
  xExtensionAuth: string;
  description: string;
  userCredential: string;
}

export interface HubLogin {
  domain: string;
  domainProcessId: string;
  xExtensionAuthOne: string;
  type: 'system_hub_login';
  corporateId: string;
  corporateAuthentication: string;
  source: string;
}

export interface HubLoginExtended
  extends Omit<HubLogin, 'xExtensionAuthOne'>,
    UserProperties {}

// Domain registration interfaces
export interface DomainRegistration {
  userName: string;
  userPassword: string;
  registrationProcessId: string;
  xExtensionAuthOne: string;
  type: 'registration-domain';
  source: string;
  isNew: boolean;
  description: string;
  domain: string;
  application: string | null;
}

export interface DomainRegistrationExtended
  extends Omit<DomainRegistration, 'xExtensionAuthOne'>,
    UserProperties {
  userCredential: string;
  update: boolean;
}

export interface DomainLogin {
  domain: string;
  domainProcessId: string;
  xExtensionAuthOne: string;
  type: 'domain-login';
  source: string;
  iv: string;
}

export interface DomainLoginExtended
  extends Omit<DomainLogin, 'xExtensionAuthOne'>,
    UserProperties {
      update: false
    }

export interface DomainDelete {
  domain: string;
  type: 'domain-delete';
  source: string;  
  removeProcessId: string;
  xExtensionAuthOne: string;
}

export interface DomainDeleteExtended
  extends Omit<DomainDelete, 'xExtensionAuthOne'>,
    UserProperties {}

// Union type for all QR data types
export type QRData =
  | HubRegistration
  | HubLogin
  | DomainRegistration
  | DomainLogin
  | DomainDelete;

export const Device = {
  publicId: 'string',
  privateId: 'string',
  email : 'string',
  phone : 'string' ,
  privacyPolicy : false,
  fcmToken: 'string'
};

export type UserRegistrationProps = {
  setValidUser: (valid: boolean) => void;
};

// Define return types for each incoming type
export interface RegistrationResponse {
  domain: string;
  domainProcessId: string;
  xExtensionAuthOne: string;
}

export interface ApplicationRegistrationResponse {
  domain: string;
  corporateId: string;
  corporateAuthentication: string;
}
