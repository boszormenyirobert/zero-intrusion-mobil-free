// Environment configuration for React Native
// This replaces @env imports to ensure environment variables work in release builds
// production:https://hub.zero-intrusion.com
// development: http://82.165.219.9:8085

const DEFAULT_API_BASE = 'http://82.165.219.9:8085';

export const normalizeApiBaseUrl = (url: string) => url.trim().replace(/\/+$/, '');

export const API_PATHS = {
  API_REGISTRATION_TO_ENCRYPT: '/api/credential-hub/shared/registration/new/to-encrypt',
  API_REGISTRATION: '/api/credential-hub/shared/registration/new',
  API_LOGIN: '/api/credential-hub/domain/read/credential',
  API_SECURE_DEVICE: '/api/credential-hub/one-touch/identifier',
  API_DECRYPTED_CREDENTIALS: '/api/credential-hub/domain/read/credential/decrypted',
  API_DECRYPTED_APPLICATIONS_CREDENTIALS: '/api/credential-hub/vault/read/credential/decrypted',
  API_ALLOW_DELETE_DOMAIN: '/api/credential-hub/domain/delete/credential',
  API_ALLOW_DELETE_APPLICATIONS: '/api/credential-hub/vault/delete/credential',
  API_ALLOW_APPLICATION_LIST: '/api/credential-hub/vault/read/credential',
  API_ALLOW_EDIT_APPLICATIONS: '/api/credential-hub/vault/edit/credential',
  API_DEVICE_REGISTRATION: '/api/secret/new',
  API_RECOVERY_SETTINGS: '/api/secret/recovery-settings',
} as const;

export type ApiConfigKey = keyof typeof API_PATHS;

export const buildApiConfig = (apiBase: string) => {
  const normalizedBase = normalizeApiBaseUrl(apiBase);

  return Object.entries(API_PATHS).reduce((result, [key, path]) => {
    result[key as ApiConfigKey] = `${normalizedBase}${path}`;
    return result;
  }, {} as Record<ApiConfigKey, string>);
};

const config = {
  // API Configuration
  API_BASE: DEFAULT_API_BASE,
  ...buildApiConfig(DEFAULT_API_BASE),

  // Firebase Configuration
  FIREBASE_API_KEY: 'AIzaSyAwZXKyzRlWXiMs-UsCArsnJbxS0SbsQoM',
  FIREBASE_AUTH_DOMAIN: 'zerointrusionlock.firebaseapp.com',
  FIREBASE_PROJECT_ID: 'zerointrusionlock',
  FIREBASE_STORAGE_BUCKET: 'zerointrusionlock.firebasestorage.app',
  FIREBASE_MESSAGING_SENDER_ID: '561286686541',
  FIREBASE_APP_ID: '1:561286686541:android:eedfd1e0f275e6fcdfb904',
};

export default config;