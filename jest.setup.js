global.fetch = jest.fn();

jest.mock('react-native-get-random-values', () => ({}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: key => key,
    i18n: { changeLanguage: jest.fn() },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
}));

jest.mock('react-native-biometrics', () => {
  const mockInstance = {
    isSensorAvailable: jest.fn(),
    simplePrompt: jest.fn(),
    biometricKeysExist: jest.fn(),
    createKeys: jest.fn(),
  };

  const ReactNativeBiometrics = jest.fn(() => mockInstance);

  return {
    __esModule: true,
    default: ReactNativeBiometrics,
    BiometryTypes: {
      Biometrics: 'Biometrics',
      TouchID: 'TouchID',
      FaceID: 'FaceID',
    },
    __mockInstance: mockInstance,
  };
});

jest.mock('react-native-keychain', () => {
  const store = new Map();

  return {
    getInternetCredentials: jest.fn(async service => store.get(service) ?? false),
    setInternetCredentials: jest.fn(async (service, username, password) => {
      store.set(service, { username, password });
      return true;
    }),
    resetInternetCredentials: jest.fn(async service => {
      store.delete(service);
      return true;
    }),
    __store: store,
    __reset: () => store.clear(),
  };
});

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();

  return {
    getItem: jest.fn(async key => (store.has(key) ? store.get(key) : null)),
    setItem: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    removeItem: jest.fn(async key => {
      store.delete(key);
    }),
    clear: jest.fn(async () => {
      store.clear();
    }),
    __store: store,
    __reset: () => store.clear(),
  };
});

jest.mock('@react-native-firebase/messaging', () => {
  const state = {
    getToken: jest.fn(),
    unsubscribe: jest.fn(),
    handler: null,
  };

  const messaging = jest.fn(() => ({
    getToken: state.getToken,
    onMessage: jest.fn(callback => {
      state.handler = callback;
      return state.unsubscribe;
    }),
  }));

  messaging.__mock = {
    state,
    triggerMessage: async remoteMessage => {
      if (state.handler) {
        await state.handler(remoteMessage);
      }
    },
    reset: () => {
      state.getToken.mockReset();
      state.unsubscribe.mockReset();
      state.handler = null;
    },
  };

  return {
    __esModule: true,
    default: messaging,
  };
});

jest.mock('react-native-vision-camera', () => {
  const React = require('react');
  const { View } = require('react-native');

  const state = {
    permission: jest.fn(async () => 'granted'),
    device: { id: 'back-camera' },
    codeScannerConfig: null,
  };

  const Camera = ({ children, ...props }) => React.createElement(View, { ...props, testID: 'camera' }, children);
  Camera.requestCameraPermission = (...args) => state.permission(...args);

  return {
    Camera,
    useCameraDevice: jest.fn(() => state.device),
    useCodeScanner: jest.fn(config => {
      state.codeScannerConfig = config;
      return config;
    }),
    __mock: {
      state,
      reset: () => {
        state.permission.mockReset();
        state.permission.mockResolvedValue('granted');
        state.device = { id: 'back-camera' };
        state.codeScannerConfig = null;
      },
    },
  };
});

jest.mock('react-native-qrcode-svg', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return ({ value }) => React.createElement(Text, { testID: 'qr-code' }, value);
});

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch.mockReset();

  const keychain = require('react-native-keychain');
  keychain.__reset();

  const asyncStorage = require('@react-native-async-storage/async-storage');
  asyncStorage.__reset();

  const messaging = require('@react-native-firebase/messaging').default;
  messaging.__mock.reset();

  const biometrics = require('react-native-biometrics');
  biometrics.__mockInstance.isSensorAvailable.mockReset();
  biometrics.__mockInstance.simplePrompt.mockReset();
  biometrics.__mockInstance.biometricKeysExist.mockReset();
  biometrics.__mockInstance.createKeys.mockReset();

  const visionCamera = require('react-native-vision-camera');
  visionCamera.__mock.reset();
});