/**
 * @format
 */

import React from 'react';
import { Alert, Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

jest.mock('../src/screen/main/Main', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockMain() {
    return React.createElement(Text, null, 'MAIN_SCREEN');
  };
});

jest.mock('../src/services/StrongBiometricService', () => ({
  __esModule: true,
  default: {
    getCapabilities: jest.fn(),
    isAvailable: jest.fn(),
    authenticate: jest.fn(),
  },
}));

import App from '../App';
import StrongBiometricService from '../src/services/StrongBiometricService';

const flushPromises = () => new Promise(resolve => setImmediate(resolve));

describe('App biometric gate', () => {
  const alertSpy = jest.spyOn(Alert, 'alert');

  beforeEach(() => {
    alertSpy.mockClear();
  });

  it('renders the main screen after automatic biometric success', async () => {
    (StrongBiometricService.getCapabilities as jest.Mock).mockResolvedValue({
      isStrongBiometric: true,
      biometryType: 'TouchID',
    });
    (StrongBiometricService.isAvailable as jest.Mock).mockResolvedValue(true);
    (StrongBiometricService.authenticate as jest.Mock).mockResolvedValue({
      success: true,
      biometryType: 'TouchID',
    });

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<App />);
      await flushPromises();
    });

    expect(renderer!.root.findByType(Text).props.children).toBe('MAIN_SCREEN');
  });

  it('renders the denied state when strong biometrics are unavailable', async () => {
    (StrongBiometricService.getCapabilities as jest.Mock).mockResolvedValue({
      isStrongBiometric: false,
      biometryType: null,
    });
    (StrongBiometricService.isAvailable as jest.Mock).mockResolvedValue(false);
    (StrongBiometricService.authenticate as jest.Mock).mockResolvedValue({ success: false });

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<App />);
      await flushPromises();
    });

    const texts = renderer!.root.findAllByType(Text).map(node => node.props.children).flat();
    expect(texts).toContain('DEVICE NOT COMPATIBLE');
  });

  it('shows an alert when biometric authentication fails', async () => {
    (StrongBiometricService.getCapabilities as jest.Mock).mockResolvedValue({
      isStrongBiometric: true,
      biometryType: 'TouchID',
    });
    (StrongBiometricService.isAvailable as jest.Mock).mockResolvedValue(true);
    (StrongBiometricService.authenticate as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Authentication failed',
    });

    await act(async () => {
      ReactTestRenderer.create(<App />);
      await flushPromises();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Strong Biometric Authentication Failed',
      'Authentication failed',
      expect.any(Array),
    );
  });

  it('uses the default biometric failure message when no error is returned', async () => {
    (StrongBiometricService.getCapabilities as jest.Mock).mockResolvedValue({
      isStrongBiometric: true,
      biometryType: 'TouchID',
    });
    (StrongBiometricService.isAvailable as jest.Mock).mockResolvedValue(true);
    (StrongBiometricService.authenticate as jest.Mock).mockResolvedValue({
      success: false,
    });

    await act(async () => {
      ReactTestRenderer.create(<App />);
      await flushPromises();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Strong Biometric Authentication Failed',
      'Strong biometric authentication failed',
      expect.any(Array),
    );
  });

  it('uses the default biometric failure message when no error is returned', async () => {
    (StrongBiometricService.getCapabilities as jest.Mock).mockResolvedValue({
      isStrongBiometric: true,
      biometryType: 'TouchID',
    });
    (StrongBiometricService.isAvailable as jest.Mock).mockResolvedValue(true);
    (StrongBiometricService.authenticate as jest.Mock).mockResolvedValue({
      success: false,
    });

    await act(async () => {
      ReactTestRenderer.create(<App />);
      await flushPromises();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Strong Biometric Authentication Failed',
      'Strong biometric authentication failed',
      expect.any(Array),
    );
  });

  it('retries and can cancel after a biometric failure', async () => {
    (StrongBiometricService.getCapabilities as jest.Mock).mockResolvedValue({
      isStrongBiometric: true,
      biometryType: 'TouchID',
    });
    (StrongBiometricService.isAvailable as jest.Mock).mockResolvedValue(true);
    (StrongBiometricService.authenticate as jest.Mock)
      .mockResolvedValueOnce({ success: false, error: 'Try again' })
      .mockResolvedValueOnce({ success: true, biometryType: 'TouchID' });

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<App />);
      await flushPromises();
    });

    const actions = alertSpy.mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>;
    expect(renderer!.root.findAllByType(Text).map(node => node.props.children).flat()).toContain(
      'Authenticating with Strong Biometric...',
    );

    await act(async () => {
      actions[0].onPress?.();
      await flushPromises();
    });

    expect(StrongBiometricService.authenticate).toHaveBeenCalledTimes(2);
    expect(renderer!.root.findByType(Text).props.children).toBe('MAIN_SCREEN');
  });

  it('returns to the menu when cancel is pressed after a biometric failure', async () => {
    (StrongBiometricService.getCapabilities as jest.Mock).mockResolvedValue({
      isStrongBiometric: true,
      biometryType: 'TouchID',
    });
    (StrongBiometricService.isAvailable as jest.Mock).mockResolvedValue(true);
    (StrongBiometricService.authenticate as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Authentication failed',
    });

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<App />);
      await flushPromises();
    });

    const actions = alertSpy.mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>;

    await act(async () => {
      actions[1].onPress?.();
      await flushPromises();
    });

    const texts = renderer!.root.findAllByType(Text).map(node => node.props.children).flat();
    expect(texts).toContain('STRONG BIOMETRIC ONLY');
    expect(texts).not.toContain('Authenticating with Strong Biometric...');
  });

  it('renders a capability error when the capability check throws', async () => {
    (StrongBiometricService.getCapabilities as jest.Mock).mockRejectedValue(new Error('boom'));
    (StrongBiometricService.isAvailable as jest.Mock).mockResolvedValue(true);

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<App />);
      await flushPromises();
    });

    const texts = renderer!.root.findAllByType(Text).map(node => node.props.children).flat();
    expect(texts).toContain('Strong Biometric Check Failed');
  });

  it('shows an authentication error alert when authenticate throws', async () => {
    (StrongBiometricService.getCapabilities as jest.Mock).mockResolvedValue({
      isStrongBiometric: true,
      biometryType: 'TouchID',
    });
    (StrongBiometricService.isAvailable as jest.Mock).mockResolvedValue(true);
    (StrongBiometricService.authenticate as jest.Mock).mockRejectedValue(new Error('crash'));

    await act(async () => {
      ReactTestRenderer.create(<App />);
      await flushPromises();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Authentication Error',
      'An error occurred during automatic strong biometric authentication',
      expect.any(Array),
    );
  });

  it('retries after an authentication error alert', async () => {
    (StrongBiometricService.getCapabilities as jest.Mock).mockResolvedValue({
      isStrongBiometric: true,
      biometryType: 'TouchID',
    });
    (StrongBiometricService.isAvailable as jest.Mock).mockResolvedValue(true);
    (StrongBiometricService.authenticate as jest.Mock)
      .mockRejectedValueOnce(new Error('prompt crash'))
      .mockResolvedValueOnce({ success: true, biometryType: 'TouchID' });

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<App />);
      await flushPromises();
    });

    const actions = alertSpy.mock.calls[0][2] as Array<{ onPress?: () => void }>;

    await act(async () => {
      actions[0].onPress?.();
      await flushPromises();
    });

    expect(StrongBiometricService.authenticate).toHaveBeenCalledTimes(2);
    expect(renderer!.root.findByType(Text).props.children).toBe('MAIN_SCREEN');
  });

  it('cancels after an authentication error alert', async () => {
    (StrongBiometricService.getCapabilities as jest.Mock).mockResolvedValue({
      isStrongBiometric: true,
      biometryType: 'TouchID',
    });
    (StrongBiometricService.isAvailable as jest.Mock).mockResolvedValue(true);
    (StrongBiometricService.authenticate as jest.Mock).mockRejectedValue(new Error('prompt crash'));

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<App />);
      await flushPromises();
    });

    const actions = alertSpy.mock.calls[0][2] as Array<{ onPress?: () => void }>;

    await act(async () => {
      actions[1].onPress?.();
      await flushPromises();
    });

    const texts = renderer!.root.findAllByType(Text).map(node => node.props.children).flat();
    expect(texts).toContain('STRONG BIOMETRIC ONLY');
  });

  it('renders the fallback error state when no auth methods are added', async () => {
    const originalPush = Array.prototype.push;
    const pushSpy = jest.spyOn(Array.prototype, 'push').mockImplementation(function (...items: unknown[]) {
      if (
        items.length === 1 &&
        items[0] &&
        typeof items[0] === 'object' &&
        'securityLevel' in (items[0] as Record<string, unknown>) &&
        'service' in (items[0] as Record<string, unknown>)
      ) {
        return this.length;
      }

      return originalPush.apply(this, items as never[]);
    });

    (StrongBiometricService.getCapabilities as jest.Mock).mockResolvedValue({
      isStrongBiometric: false,
      biometryType: null,
    });
    (StrongBiometricService.isAvailable as jest.Mock).mockResolvedValue(false);

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<App />);
      await flushPromises();
    });

    const texts = renderer!.root.findAllByType(Text).map(node => node.props.children).flat();
    expect(texts).toContain(
      'Strong Biometric authentication is required but not available on this device',
    );
    expect(texts).toContain(
      'Please ensure your device supports fingerprint/TouchID authentication with hardware security.',
    );

    pushSpy.mockRestore();
  });

});
