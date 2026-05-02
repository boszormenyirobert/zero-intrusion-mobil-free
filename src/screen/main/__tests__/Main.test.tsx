import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

jest.mock('../../../services/DeviceRegistration', () => ({
  __esModule: true,
  default: {
    initialize: jest.fn(),
  },
}));

jest.mock('../../../services/DeviceStore', () => ({
  getPrivacyPolicy: jest.fn(),
  getPrivateId: jest.fn(),
  getPublicId: jest.fn(),
  getSecret: jest.fn(),
  getEmail: jest.fn(),
  getPhone: jest.fn(),
  getCredentialSecret: jest.fn(),
}));

jest.mock('../../../services/Firebase', () => ({
  getFcmToken: jest.fn(),
}));

jest.mock('../../../component/Entry', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockEntry() {
    return React.createElement(Text, null, 'ENTRY_SCREEN');
  };
});

jest.mock('../../../component/UserRegistration/UserRegistration', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockUserRegistration() {
    return React.createElement(Text, null, 'USER_REGISTRATION');
  };
});

import Main from '../Main';
import DeviceRegistration from '../../../services/DeviceRegistration';
import {
  getCredentialSecret,
  getEmail,
  getPhone,
  getPrivacyPolicy,
  getPrivateId,
  getPublicId,
  getSecret,
} from '../../../services/DeviceStore';
import { getFcmToken } from '../../../services/Firebase';

const flushPromises = () => new Promise(resolve => setImmediate(resolve));

describe('Main screen bootstrap', () => {
  beforeEach(() => {
    (getFcmToken as jest.Mock).mockResolvedValue('fcm-token');
    (getPrivateId as jest.Mock).mockResolvedValue('private-id');
    (getPublicId as jest.Mock).mockResolvedValue('public-id');
    (getSecret as jest.Mock).mockResolvedValue('secret');
    (getCredentialSecret as jest.Mock).mockResolvedValue('credential-secret');
    (getEmail as jest.Mock).mockResolvedValue('user@example.com');
    (getPhone as jest.Mock).mockResolvedValue('123');
    (getPrivacyPolicy as jest.Mock).mockResolvedValue(true);
  });

  it('renders the default entry screen for a complete profile', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<Main />);
      await flushPromises();
    });

    const texts = renderer!.root.findAllByType(Text).map(node => node.props.children);
    expect(texts).toContain('ENTRY_SCREEN');
    expect(DeviceRegistration.initialize).toHaveBeenCalledTimes(1);
    expect(getFcmToken).toHaveBeenCalledTimes(2);
  });

  it('forces user registration when required data is missing', async () => {
    (getEmail as jest.Mock).mockResolvedValueOnce(null);

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<Main />);
      await flushPromises();
    });

    const texts = renderer!.root.findAllByType(Text).map(node => node.props.children);
    expect(texts).toContain('USER_REGISTRATION');
  });
});
