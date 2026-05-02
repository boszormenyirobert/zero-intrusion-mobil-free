import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

jest.mock('../../DeviceStore', () => ({
  getActiveProfile: jest.fn(),
}));

import Sender from '../Sender';
import { getActiveProfile } from '../../DeviceStore';

const flushPromises = () => new Promise(resolve => setImmediate(resolve));

describe('Clone Sender', () => {
  const getPressables = (renderer: ReactTestRenderer.ReactTestRenderer) =>
    renderer.root.findAll(node => typeof node.props.onPress === 'function');

  it('renders a QR payload for the active profile', async () => {
    (getActiveProfile as jest.Mock).mockResolvedValue({
      publicId: 'public-id',
      privateId: 'private-id',
      secret: 'secret',
      credentialSecret: 'credential-secret',
      email: 'user@example.com',
      phone: '123',
      privacyPolicy: true,
      url: 'https://tenant.example.com',
    });

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<Sender />);
      await flushPromises();
    });

    expect(renderer!.root.findByProps({ testID: 'qr-code' }).props.children).toContain('"type":"clone"');
  });

  it('supports navigating back and tolerates a missing profile', async () => {
    (getActiveProfile as jest.Mock).mockResolvedValue(null);
    const setView = jest.fn();

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<Sender setView={setView} />);
      await flushPromises();
    });

    expect(renderer!.root.findAllByType(Text).some(node => node.props.testID === 'qr-code')).toBe(false);
    getPressables(renderer!).at(-1)!.props.onPress();
    expect(setView).toHaveBeenCalledWith('default');

    const backButton = renderer!.root.findAll(node => typeof node.props.style === 'function').at(-1)!;
    backButton.props.style({ pressed: true });
    backButton.props.style({ pressed: false });
  });
});
