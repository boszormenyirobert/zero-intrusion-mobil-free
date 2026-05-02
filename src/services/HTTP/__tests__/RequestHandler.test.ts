jest.mock('../SystemHub/SystemHub', () => ({
  SystemHubRegistration: jest.fn(async value => value === 'registration'),
  SystemHubLogin: jest.fn(async value => value === 'login'),
  SystemHubSecureDevice: jest.fn(async value => value === 'secure'),
}));

jest.mock('../PasswordManager/Shared/Registration', () => ({
  Registration: jest.fn(async value => value === 'registration-shared'),
}));

jest.mock('../PasswordManager/Shared/Access', () => ({
  Access: jest.fn(async value => value === 'access'),
}));

jest.mock('../PasswordManager/Shared/Delete', () => ({
  Delete: jest.fn(async value => value === 'delete'),
}));

jest.mock('../registerDevice', () => ({
  registerDeviceAndUserByClone: jest.fn(async value => value === 'clone'),
}));

import { RequestHandler } from '../RequestHandler';
import { Access } from '../PasswordManager/Shared/Access';
import { Delete } from '../PasswordManager/Shared/Delete';
import { Registration } from '../PasswordManager/Shared/Registration';
import {
  SystemHubLogin,
  SystemHubRegistration,
  SystemHubSecureDevice,
} from '../SystemHub/SystemHub';
import { registerDeviceAndUserByClone } from '../registerDevice';

describe('RequestHandler', () => {
  it('delegates every request type to the mapped handler', async () => {
    const handler = new RequestHandler();

    await expect(handler.systemHubRegistration('registration' as never)).resolves.toBe(true);
    await expect(handler.systemHubLogin('login' as never)).resolves.toBe(true);
    await expect(handler.access('access' as never)).resolves.toBe(true);
    await expect(handler.sharedRegistration('registration-shared' as never)).resolves.toBe(true);
    await expect(handler.delete('delete' as never)).resolves.toBe(true);
    await expect(handler.clone('clone' as never)).resolves.toBe(true);
    await expect(handler.systemHubSecureDevice('secure' as never)).resolves.toBe(true);

    expect(SystemHubRegistration).toHaveBeenCalledWith('registration');
    expect(SystemHubLogin).toHaveBeenCalledWith('login');
    expect(Access).toHaveBeenCalledWith('access');
    expect(Registration).toHaveBeenCalledWith('registration-shared');
    expect(Delete).toHaveBeenCalledWith('delete');
    expect(registerDeviceAndUserByClone).toHaveBeenCalledWith('clone');
    expect(SystemHubSecureDevice).toHaveBeenCalledWith('secure');
  });
});
