import React from 'react';
import { Pressable, Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

const mockDeactivateButtons = jest.fn();
const mockProcessQRData = jest.fn();
let mockEnableButtons = false;
let mockMessageVisible = false;
let mockAccessAllowed = false;
let mockAutoQRScannerProps: any;
let mockCloneProps: any;

jest.mock('../Cards/Cards', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockCards({ type, action }) {
    return React.createElement(Text, { onPress: action }, type);
  };
});

jest.mock('../AutoQRScanner/AutoQRScanner', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockAutoQRScanner(props) {
    mockAutoQRScannerProps = props;
    return React.createElement(Text, null, 'AUTO_QR_SCANNER');
  };
});

jest.mock('../UserRegistration/UserRegistration', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockUserRegistration() {
    return React.createElement(Text, null, 'USER_REGISTRATION_VIEW');
  };
});

jest.mock('../Clone/Clone', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockClone(props) {
    mockCloneProps = props;
    return React.createElement(Text, null, 'CLONE_VIEW');
  };
});

jest.mock('../../services/HandleQRScan', () => ({
  handleQRScan: jest.fn(),
}));

jest.mock('../../services/Firebase', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (setMessageState, setAccessState, setButtonsEnabled) => {
      React.useEffect(() => {
        if (mockMessageVisible) {
          setMessageState(true);
        }
        if (setAccessState) {
          setAccessState(mockAccessAllowed);
        }
        if (mockEnableButtons) {
          setButtonsEnabled(true);
        }
      }, [setAccessState, setButtonsEnabled, setMessageState]);

      return {
        deactivateButtons: mockDeactivateButtons,
        processQRData: mockProcessQRData,
      };
    },
  };
});

jest.mock('../../services/DeviceStore', () => ({
  getActiveProfile: jest.fn(),
  getProfiles: jest.fn(),
  setActiveProfileByEmail: jest.fn(),
}));

import Entry from '../Entry';
import { handleQRScan } from '../../services/HandleQRScan';
import { getActiveProfile, getProfiles, setActiveProfileByEmail } from '../../services/DeviceStore';

const flushPromises = () => new Promise(resolve => setImmediate(resolve));

describe('Entry workflow', () => {
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
    mockEnableButtons = false;
    mockMessageVisible = false;
    mockAccessAllowed = false;
    mockDeactivateButtons.mockClear();
    mockProcessQRData.mockClear();
    (getProfiles as jest.Mock).mockResolvedValue([
      { email: 'first@example.com' },
      { email: 'second@example.com' },
    ]);
    (getActiveProfile as jest.Mock).mockResolvedValue({ email: 'first@example.com' });
    (setActiveProfileByEmail as jest.Mock).mockResolvedValue({ email: 'second@example.com' });
  });

  it('loads profiles, allows selection, and handles scanner results', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<Entry setValidUser={jest.fn()} />);
      await flushPromises();
    });

    const textValues = renderer!.root.findAllByType(Text).map(node => node.props.children);
    expect(textValues).toContain('first@example.com');
    invokePressableStyles(renderer!);

    await act(async () => {
      getPressables(renderer!)[0].props.onPress();
      await flushPromises();
    });
    await act(async () => {
      getPressables(renderer!)[2].props.onPress();
      await flushPromises();
    });
    expect(setActiveProfileByEmail).toHaveBeenCalledWith('second@example.com');

    await act(async () => {
      renderer!.root.findAllByType(Text).find(node => node.props.onPress && node.props.children === 'scanCode')!.props.onPress();
      await flushPromises();
    });
    expect(renderer!.root.findAllByType(Text).map(node => node.props.children)).toContain('AUTO_QR_SCANNER');

    await act(async () => {
      await mockAutoQRScannerProps.onResult('qr-payload');
      await flushPromises();
    });
    expect(handleQRScan).toHaveBeenCalledWith('qr-payload');
    expect(mockDeactivateButtons).toHaveBeenCalled();

    await act(async () => {
      renderer!.unmount();
    });
  });

  it('switches to reset and clone views, and handles allow/decline actions', async () => {
    mockEnableButtons = true;
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<Entry setValidUser={jest.fn()} />);
      await flushPromises();
    });

    await act(async () => {
      renderer!.root.findAllByType(Text).find(node => node.props.onPress && node.props.children === 'reset')!.props.onPress();
      await flushPromises();
    });
    expect(renderer!.root.findAllByType(Text).map(node => node.props.children)).toContain('USER_REGISTRATION_VIEW');

    let cloneRenderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      cloneRenderer = ReactTestRenderer.create(<Entry setValidUser={jest.fn()} />);
      await flushPromises();
    });
    await act(async () => {
      cloneRenderer!.root.findAll(node => node.type === Text && node.props.onPress && node.props.children === 'clone')[0].props.onPress();
      await flushPromises();
    });
    expect(cloneRenderer!.root.findAllByType(Text).map(node => node.props.children)).toContain('CLONE_VIEW');
    expect(mockCloneProps).toBeDefined();

    let actionRenderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      actionRenderer = ReactTestRenderer.create(<Entry setValidUser={jest.fn()} />);
      await flushPromises();
    });
    await act(async () => {
      actionRenderer!.root.findAllByType(Text).find(node => node.props.onPress && node.props.children === 'biometric')!.props.onPress();
      actionRenderer!.root.findAllByType(Text).find(node => node.props.onPress && node.props.children === 'stop')!.props.onPress();
      await flushPromises();
    });

    expect(mockProcessQRData).toHaveBeenCalledTimes(1);
    expect(mockDeactivateButtons).toHaveBeenCalled();

    await act(async () => {
      renderer!.unmount();
      cloneRenderer!.unmount();
      actionRenderer!.unmount();
    });
  });

  it('ignores biometric buttons when notifications are disabled', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<Entry setValidUser={jest.fn()} />);
      await flushPromises();
    });

    await act(async () => {
      renderer!.root.findAllByType(Text).find(node => node.props.onPress && node.props.children === 'biometric')!.props.onPress();
      renderer!.root.findAllByType(Text).find(node => node.props.onPress && node.props.children === 'stop')!.props.onPress();
      await flushPromises();
    });

    expect(mockProcessQRData).not.toHaveBeenCalled();
    expect(mockDeactivateButtons).not.toHaveBeenCalled();
  });

  it('keeps the current profile when profile selection fails', async () => {
    (setActiveProfileByEmail as jest.Mock).mockResolvedValueOnce(null);

    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<Entry setValidUser={jest.fn()} />);
      await flushPromises();
    });

    await act(async () => {
      getPressables(renderer!)[0].props.onPress();
      await flushPromises();
    });
    await act(async () => {
      getPressables(renderer!)[2].props.onPress();
      await flushPromises();
    });

    const texts = renderer!.root.findAllByType(Text).map(node => node.props.children);
    expect(texts).toContain('first@example.com');
  });

  it('deactivates buttons when QR handling throws', async () => {
    (handleQRScan as jest.Mock).mockRejectedValueOnce(new Error('scan-failed'));

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<Entry setValidUser={jest.fn()} />);
      await flushPromises();
    });

    await act(async () => {
      renderer!.root.findAllByType(Text).find(node => node.props.onPress && node.props.children === 'scanCode')!.props.onPress();
      await flushPromises();
    });

    await act(async () => {
      await mockAutoQRScannerProps.onResult('bad-qr');
      await flushPromises();
    });

    expect(mockDeactivateButtons).toHaveBeenCalled();
  });

  it('renders the notification state panel and placeholder when no profile is active', async () => {
    mockEnableButtons = true;
    mockMessageVisible = true;
    mockAccessAllowed = true;
    (getProfiles as jest.Mock).mockResolvedValueOnce([]);
    (getActiveProfile as jest.Mock).mockResolvedValueOnce(null);

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<Entry setValidUser={jest.fn()} />);
      await flushPromises();
    });

    const texts = renderer!.root.findAllByType(Text).map(node => node.props.children).flat();
    expect(texts).toContain('Firebase Notification Active');
    expect(texts).toContain('Access State: ');
    expect(texts).toContain('Allowed');
    expect(texts).toContain('Buttons: ');
    expect(texts).toContain('Enabled');
  });

  it('evaluates dropdown item styles when the selector is opened', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<Entry setValidUser={jest.fn()} />);
      await flushPromises();
    });

    await act(async () => {
      getPressables(renderer!)[0].props.onPress();
      await flushPromises();
    });

    invokePressableStyles(renderer!);
    expect(renderer!.root.findAll(node => typeof node.props.style === 'function').length).toBeGreaterThan(0);
  });

  it('shows the profile placeholder and denied-disabled status state', async () => {
    mockEnableButtons = false;
    mockMessageVisible = true;
    mockAccessAllowed = false;
    (getProfiles as jest.Mock).mockResolvedValueOnce([{ email: 'first@example.com' }]);
    (getActiveProfile as jest.Mock).mockResolvedValueOnce(null);

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<Entry setValidUser={jest.fn()} />);
      await flushPromises();
    });

    const texts = renderer!.root.findAllByType(Text).map(node => node.props.children).flat();
    expect(texts).toContain('registration.profileSelectorPlaceholder');
    expect(texts).toContain('Denied');
    expect(texts).toContain('Disabled');
  });
});
