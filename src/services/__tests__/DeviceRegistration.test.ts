jest.mock('../HTTP/registerDevice', () => ({
  registerDevice: jest.fn(),
}));

jest.mock('../DeviceStore', () => ({
  getActiveProfile: jest.fn(),
}));

import DeviceRegistration from '../DeviceRegistration';
import { registerDevice } from '../HTTP/registerDevice';
import { getActiveProfile } from '../DeviceStore';

describe('DeviceRegistration', () => {
  it('reports complete registrations correctly', async () => {
    (getActiveProfile as jest.Mock).mockResolvedValue({
      publicId: 'public',
      privateId: 'private',
      secret: 'secret',
      credentialSecret: 'credential',
    });

    await expect(DeviceRegistration.checkDeviceRegistrationStoredKeys()).resolves.toBe(true);
  });

  it('reports incomplete registrations correctly', async () => {
    (getActiveProfile as jest.Mock).mockResolvedValue({
      publicId: 'public',
      privateId: '',
      secret: 'secret',
      credentialSecret: 'credential',
    });

    await expect(DeviceRegistration.checkDeviceRegistrationStoredKeys()).resolves.toBe(false);
  });

  it('registers the device when secrets are missing', async () => {
    (getActiveProfile as jest.Mock).mockResolvedValue(null);

    await DeviceRegistration.initialize();

    expect(registerDevice).toHaveBeenCalledTimes(1);
  });

  it('does not register the device when secrets already exist', async () => {
    (getActiveProfile as jest.Mock).mockResolvedValue({
      publicId: 'public',
      privateId: 'private',
      secret: 'secret',
      credentialSecret: 'credential',
    });

    await DeviceRegistration.initialize();

    expect(registerDevice).not.toHaveBeenCalled();
  });
});
