// Define discriminated union for QRData based on type
export interface HubRegistration {
  corporateId: string;
  corporateAuthentication: string;
  domain: string;
  xExtensionAuthOne: string;
  registrationProcessId: string;
  type: "system_hub_registration";
  isNew: string;
}

export interface HubLogin {
  domain: string;
  domainProcessId: string;
  xExtensionAuthOne: string;
  type: "system_hub_login";
  corporateId: string;
  corporateAuthentication: string;
  source: string;
}

export interface DomainRegistration {
  userName: string;
  userPassword: string;
  registrationProcessId: string;
  xExtensionAuthOne: string;
  type: "registration-domain";
  source: string;
  isNew: boolean;
  description: string;
  domain: string;
  application: string | null;
}

export interface DomainLogin {
  domain: string;
  domainProcessId: string;
  xExtensionAuthOne: string;
  type: "domain-login";
  source: string;
  iv: string;
}

export type QRData = HubRegistration | HubLogin | DomainRegistration | DomainLogin;

// Define return types for each incoming type
export interface LoginResponse {
  corporateId: string;
  corporateAuthentication: string;
  source: string;
}

export interface RegistrationResponse {
  domain: string;
  domainProcessId: string;
  xExtensionAuthOne: string;
}

export interface DomainRegistrationResponse {
  domain: string;
  xExtensionAuthOne: string;
  corporateId: string;
}

export interface ApplicationRegistrationResponse {
  domain: string;
  corporateId: string;
  corporateAuthentication: string;
}