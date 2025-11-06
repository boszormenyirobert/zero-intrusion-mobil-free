// Environment configuration for React Native
// This replaces @env imports to ensure environment variables work in release builds

const config = {
  // API Configuration
  API_BASE: 'http://82.165.219.9:8082',
  API_REGISTRATION: 'http://82.165.219.9:8082/api/credential-hub/shared/registration/new',
  API_LOGIN: 'http://82.165.219.9:8082/api/credential-hub/domain/read/credential',
  API_ALLOW_DELETE_DOMAIN: 'http://82.165.219.9:8082/api/credential-hub/domain/delete/credential',
  API_ALLOW_DELETE_APPLICATIONS: 'http://82.165.219.9:8082/api/credential-hub/vault/delete/credential',
  API_ALLOW_APPLICATION_LIST: 'http://82.165.219.9:8082/api/credential-hub/vault/read/credential',
  API_ALLOW_EDIT_APPLICATIONS: 'http://82.165.219.9:8082/api/credential-hub/vault/edit/credential',
  API_DEVICE_REGISTRATION: 'http://82.165.219.9:8082/api/secret/new',
  API_RECOVERY_SETTINGS: 'http://82.165.219.9:8082/api/secret/recovery-settings',

  // Firebase Configuration
  FIREBASE_API_KEY: 'AIzaSyAwZXKyzRlWXiMs-UsCArsnJbxS0SbsQoM',
  FIREBASE_AUTH_DOMAIN: 'zerointrusionlock.firebaseapp.com',
  FIREBASE_PROJECT_ID: 'zerointrusionlock',
  FIREBASE_STORAGE_BUCKET: 'zerointrusionlock.firebasestorage.app',
  FIREBASE_MESSAGING_SENDER_ID: '561286686541',
  FIREBASE_APP_ID: '1:561286686541:android:eedfd1e0f275e6fcdfb904',
};

export default config;