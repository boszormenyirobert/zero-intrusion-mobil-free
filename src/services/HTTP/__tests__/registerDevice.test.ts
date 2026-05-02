jest.mock('../../DeviceStore', () => ({
  saveProfile: jest.fn(),
  setActiveProfile: jest.fn(),
}));

jest.mock('../httpLogger', () => ({
  logHttpRequest: jest.fn(),
  logHttpResponse: jest.fn(),
}));

import { saveProfile, setActiveProfile } from '../../DeviceStore';
import {
  registerDevice,
  registerDeviceAndUserByClone,
  requestDeviceRegistration,
} from '../registerDevice';

const fetchMock = global.fetch as unknown as jest.Mock;
const mockFetchResolvedOnce = (value: unknown) => fetchMock.mockResolvedValueOnce(value);
const mockFetchRejectedOnce = (value: unknown) => fetchMock.mockRejectedValueOnce(value);

const createResponse = (body: unknown, ok = true) => ({
  ok,
  status: ok ? 200 : 500,
  statusText: ok ? 'OK' : 'Error',
  json: jest.fn(async () => body),
});

describe('registerDevice', () => {
  it('parses direct and nested device registration payloads', async () => {
    mockFetchResolvedOnce(createResponse({
      privateSecret: {
        publicId: 'public',
        privateId: 'private',
        secret: 'secret',
        credentialSecret: 'credential',
      },
    }));

    await expect(requestDeviceRegistration('https://example.com')).resolves.toEqual({
      publicId: 'public',
      privateId: 'private',
      secret: 'secret',
      credentialSecret: 'credential',
    });
    mockFetchResolvedOnce(createResponse({
      content: JSON.stringify({
        privateSecret: {
          publicId: 'public-2',
          privateId: 'private-2',
          secret: 'secret-2',
          credentialSecret: 'credential-2',
        },
      }),
    }));

    await expect(requestDeviceRegistration('https://example.com')).resolves.toEqual({
      publicId: 'public-2',
      privateId: 'private-2',
      secret: 'secret-2',
      credentialSecret: 'credential-2',
    });

    mockFetchResolvedOnce(createResponse({
      content: {
        privateSecret: {
          publicId: 'public-3',
          privateId: 'private-3',
          secret: 'secret-3',
          credentialSecret: 'credential-3',
        },
      },
    }));

    await expect(requestDeviceRegistration('https://example.com')).resolves.toEqual({
      publicId: 'public-3',
      privateId: 'private-3',
      secret: 'secret-3',
      credentialSecret: 'credential-3',
    });
  });

  it('uses default api base arguments when none are provided', async () => {
    mockFetchResolvedOnce(createResponse({
      privateSecret: {
        publicId: 'public',
        privateId: 'private',
        secret: 'secret',
        credentialSecret: 'credential',
      },
    }));
    mockFetchResolvedOnce(createResponse({
      privateSecret: {
        publicId: 'public-2',
        privateId: 'private-2',
        secret: 'secret-2',
        credentialSecret: 'credential-2',
      },
    }));

    await expect(requestDeviceRegistration()).resolves.toEqual({
      publicId: 'public',
      privateId: 'private',
      secret: 'secret',
      credentialSecret: 'credential',
    });
    await expect(registerDevice()).resolves.toBe(true);
  });

  it('returns null for unexpected payloads or fetch failures', async () => {
    mockFetchResolvedOnce(createResponse({ content: '{}' }));
    mockFetchRejectedOnce(new Error('network'));

    await expect(requestDeviceRegistration('https://example.com')).resolves.toBeNull();
    await expect(requestDeviceRegistration('https://example.com')).resolves.toBeNull();
  });

  it('returns null for malformed direct and nested payloads', async () => {
    mockFetchResolvedOnce(createResponse({ privateSecret: 'invalid' }));
    mockFetchResolvedOnce(createResponse({
      content: {
        privateSecret: {
          publicId: 'public',
          privateId: 'private',
          secret: 'secret',
        },
      },
    }));

    await expect(requestDeviceRegistration('https://example.com')).resolves.toBeNull();
    await expect(requestDeviceRegistration('https://example.com')).resolves.toBeNull();
  });

  it('returns null for invalid json content strings and non-object payloads', async () => {
    mockFetchResolvedOnce(createResponse({ content: '{invalid-json' }));
    mockFetchResolvedOnce(createResponse(null));

    await expect(requestDeviceRegistration('https://example.com')).resolves.toBeNull();
    await expect(requestDeviceRegistration('https://example.com')).resolves.toBeNull();
  });

  it('stores the active profile during device registration', async () => {
    mockFetchResolvedOnce(createResponse({
      privateSecret: {
        publicId: 'public',
        privateId: 'private',
        secret: 'secret',
        credentialSecret: 'credential',
      },
    }));

    await expect(registerDevice('https://tenant.example.com/')).resolves.toBe(true);
    expect(setActiveProfile).toHaveBeenCalledWith(expect.objectContaining({
      publicId: 'public',
      url: 'https://tenant.example.com',
    }));
  });

  it('returns false when registration cannot fetch secrets', async () => {
    mockFetchResolvedOnce(createResponse({ content: '{}' }));

    await expect(registerDevice('https://tenant.example.com/')).resolves.toBe(false);
    expect(setActiveProfile).not.toHaveBeenCalled();
  });

  it('stores clone data and persists named profiles', async () => {
    await expect(registerDeviceAndUserByClone({
      type: 'clone',
      Type: 'clone',
      publicId: 'public',
      privateId: 'private',
      secret: 'secret',
      credentialSecret: 'credential',
      email: 'user@example.com',
      phone: '123',
      privacyPolicy: true,
      url: 'https://clone.example.com/',
    })).resolves.toBe(true);

    expect(setActiveProfile).toHaveBeenCalledWith(expect.objectContaining({
      email: 'user@example.com',
      url: 'https://clone.example.com',
    }));
    expect(saveProfile).toHaveBeenCalled();
  });

  it('returns false when clone registration throws', async () => {
    (setActiveProfile as jest.Mock).mockRejectedValueOnce(new Error('boom'));

    await expect(registerDeviceAndUserByClone({
      type: 'clone',
      Type: 'clone',
      publicId: 'public',
      privateId: 'private',
      secret: 'secret',
      credentialSecret: 'credential',
      email: '',
      phone: '',
      privacyPolicy: false,
    })).resolves.toBe(false);
  });

  it('stores unnamed clone profiles without persisting them and uses the default url', async () => {
    await expect(registerDeviceAndUserByClone({
      type: 'clone',
      Type: 'clone',
      publicId: 'public',
      privateId: 'private',
      secret: 'secret',
      credentialSecret: 'credential',
      email: '',
      phone: '',
      privacyPolicy: false,
    })).resolves.toBe(true);

    expect(setActiveProfile).toHaveBeenCalledWith(expect.objectContaining({
      url: 'http://82.165.219.9:8085',
    }));
  });

  it('falls back to empty clone fields for nullish values', async () => {
    await expect(registerDeviceAndUserByClone({
      type: 'clone',
      Type: 'clone',
      publicId: 'public',
      privateId: 'private',
      secret: 'secret',
      credentialSecret: 'credential',
      email: null,
      phone: null,
      privacyPolicy: 0,
      url: null,
    } as never)).resolves.toBe(true);

    expect(setActiveProfile).toHaveBeenCalledWith(expect.objectContaining({
      email: '',
      phone: '',
      privacyPolicy: false,
      url: 'http://82.165.219.9:8085',
    }));
    expect(saveProfile).not.toHaveBeenCalled();
  });
});
