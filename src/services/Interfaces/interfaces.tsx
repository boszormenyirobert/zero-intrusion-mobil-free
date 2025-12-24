// Define discriminated union for QRData based on type
interface UserProperties {
  publicId: string;
  privateId: string;
  email: string;
}

export interface Clone {
  publicId: string;
  privateId: string;
  secret: string;
  credentialSecret: string;
  email: string;
  phone: string;
  type: 'clone';
  Type: 'clone';
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

// Domain or Software registration interfaces
export interface Registration {
  userName: string;
  userPassword: string;
  registrationProcessId: string;
  xExtensionAuthOne: string;
  type: 'registration-domain'|'update-applications';
  source: string;
  isNew: string;
  description: string;
  domain: string;
  application: string | null;
  targetId?: string;
}

export interface RegistrationExtended
  extends Omit<Registration, 'xExtensionAuthOne'>,
    UserProperties {
  userCredential: string;
  update: string;
  targetId?: string;
}

export interface Access {
  domain: string;
  domainProcessId: string;
  xExtensionAuthOne: string;
  type: 'domain-login';
  source: string;
  iv: string;
}

export interface AccessExtended
  extends Omit<Access, 'xExtensionAuthOne'>,
    UserProperties {
      update: false,
      credentials: string[];
    }

export interface Delete {
  domain: string;
  type: 'domain-delete'|'delete-domain'|'delete-applications';
  source: string;  
  removeProcessId: string;
  xExtensionAuthOne: string;
}

export interface DeleteExtended
  extends Omit<Delete, 'xExtensionAuthOne'>,
    UserProperties {}

export interface UserCredentialDecryption {
  type: 'user-credential-decryption';
  credentials: string[];
}
    
// Union type for all QR data types
export type QRData =
  | HubRegistration
  | HubLogin
  | Registration
  | Access
  | Delete
  | Clone
  | UserCredentialDecryption;

export const Device = {
  publicId: 'string',
  privateId: 'string',
  email : 'string',
  phone : 'string' ,
  privacyPolicy : false,
  fcmToken: 'string',
  credentialSecret: 'string'
};

export type UserRegistrationProps = {
  setValidUser: (valid: boolean) => void;
  setView?: (view: string) => void;
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
