import React from 'react';
import { Switch, Text, TextInput } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

jest.mock('../../../services/Encrypter', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../services/HTTP/registerUser', () => ({
  registerUser: jest.fn(),
}));

jest.mock('../../../services/HTTP/registerDevice', () => ({
  requestDeviceRegistration: jest.fn(),
}));

jest.mock('../../../services/Firebase', () => ({
  getFcmToken: jest.fn(),
}));

jest.mock('../../../services/DeviceStore', () => ({
  getActiveProfile: jest.fn(),
  normalizeApiBaseUrl: jest.fn(url => url.trim().replace(/\/+$/, '')),
  saveProfile: jest.fn(),
}));

import getEncryptedIdentification from '../../../services/Encrypter';
import { requestDeviceRegistration } from '../../../services/HTTP/registerDevice';
import { registerUser } from '../../../services/HTTP/registerUser';
import { getFcmToken } from '../../../services/Firebase';
import * as DeviceStore from '../../../services/DeviceStore';
import config from '../../../config/environment';
import UserRegistration from '../UserRegistration';

const flushPromises = () => new Promise(resolve => setImmediate(resolve));

describe('UserRegistration', () => {
  const pressButton = (renderer: ReactTestRenderer.ReactTestRenderer, label: string) => {
    const textNode = renderer.root.findAllByType(Text).find(node => node.props.children === label);
    let currentNode: any = textNode;

    while (currentNode && typeof currentNode.props?.onPress !== 'function') {
      currentNode = currentNode.parent;
    }

    currentNode.props.onPress();
  };

  const getPressables = (renderer: ReactTestRenderer.ReactTestRenderer) =>
    renderer.root.findAll(node => typeof node.props.onPress === 'function');

  const invokePressableStyles = (renderer: ReactTestRenderer.ReactTestRenderer) => {
    renderer.root
      .findAll(node => typeof node.props.style === 'function')
      .forEach(node => {
        node.props.style({ pressed: true });
        node.props.style({ pressed: false });
      });
  };

  beforeEach(() => {
    (DeviceStore.getActiveProfile as jest.Mock).mockResolvedValue({
      email: 'user@example.com',
      phone: '123',
      privacyPolicy: true,
      publicId: 'public-id',
      privateId: 'private-id',
      secret: 'secret',
      credentialSecret: 'credential-secret',
      url: 'https://tenant.example.com',
    });
    (requestDeviceRegistration as jest.Mock).mockResolvedValue({
      publicId: 'new-public',
      privateId: 'new-private',
      secret: 'new-secret',
      credentialSecret: 'new-credential',
    });
    (getEncryptedIdentification as jest.Mock).mockResolvedValue({
      publicId: 'public-id',
      privateId: 'encrypted-private',
      email: '',
      phone: '',
      privacyPolicy: false,
      fcmToken: '',
      credentialSecret: 'credential-secret',
    });
    (getFcmToken as jest.Mock).mockResolvedValue('fcm-token');
    (registerUser as jest.Mock).mockResolvedValue(true);
    (DeviceStore.saveProfile as jest.Mock).mockImplementation(async profile => profile);
  });

  it('loads the active profile and submits the existing profile', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<UserRegistration setValidUser={jest.fn()} />);
      await flushPromises();
    });

    const inputs = renderer!.root.findAllByType(TextInput);
    expect(inputs[0].props.value).toBe('user@example.com');
    expect(inputs[1].props.value).toBe('123');
    invokePressableStyles(renderer!);

    await act(async () => {
      pressButton(renderer!, 'registration.submit');
      await flushPromises();
    });

    expect(registerUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'user@example.com', phone: '123' }),
      'https://tenant.example.com',
    );
    await act(async () => {
      renderer!.unmount();
    });
  });

  it('creates a draft profile from a new url', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<UserRegistration setValidUser={jest.fn()} setView={jest.fn()} />);
      await flushPromises();
    });

    await act(async () => {
      getPressables(renderer!).at(-1)!.props.onPress();
      await flushPromises();
    });

    expect(renderer!.root.findAllByType(TextInput)).toHaveLength(1);

    await act(async () => {
      renderer!.root.findByType(TextInput).props.onChangeText(' https://new-tenant.example.com/ ');
      await flushPromises();
    });
    await act(async () => {
      getPressables(renderer!).at(-1)!.props.onPress();
      await flushPromises();
    });

    expect(requestDeviceRegistration).toHaveBeenCalledWith('https://new-tenant.example.com/');
    expect(renderer!.root.findAllByType(TextInput)).toHaveLength(2);

    await act(async () => {
      renderer!.unmount();
    });
  });

  it('returns from draft details back to the url step', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<UserRegistration setValidUser={jest.fn()} />);
      await flushPromises();
    });

    await act(async () => {
      pressButton(renderer!, 'registration.addProfile');
      await flushPromises();
    });

    await act(async () => {
      renderer!.root.findByType(TextInput).props.onChangeText('https://draft.example.com');
      await flushPromises();
    });

    await act(async () => {
      pressButton(renderer!, 'registration.next');
      await flushPromises();
    });

    expect(renderer!.root.findAllByType(TextInput)).toHaveLength(2);
    invokePressableStyles(renderer!);

    await act(async () => {
      pressButton(renderer!, 'registration.back');
      await flushPromises();
    });

    expect(renderer!.root.findAllByType(TextInput)).toHaveLength(1);
  });

  it('returns to the active profile when backing out of the url step', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<UserRegistration setValidUser={jest.fn()} />);
      await flushPromises();
    });

    await act(async () => {
      pressButton(renderer!, 'registration.addProfile');
      await flushPromises();
    });

    expect(renderer!.root.findAllByType(TextInput)).toHaveLength(1);

    await act(async () => {
      pressButton(renderer!, 'registration.back');
      await flushPromises();
    });

    const inputs = renderer!.root.findAllByType(TextInput);
    expect(inputs[0].props.value).toBe('user@example.com');
    expect(inputs[1].props.value).toBe('123');
    expect(requestDeviceRegistration).not.toHaveBeenCalled();
  });

  it('does not create a draft profile for an empty url', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<UserRegistration setValidUser={jest.fn()} />);
      await flushPromises();
    });

    await act(async () => {
      pressButton(renderer!, 'registration.addProfile');
      await flushPromises();
    });

    await act(async () => {
      renderer!.root.findByType(TextInput).props.onChangeText('   ');
      await flushPromises();
    });

    await act(async () => {
      pressButton(renderer!, 'registration.next');
      await flushPromises();
    });

    expect(requestDeviceRegistration).not.toHaveBeenCalled();
    expect(renderer!.root.findAllByType(TextInput)).toHaveLength(1);
  });

  it('stays on the url step when device registration fails', async () => {
    (requestDeviceRegistration as jest.Mock).mockResolvedValueOnce(null);

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<UserRegistration setValidUser={jest.fn()} />);
      await flushPromises();
    });

    await act(async () => {
      pressButton(renderer!, 'registration.addProfile');
      await flushPromises();
    });

    await act(async () => {
      pressButton(renderer!, 'registration.next');
      await flushPromises();
    });

    expect(renderer!.root.findAllByType(TextInput)).toHaveLength(1);
  });

  it('does not submit when required fields are incomplete', async () => {
    (DeviceStore.getActiveProfile as jest.Mock).mockResolvedValueOnce(null);

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<UserRegistration setValidUser={jest.fn()} />);
      await flushPromises();
    });

    const [emailInput, phoneInput] = renderer!.root.findAllByType(TextInput);
    const acceptSwitch = renderer!.root.findByType(Switch);

    await act(async () => {
      emailInput.props.onChangeText('');
      phoneInput.props.onChangeText('');
      acceptSwitch.props.onValueChange(false);
      pressButton(renderer!, 'registration.submit');
      await flushPromises();
    });

    expect(getEncryptedIdentification).not.toHaveBeenCalled();
    expect(registerUser).not.toHaveBeenCalled();
  });

  it('does not save the profile when registration fails', async () => {
    (registerUser as jest.Mock).mockResolvedValueOnce(false);

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<UserRegistration setValidUser={jest.fn()} />);
      await flushPromises();
    });

    await act(async () => {
      pressButton(renderer!, 'registration.submit');
      await flushPromises();
    });

    expect(DeviceStore.saveProfile).not.toHaveBeenCalled();
  });

  it('handles submit errors without saving the profile', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    (getEncryptedIdentification as jest.Mock).mockRejectedValueOnce(new Error('encrypt-failed'));

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<UserRegistration setValidUser={jest.fn()} />);
      await flushPromises();
    });

    await act(async () => {
      pressButton(renderer!, 'registration.submit');
      await flushPromises();
    });

    expect(DeviceStore.saveProfile).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('does not submit before an active profile snapshot exists', async () => {
    (DeviceStore.getActiveProfile as jest.Mock).mockImplementationOnce(
      () => new Promise(() => undefined),
    );

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<UserRegistration setValidUser={jest.fn()} />);
      await Promise.resolve();
    });

    const [emailInput, phoneInput] = renderer!.root.findAllByType(TextInput);
    const acceptSwitch = renderer!.root.findByType(Switch);

    await act(async () => {
      emailInput.props.onChangeText('early@example.com');
      phoneInput.props.onChangeText('111');
      acceptSwitch.props.onValueChange(true);
      pressButton(renderer!, 'registration.submit');
      await flushPromises();
    });

    expect(getEncryptedIdentification).not.toHaveBeenCalled();
    expect(registerUser).not.toHaveBeenCalled();
  });

  it('resets to an empty fallback profile when backing out before the active profile loads', async () => {
    (DeviceStore.getActiveProfile as jest.Mock).mockImplementationOnce(
      () => new Promise(() => undefined),
    );

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<UserRegistration setValidUser={jest.fn()} />);
      await Promise.resolve();
    });

    await act(async () => {
      pressButton(renderer!, 'registration.addProfile');
      await flushPromises();
    });

    await act(async () => {
      pressButton(renderer!, 'registration.back');
      await flushPromises();
    });

    const [emailInput, phoneInput] = renderer!.root.findAllByType(TextInput);
    const texts = renderer!.root.findAllByType(Text).map(node => node.props.children).flat();

    expect(emailInput.props.value).toBe('');
    expect(phoneInput.props.value).toBe('');
    expect(renderer!.root.findByType(Switch).props.value).toBe(false);
    expect(texts).toContain(config.API_BASE);
  });

  it('resets null profile fields back to safe defaults when returning from the url step', async () => {
    (DeviceStore.getActiveProfile as jest.Mock).mockResolvedValueOnce({
      email: null,
      phone: null,
      privacyPolicy: null,
      publicId: 'public-id',
      privateId: 'private-id',
      secret: 'secret',
      credentialSecret: 'credential-secret',
      url: null,
    });

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<UserRegistration setValidUser={jest.fn()} />);
      await flushPromises();
    });

    await act(async () => {
      pressButton(renderer!, 'registration.addProfile');
      await flushPromises();
    });

    await act(async () => {
      pressButton(renderer!, 'registration.back');
      await flushPromises();
    });

    const [emailInput, phoneInput] = renderer!.root.findAllByType(TextInput);
    const texts = renderer!.root.findAllByType(Text).map(node => node.props.children).flat();

    expect(emailInput.props.value).toBe('');
    expect(phoneInput.props.value).toBe('');
    expect(renderer!.root.findByType(Switch).props.value).toBe(false);
    expect(texts).toContain(config.API_BASE);
  });

  it('does not submit when form data is valid but no source profile exists yet', async () => {
    (DeviceStore.getActiveProfile as jest.Mock).mockImplementationOnce(
      () => new Promise(() => undefined),
    );

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<UserRegistration setValidUser={jest.fn()} />);
      await Promise.resolve();
    });

    const [emailInput, phoneInput] = renderer!.root.findAllByType(TextInput);
    const acceptSwitch = renderer!.root.findByType(Switch);

    await act(async () => {
      emailInput.props.onChangeText('source-missing@example.com');
      phoneInput.props.onChangeText('777');
      acceptSwitch.props.onValueChange(true);
      await flushPromises();
    });

    await act(async () => {
      pressButton(renderer!, 'registration.submit');
      await flushPromises();
    });

    expect(getEncryptedIdentification).not.toHaveBeenCalled();
    expect(registerUser).not.toHaveBeenCalled();
  });

  it('falls back to empty profile fields when the active profile has missing values', async () => {
    (DeviceStore.getActiveProfile as jest.Mock).mockResolvedValueOnce({
      email: null,
      phone: null,
      privacyPolicy: null,
      publicId: 'public-id',
      privateId: 'private-id',
      secret: 'secret',
      credentialSecret: 'credential-secret',
      url: null,
    });

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<UserRegistration setValidUser={jest.fn()} />);
      await flushPromises();
    });

    const [emailInput, phoneInput] = renderer!.root.findAllByType(TextInput);
    expect(emailInput.props.value).toBe('');
    expect(phoneInput.props.value).toBe('');
    expect(renderer!.root.findByType(Switch).props.value).toBe(false);
  });

  it('evaluates url-step pressable styles', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<UserRegistration setValidUser={jest.fn()} />);
      await flushPromises();
    });

    await act(async () => {
      pressButton(renderer!, 'registration.addProfile');
      await flushPromises();
    });

    invokePressableStyles(renderer!);
    expect(renderer!.root.findAll(node => typeof node.props.style === 'function').length).toBeGreaterThan(0);
  });

  it('shows the loading label while creating a draft profile', async () => {
    let resolveRequest: (value: {
      publicId: string;
      privateId: string;
      secret: string;
      credentialSecret: string;
    }) => void;

    (requestDeviceRegistration as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => {
        resolveRequest = resolve;
      }),
    );

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<UserRegistration setValidUser={jest.fn()} />);
      await flushPromises();
    });

    await act(async () => {
      pressButton(renderer!, 'registration.addProfile');
      await flushPromises();
    });

    await act(async () => {
      pressButton(renderer!, 'registration.next');
      await Promise.resolve();
    });

    expect(renderer!.root.findAllByType(Text).map(node => node.props.children).flat()).toContain(
      'registration.loading',
    );

    await act(async () => {
      resolveRequest!({
        publicId: 'public',
        privateId: 'private',
        secret: 'secret',
        credentialSecret: 'credential',
      });
      await flushPromises();
    });
  });

  it('shows the loading label while submitting the profile', async () => {
    let resolveRegistration: (value: boolean) => void;

    (registerUser as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => {
        resolveRegistration = resolve;
      }),
    );

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<UserRegistration setValidUser={jest.fn()} />);
      await flushPromises();
    });

    await act(async () => {
      pressButton(renderer!, 'registration.submit');
      await Promise.resolve();
    });

    expect(renderer!.root.findAllByType(Text).map(node => node.props.children).flat()).toContain(
      'registration.loading',
    );

    await act(async () => {
      resolveRegistration!(true);
      await flushPromises();
    });
  });

  it('submits a draft profile, activates it, and returns to the default view', async () => {
    const setValidUser = jest.fn();
    const setView = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <UserRegistration setValidUser={setValidUser} setView={setView} />,
      );
      await flushPromises();
    });

    await act(async () => {
      pressButton(renderer!, 'registration.addProfile');
      await flushPromises();
    });

    await act(async () => {
      renderer!.root.findByType(TextInput).props.onChangeText('https://fresh.example.com');
      await flushPromises();
    });

    await act(async () => {
      pressButton(renderer!, 'registration.next');
      await flushPromises();
    });

    const [emailInput, phoneInput] = renderer!.root.findAllByType(TextInput);
    const acceptSwitch = renderer!.root.findByType(Switch);

    await act(async () => {
      emailInput.props.onChangeText('new@example.com');
      phoneInput.props.onChangeText('55555');
      acceptSwitch.props.onValueChange(true);
      await flushPromises();
    });

    await act(async () => {
      pressButton(renderer!, 'registration.submit');
      await flushPromises();
    });

    expect(registerUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@example.com',
        phone: '55555',
        privacyPolicy: true,
        fcmToken: 'fcm-token',
      }),
      'https://fresh.example.com',
    );
    expect(DeviceStore.saveProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@example.com',
        phone: '55555',
        url: 'https://fresh.example.com',
      }),
      expect.objectContaining({ previousEmail: '', setActive: true }),
    );
    expect(setValidUser).toHaveBeenCalledWith(true);
    expect(setView).toHaveBeenCalledWith('default');
  });
});
