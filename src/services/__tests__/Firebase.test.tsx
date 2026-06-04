import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../HandleQRScan', () => ({
  handleQRScan: jest.fn(),
}));

jest.mock('../HTTP/PasswordManager/Shared/Access', () => ({
  prepareAccess: jest.fn(async () => true),
  clearPreparedAccess: jest.fn(),
  markAccessConfirmed: jest.fn(),
  clearAccessConfirmation: jest.fn(),
}));

jest.mock('../Encrypter', () => ({
  decryptFromBase64: jest.fn(async value => `decrypted:${value}`),
}));

jest.mock('../DeviceStore', () => ({
  getCredentialSecret: jest.fn(async () => 'credential-secret'),
}));

jest.mock('../HTTP/PasswordManager/Shared/SilentCredentialDecrypt', () => ({
  decryptSilentNewUserCredentialPayload: jest.fn(async () => ({ decrypted: true })),
}));

import useFirebaseMessaging, {
  getFcmToken,
  registerFirebaseBackgroundHandler,
} from '../Firebase';
import { handleQRScan } from '../HandleQRScan';
import { decryptFromBase64 } from '../Encrypter';
import { prepareAccess } from '../HTTP/PasswordManager/Shared/Access';
import { decryptSilentNewUserCredentialPayload } from '../HTTP/PasswordManager/Shared/SilentCredentialDecrypt';

const messagingMock = messaging as unknown as {
  __mock: {
    state: {
      getToken: jest.Mock;
      unsubscribe: jest.Mock;
      backgroundHandler: ((message: any) => Promise<void>) | null;
    };
    triggerMessage: (remoteMessage: any) => Promise<void>;
    triggerBackgroundMessage: (remoteMessage: any) => Promise<void>;
  };
};

const flushPromises = () => Promise.resolve();

describe('Firebase messaging service', () => {
  afterEach(() => {
    if (jest.isMockFunction(global.setTimeout)) {
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });

  it('passes vault-read fallback type for opaque qrData strings', async () => {
    jest.useFakeTimers();

    const setMessageState = jest.fn();
    const setButtonsEnabled = jest.fn();
    let hookValue: ReturnType<typeof useFirebaseMessaging>;

    const Harness = () => {
      hookValue = useFirebaseMessaging(setMessageState, undefined, setButtonsEnabled);
      return null;
    };

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<Harness />);
      await flushPromises();
    });

    await act(async () => {
      await messagingMock.__mock.triggerMessage({
        data: {
          action: 'show_allow_close',
          type: 'vault-read',
          qrData: 'opaque-cache-key',
        },
      });
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await act(async () => {
      await hookValue!.processQRData();
    });

    expect(handleQRScan).toHaveBeenCalledWith('opaque-cache-key', 'vault-read');

    await act(async () => {
      renderer!.unmount();
    });

    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('returns cached FCM tokens when available', async () => {
    await AsyncStorage.setItem('fcm_token', 'cached-token');

    await expect(getFcmToken()).resolves.toBe('cached-token');
  });

  it('requests and stores a new FCM token when needed', async () => {
    messagingMock.__mock.state.getToken.mockResolvedValue('new-token');

    await expect(getFcmToken()).resolves.toBe('new-token');
    await expect(AsyncStorage.getItem('fcm_token')).resolves.toBe('new-token');
  });

  it('returns null when token retrieval fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    messagingMock.__mock.state.getToken.mockRejectedValueOnce(new Error('boom'));

    await expect(getFcmToken()).resolves.toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('returns null when no new token is provided', async () => {
    messagingMock.__mock.state.getToken.mockResolvedValueOnce('');

    await expect(getFcmToken()).resolves.toBeNull();
  });

  it('handles manual approval flow and decryption notifications', async () => {
    jest.useFakeTimers();

    const setMessageState = jest.fn();
    const setAccessState = jest.fn();
    const setButtonsEnabled = jest.fn();
    let hookValue: ReturnType<typeof useFirebaseMessaging>;

    const Harness = () => {
      hookValue = useFirebaseMessaging(setMessageState, setAccessState, setButtonsEnabled);
      return null;
    };

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<Harness />);
      await flushPromises();
    });

    await act(async () => {
      await messagingMock.__mock.triggerMessage({
        data: {
          action: 'show_allow_close',
          qrData: '{"type":"clone"}',
        },
      });
    });

    expect(setMessageState).not.toHaveBeenCalledWith(true);
    expect(setButtonsEnabled).not.toHaveBeenCalledWith(true);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(setMessageState).toHaveBeenCalledWith(true);
    expect(setButtonsEnabled).toHaveBeenCalledWith(true);

    await act(async () => {
      await hookValue!.processQRData();
    });

    expect(handleQRScan).toHaveBeenCalledWith('{"type":"clone"}');

    await act(async () => {
      await messagingMock.__mock.triggerMessage({
        data: {
          action: 'noop',
          qrData: JSON.stringify({
            type: 'user-credential-decryption',
            credentials: ['c1', 'c2'],
          }),
        },
      });
    });

    expect(decryptFromBase64).toHaveBeenCalledTimes(2);

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(setMessageState).toHaveBeenCalledWith(false);
    expect(setButtonsEnabled).toHaveBeenCalledWith(false);

    await act(async () => {
      renderer!.unmount();
    });

    expect(messagingMock.__mock.state.unsubscribe).toHaveBeenCalled();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('starts access preparation immediately for access notifications', async () => {
    jest.useFakeTimers();

    const setMessageState = jest.fn();
    const setButtonsEnabled = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    const Harness = () => {
      useFirebaseMessaging(setMessageState, undefined, setButtonsEnabled);
      return null;
    };

    await act(async () => {
      renderer = ReactTestRenderer.create(<Harness />);
      await flushPromises();
    });

    await act(async () => {
      await messagingMock.__mock.triggerMessage({
        data: {
          action: 'show_allow_close',
          qrData: {
            type: 'domain-login',
            qrCacheKey: 'cache-key-1',
          },
        },
      });
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(prepareAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'domain-login',
        qrCacheKey: 'cache-key-1',
      }),
    );
    expect(setMessageState).toHaveBeenCalledWith(true);
    expect(setButtonsEnabled).toHaveBeenCalledWith(true);

    await act(async () => {
      renderer!.unmount();
    });

    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('deactivates buttons when QR processing throws', async () => {
    jest.useFakeTimers();
    (handleQRScan as jest.Mock).mockRejectedValueOnce(new Error('bad-qr'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const setMessageState = jest.fn();
    const setAccessState = jest.fn();
    const setButtonsEnabled = jest.fn();
    let hookValue: ReturnType<typeof useFirebaseMessaging>;

    const Harness = () => {
      hookValue = useFirebaseMessaging(setMessageState, setAccessState, setButtonsEnabled);
      return null;
    };

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<Harness />);
      await flushPromises();
    });

    await act(async () => {
      await messagingMock.__mock.triggerMessage({
        data: {
          action: 'show_allow_close',
          qrData: { type: 'clone' },
        },
      });
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await act(async () => {
      await hookValue!.processQRData();
      await flushPromises();
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error in handleQRScan:', expect.any(Error));
    expect(setMessageState).toHaveBeenCalledWith(false);
    expect(setAccessState).toHaveBeenCalledWith(false);
    expect(setButtonsEnabled).toHaveBeenCalledWith(false);

    await act(async () => {
      renderer!.unmount();
    });

    expect(messagingMock.__mock.state.unsubscribe).toHaveBeenCalled();
    jest.clearAllTimers();
    consoleSpy.mockRestore();
    jest.useRealTimers();
  });

  it('ignores null decrypted credentials and clears timers on unmount', async () => {
    jest.useFakeTimers();
    (decryptFromBase64 as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('decrypted:c2');

    const setMessageState = jest.fn();
    const setButtonsEnabled = jest.fn();

    const Harness = () => {
      useFirebaseMessaging(setMessageState, undefined, setButtonsEnabled);
      return null;
    };

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<Harness />);
      await flushPromises();
    });

    await act(async () => {
      await messagingMock.__mock.triggerMessage({
        data: {
          action: 'noop',
          qrData: {
            type: 'user-credential-decryption',
            credentials: ['c1', 'c2'],
          },
        },
      });
    });

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(decryptFromBase64).toHaveBeenCalledTimes(2);
    expect(setMessageState).not.toHaveBeenCalledWith(true);

    await act(async () => {
      await messagingMock.__mock.triggerMessage({
        data: {
          action: 'show_allow_close',
          qrData: { type: 'clone' },
        },
      });
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await act(async () => {
      renderer!.unmount();
    });

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(messagingMock.__mock.state.unsubscribe).toHaveBeenCalled();
    expect(setMessageState).toHaveBeenCalledTimes(1);
  });

  it('runs the auto-deactivate timer when approval is ignored', async () => {
    jest.useFakeTimers();

    const setMessageState = jest.fn();
    const setAccessState = jest.fn();
    const setButtonsEnabled = jest.fn();

    const Harness = () => {
      useFirebaseMessaging(setMessageState, setAccessState, setButtonsEnabled);
      return null;
    };

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<Harness />);
      await flushPromises();
    });

    await act(async () => {
      await messagingMock.__mock.triggerMessage({
        data: {
          action: 'show_allow_close',
          qrData: '{"type":"clone"}',
        },
      });
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(setMessageState).toHaveBeenNthCalledWith(1, true);
    expect(setMessageState).toHaveBeenLastCalledWith(false);
    expect(setAccessState).toHaveBeenCalledWith(false);
    expect(setButtonsEnabled).toHaveBeenLastCalledWith(false);

    await act(async () => {
      renderer!.unmount();
    });
  });

  it('does nothing when manual processing is requested without pending qr data', async () => {
    const setMessageState = jest.fn();
    let hookValue: ReturnType<typeof useFirebaseMessaging>;

    const Harness = () => {
      hookValue = useFirebaseMessaging(setMessageState);
      return null;
    };

    await act(async () => {
      ReactTestRenderer.create(<Harness />);
      await flushPromises();
    });

    await act(async () => {
      await hookValue!.processQRData();
      await flushPromises();
    });

    expect(handleQRScan).not.toHaveBeenCalled();
    expect(setMessageState).not.toHaveBeenCalled();
  });

  it('stores a null pending qr payload when notification data is missing', async () => {
    jest.useFakeTimers();

    const setMessageState = jest.fn();
    let hookValue: ReturnType<typeof useFirebaseMessaging>;

    const Harness = () => {
      hookValue = useFirebaseMessaging(setMessageState);
      return null;
    };

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<Harness />);
      await flushPromises();
    });

    await act(async () => {
      await messagingMock.__mock.triggerMessage({
        data: {
          action: 'show_allow_close',
        },
      });
    });

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await act(async () => {
      await hookValue!.processQRData();
    });

    await act(async () => {
      jest.advanceTimersByTime(10000);
    });

    expect(handleQRScan).not.toHaveBeenCalled();
    expect(setMessageState).toHaveBeenNthCalledWith(1, true);
    expect(setMessageState).toHaveBeenLastCalledWith(false);

    await act(async () => {
      renderer!.unmount();
    });
  });

  it('can deactivate without optional callbacks or a timer', async () => {
    let hookValue: ReturnType<typeof useFirebaseMessaging>;

    const Harness = () => {
      hookValue = useFirebaseMessaging(jest.fn());
      return null;
    };

    await act(async () => {
      ReactTestRenderer.create(<Harness />);
      await flushPromises();
    });

    act(() => {
      hookValue!.deactivateButtons();
    });

    expect(hookValue).toBeDefined();
  });

  it('ignores notifications whose action is not allow-close and have no qr payload', async () => {
    const setMessageState = jest.fn();
    const setButtonsEnabled = jest.fn();

    const Harness = () => {
      useFirebaseMessaging(setMessageState, undefined, setButtonsEnabled);
      return null;
    };

    await act(async () => {
      ReactTestRenderer.create(<Harness />);
      await flushPromises();
    });

    await act(async () => {
      await messagingMock.__mock.triggerMessage({
        data: {
          action: 'noop',
        },
      });
    });

    expect(setMessageState).not.toHaveBeenCalled();
    expect(setButtonsEnabled).not.toHaveBeenCalled();
  });

  it('auto-processes new-user-credential-silent without frontend confirmation', async () => {
    jest.useFakeTimers();
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const setMessageState = jest.fn();
    const setButtonsEnabled = jest.fn();

    const Harness = () => {
      useFirebaseMessaging(setMessageState, undefined, setButtonsEnabled);
      return null;
    };

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<Harness />);
      await flushPromises();
    });

    await act(async () => {
      await messagingMock.__mock.triggerMessage({
        data: {
          action: 'show_allow_close',
          qrContent: JSON.stringify({
            type: 'new-user-credential-silent',
            source: 'extension',
            sessionId: 'silent_session_1',
          }),
        },
      });
    });

    expect(decryptSilentNewUserCredentialPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'new-user-credential-silent',
        source: 'extension',
        sessionId: 'silent_session_1',
      }),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith('[SilentCredential] Decrypted payload', { decrypted: true });
    expect(setMessageState).not.toHaveBeenCalledWith(true);
    expect(setButtonsEnabled).not.toHaveBeenCalledWith(true);

    await act(async () => {
      renderer!.unmount();
    });

    jest.clearAllTimers();
    consoleLogSpy.mockRestore();
    jest.useRealTimers();
  });

  it('registers a background handler that silently decrypts silent credentials', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    registerFirebaseBackgroundHandler();

    expect(typeof messagingMock.__mock.state.backgroundHandler).toBe('function');

    await act(async () => {
      await messagingMock.__mock.triggerBackgroundMessage({
        data: {
          qrContent: JSON.stringify({
            type: 'new-user-credential-silent',
            source: 'extension',
            sessionId: 'background_silent_session',
          }),
        },
      });
    });

    expect(decryptSilentNewUserCredentialPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'new-user-credential-silent',
        source: 'extension',
        sessionId: 'background_silent_session',
      }),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith('[SilentCredential] Decrypted payload', { decrypted: true });

    consoleLogSpy.mockRestore();
  });
});
