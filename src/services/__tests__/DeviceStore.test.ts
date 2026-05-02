import * as Keychain from 'react-native-keychain';
import config from '../../config/environment';
import {
  getActiveProfile,
  getApiUrl,
  getCredentialSecret,
  getEmail,
  getPhone,
  getPrivacyPolicy,
  getPrivateId,
  getProfiles,
  getPublicId,
  getSecret,
  getPublicId as getStoredPublicId,
  normalizeApiBaseUrl,
  saveProfile,
  setActiveProfile,
  setActiveProfileByEmail,
} from '../DeviceStore';

const storeCredential = async (service: string, value: string) => {
  await Keychain.setInternetCredentials(service, 'user', value);
};

describe('DeviceStore', () => {
  it('saves and normalizes profiles', async () => {
    const savedProfile = await saveProfile({
      email: ' USER@Example.COM ',
      phone: ' 12345 ',
      privacyPolicy: 1 as unknown as boolean,
      publicId: 'public',
      privateId: 'private',
      secret: 'secret',
      credentialSecret: 'credential',
      url: 'https://example.com///',
    });

    expect(savedProfile).toEqual({
      email: 'user@example.com',
      phone: '12345',
      privacyPolicy: true,
      publicId: 'public',
      privateId: 'private',
      secret: 'secret',
      credentialSecret: 'credential',
      url: 'https://example.com',
    });

    await expect(getActiveProfile()).resolves.toEqual(savedProfile);
    await expect(getProfiles()).resolves.toEqual([savedProfile]);
  });

  it('migrates legacy storage into profiles and active profile', async () => {
    await storeCredential('publicId', 'legacy-public');
    await storeCredential('privateId', 'legacy-private');
    await storeCredential('secret', 'legacy-secret');
    await storeCredential('credentialSecret', 'legacy-credential');
    await storeCredential('email', 'Legacy@Example.com');
    await storeCredential('phone', '555');

    await expect(getActiveProfile()).resolves.toEqual({
      publicId: 'legacy-public',
      privateId: 'legacy-private',
      secret: 'legacy-secret',
      credentialSecret: 'legacy-credential',
      email: 'legacy@example.com',
      phone: '555',
      privacyPolicy: true,
      url: normalizeApiBaseUrl(config.API_BASE),
    });

    await expect(getProfiles()).resolves.toEqual([
      expect.objectContaining({ email: 'legacy@example.com' }),
    ]);
  });

  it('selects an active profile by normalized email', async () => {
    await saveProfile({
      email: 'first@example.com',
      phone: '123',
      privacyPolicy: true,
      publicId: 'public-1',
      privateId: 'private-1',
      secret: 'secret-1',
      credentialSecret: 'credential-1',
      url: 'https://example.com',
    });
    await saveProfile({
      email: 'second@example.com',
      phone: '456',
      privacyPolicy: true,
      publicId: 'public-2',
      privateId: 'private-2',
      secret: 'secret-2',
      credentialSecret: 'credential-2',
      url: 'https://second.example.com',
    }, { setActive: false });

    const selectedProfile = await setActiveProfileByEmail(' SECOND@example.com ');

    expect(selectedProfile).toEqual(expect.objectContaining({ email: 'second@example.com' }));
    await expect(getActiveProfile()).resolves.toEqual(expect.objectContaining({ email: 'second@example.com' }));
  });

  it('returns null when selecting an unknown profile', async () => {
    await expect(setActiveProfileByEmail('missing@example.com')).resolves.toBeNull();
  });

  it('builds api urls from the active profile base url', async () => {
    await setActiveProfile({
      email: 'api@example.com',
      phone: '123',
      privacyPolicy: true,
      publicId: 'public',
      privateId: 'private',
      secret: 'secret',
      credentialSecret: 'credential',
      url: 'https://tenant.example.com/',
    });

    await expect(getApiUrl('API_RECOVERY_SETTINGS')).resolves.toBe('https://tenant.example.com/api/secret/recovery-settings');
    await expect(getPrivacyPolicy()).resolves.toBe(true);
  });

  it('exposes active profile values through getter helpers', async () => {
    await setActiveProfile({
      email: 'helper@example.com',
      phone: '987',
      privacyPolicy: false,
      publicId: 'public-helper',
      privateId: 'private-helper',
      secret: 'secret-helper',
      credentialSecret: 'credential-helper',
      url: 'https://helper.example.com',
    });

    await expect(getPublicId()).resolves.toBe('public-helper');
    await expect(getPrivateId()).resolves.toBe('private-helper');
    await expect(getSecret()).resolves.toBe('secret-helper');
    await expect(getCredentialSecret()).resolves.toBe('credential-helper');
    await expect(getEmail()).resolves.toBe('helper@example.com');
    await expect(getPhone()).resolves.toBe('987');
    await expect(getPrivacyPolicy()).resolves.toBe(false);
  });

  it('falls back when stored profile json is invalid', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await storeCredential('profiles', 'not-json');
    await storeCredential('activeProfile', 'not-json');

    await expect(getProfiles()).resolves.toEqual([]);
    await expect(getActiveProfile()).resolves.toBeNull();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('falls back to the default api base when there is no active profile', async () => {
    await expect(getApiUrl('API_LOGIN')).resolves.toBe(`${normalizeApiBaseUrl(config.API_BASE)}/api/credential-hub/domain/read/credential`);
  });

  it('returns null when keychain reads fail', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    (Keychain.getInternetCredentials as jest.Mock).mockRejectedValueOnce(new Error('keychain-failed'));

    await expect(getActiveProfile()).resolves.toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('does not migrate incomplete legacy credentials', async () => {
    await storeCredential('publicId', 'legacy-public');
    await storeCredential('privateId', 'legacy-private');
    await storeCredential('secret', 'legacy-secret');

    await expect(getActiveProfile()).resolves.toBeNull();
    await expect(getProfiles()).resolves.toEqual([]);
  });

  it('migrates legacy credentials without persisting a profile list when email is missing', async () => {
    await storeCredential('publicId', 'legacy-public');
    await storeCredential('privateId', 'legacy-private');
    await storeCredential('secret', 'legacy-secret');
    await storeCredential('credentialSecret', 'legacy-credential');

    await expect(getActiveProfile()).resolves.toEqual({
      publicId: 'legacy-public',
      privateId: 'legacy-private',
      secret: 'legacy-secret',
      credentialSecret: 'legacy-credential',
      email: '',
      phone: '',
      privacyPolicy: false,
      url: normalizeApiBaseUrl(config.API_BASE),
    });
    await expect(getProfiles()).resolves.toEqual([]);
  });

  it('replaces an existing profile when previousEmail is provided', async () => {
    await saveProfile({
      email: 'old@example.com',
      phone: '111',
      privacyPolicy: true,
      publicId: 'public-1',
      privateId: 'private-1',
      secret: 'secret-1',
      credentialSecret: 'credential-1',
      url: 'https://example.com',
    });

    await saveProfile({
      email: 'new@example.com',
      phone: '222',
      privacyPolicy: true,
      publicId: 'public-2',
      privateId: 'private-2',
      secret: 'secret-2',
      credentialSecret: 'credential-2',
      url: 'https://new.example.com',
    }, { previousEmail: 'old@example.com', setActive: false });

    await expect(getProfiles()).resolves.toEqual([
      expect.objectContaining({ email: 'new@example.com', phone: '222' }),
    ]);
  });

  it('normalizes missing profile urls and returns null helper values without an active profile', async () => {
    const savedProfile = await saveProfile({
      email: 'url@example.com',
      phone: '333',
      privacyPolicy: true,
      publicId: 'public-3',
      privateId: 'private-3',
      secret: 'secret-3',
      credentialSecret: 'credential-3',
      url: '',
    });

    expect(savedProfile.url).toBe(normalizeApiBaseUrl(config.API_BASE));

    await Keychain.resetInternetCredentials('activeProfile');
    await expect(getStoredPublicId()).resolves.toBeNull();
  });
});
