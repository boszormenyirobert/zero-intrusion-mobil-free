import * as Keychain from 'react-native-keychain';
import config, { ApiConfigKey, buildApiConfig, normalizeApiBaseUrl } from '../config/environment';
import * as i from './Interfaces/interfaces';

const PROFILES_SERVICE = 'profiles';
const ACTIVE_PROFILE_SERVICE = 'activeProfile';
const RSA_PRIVATE_KEY_SERVICE = 'rsaPrivateKey';
const RSA_PUBLIC_KEY_SERVICE = 'rsaPublicKey';

const readKeychainValue = async (service: string): Promise<string | null> => {
  try {
    const credentials = await Keychain.getInternetCredentials(service);
    if (!credentials) {
      return null;
    }

    return credentials.password;
  } catch (error) {
    console.error(`Error retrieving ${service}:`, error);
    return null;
  }
};

const writeKeychainValue = async (service: string, value: string) => {
  await Keychain.setInternetCredentials(service, 'user', value);
};

const readJsonKeychain = async <T,>(service: string, fallback: T): Promise<T> => {
  const value = await readKeychainValue(service);

  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Error parsing ${service}:`, error);
    return fallback;
  }
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const normalizeProfile = (profile: i.UserProfile): i.UserProfile => ({
  ...profile,
  email: normalizeEmail(profile.email),
  phone: profile.phone.trim(),
  url: normalizeApiBaseUrl(profile.url || config.API_BASE),
  privacyPolicy: Boolean(profile.privacyPolicy),
});

const readProfilesFromStorage = async () => readJsonKeychain<i.UserProfile[]>(PROFILES_SERVICE, []);

const writeProfilesToStorage = async (profiles: i.UserProfile[]) => {
  await writeKeychainValue(PROFILES_SERVICE, JSON.stringify(profiles));
};

const getLegacyProfile = async (): Promise<i.UserProfile | null> => {
  const [publicId, privateId, secret, credentialSecret, email, phone] = await Promise.all([
    readKeychainValue('publicId'),
    readKeychainValue('privateId'),
    readKeychainValue('secret'),
    readKeychainValue('credentialSecret'),
    readKeychainValue('email'),
    readKeychainValue('phone'),
  ]);

  if (!publicId || !privateId || !secret || !credentialSecret) {
    return null;
  }

  return {
    publicId,
    privateId,
    secret,
    credentialSecret,
    email: normalizeEmail(email ?? ''),
    phone: phone ?? '',
    privacyPolicy: Boolean(email && phone),
    url: normalizeApiBaseUrl(config.API_BASE),
  };
};

const migrateLegacyProfileIfNeeded = async () => {
  const [storedProfiles, activeProfile] = await Promise.all([
    readProfilesFromStorage(),
    readJsonKeychain<i.UserProfile | null>(ACTIVE_PROFILE_SERVICE, null),
  ]);

  if (storedProfiles.length > 0 || activeProfile) {
    return;
  }

  const legacyProfile = await getLegacyProfile();
  if (!legacyProfile) {
    return;
  }

  await setActiveProfile(legacyProfile);

  if (legacyProfile.email) {
    await writeProfilesToStorage([legacyProfile]);
  }
};

const getProfiles = async (): Promise<i.UserProfile[]> => {
  await migrateLegacyProfileIfNeeded();
  return readProfilesFromStorage();
};

const getActiveProfile = async (): Promise<i.UserProfile | null> => {
  await migrateLegacyProfileIfNeeded();
  return readJsonKeychain<i.UserProfile | null>(ACTIVE_PROFILE_SERVICE, null);
};

const setActiveProfile = async (profile: i.UserProfile) => {
  await writeKeychainValue(
    ACTIVE_PROFILE_SERVICE,
    JSON.stringify(normalizeProfile(profile)),
  );
};

const setActiveProfileByEmail = async (email: string) => {
  const normalizedEmail = normalizeEmail(email);
  const profiles = await getProfiles();
  const selectedProfile = profiles.find(profile => profile.email === normalizedEmail);

  if (!selectedProfile) {
    return null;
  }

  await setActiveProfile(selectedProfile);
  return selectedProfile;
};

const saveProfile = async (
  profile: i.UserProfile,
  options?: { previousEmail?: string; setActive?: boolean },
) => {
  const normalizedProfile = normalizeProfile(profile);
  const previousEmail = options?.previousEmail
    ? normalizeEmail(options.previousEmail)
    : null;
  const profiles = await getProfiles();
  const filteredProfiles = profiles.filter(storedProfile => {
    if (previousEmail && storedProfile.email === previousEmail) {
      return false;
    }

    return storedProfile.email !== normalizedProfile.email;
  });

  filteredProfiles.push(normalizedProfile);
  await writeProfilesToStorage(filteredProfiles);

  if (options?.setActive ?? true) {
    await setActiveProfile(normalizedProfile);
  }

  return normalizedProfile;
};

const getActiveProfileValue = async <T extends keyof i.UserProfile,>(key: T) => {
  const activeProfile = await getActiveProfile();
  return activeProfile?.[key] ?? null;
};

const getApiUrl = async (key: ApiConfigKey) => {
  const activeProfile = await getActiveProfile();
  const apiBase = activeProfile?.url || config.API_BASE;
  return buildApiConfig(apiBase)[key];
};

const getPublicId = async (): Promise<string | null> => getActiveProfileValue('publicId');

const getPrivateId = async (): Promise<string | null> => getActiveProfileValue('privateId');

const getSecret = async (): Promise<string | null> => getActiveProfileValue('secret');

const getCredentialSecret = async (): Promise<string | null> => getActiveProfileValue('credentialSecret');

const getEmail = async (): Promise<string | null> => getActiveProfileValue('email');

const getPhone = async (): Promise<string | null> => getActiveProfileValue('phone');

const getPrivacyPolicy = async (): Promise<boolean> => {
  const activeProfile = await getActiveProfile();
  return Boolean(activeProfile?.privacyPolicy);
};

const getRsaPrivateKey = async (): Promise<string | null> => readKeychainValue(RSA_PRIVATE_KEY_SERVICE);

const getRsaPublicKey = async (): Promise<string | null> => readKeychainValue(RSA_PUBLIC_KEY_SERVICE);

const setRsaKeyPair = async (privateKeyPem: string, publicKey: string) => {
  await Promise.all([
    writeKeychainValue(RSA_PRIVATE_KEY_SERVICE, privateKeyPem),
    writeKeychainValue(RSA_PUBLIC_KEY_SERVICE, publicKey),
  ]);
};

export {
  getActiveProfile,
  getApiUrl,
  getCredentialSecret,
  getEmail,
  getPhone,
  getPrivacyPolicy,
  getPrivateId,
  getProfiles,
  getPublicId,
  getRsaPrivateKey,
  getRsaPublicKey,
  getSecret,
  normalizeApiBaseUrl,
  saveProfile,
  setRsaKeyPair,
  setActiveProfile,
  setActiveProfileByEmail,
};
