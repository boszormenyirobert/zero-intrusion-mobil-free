import React from 'react';
import { Alert, Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import visionCamera from 'react-native-vision-camera';
import AutoQRScanner, { setScannedIfMounted } from '../AutoQRScanner';

const flushPromises = () => new Promise(resolve => setImmediate(resolve));
const cameraMock = visionCamera as unknown as {
  __mock: {
    state: {
      permission: jest.Mock;
      device: any;
      codeScannerConfig: any;
    };
  };
};

describe('AutoQRScanner', () => {
  const getPressables = (renderer: ReactTestRenderer.ReactTestRenderer) =>
    renderer.root.findAll(node => typeof node.props.onPress === 'function');

  const alertSpy = jest.spyOn(Alert, 'alert');

  beforeEach(() => {
    alertSpy.mockClear();
  });

  it('toggles scanned state only while mounted', () => {
    const setScanned = jest.fn();

    setScannedIfMounted({ current: true }, setScanned, true);
    setScannedIfMounted({ current: false }, setScanned, false);

    expect(setScanned).toHaveBeenCalledTimes(1);
    expect(setScanned).toHaveBeenCalledWith(true);
  });

  it('shows a denied state when camera permission is refused', async () => {
    cameraMock.__mock.state.permission.mockResolvedValue('denied');

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<AutoQRScanner onResult={jest.fn()} />);
      await flushPromises();
    });

    const texts = renderer!.root.findAllByType(Text).map(node => node.props.children);
    expect(texts).toContain('Camera permission denied.');
    expect(alertSpy).toHaveBeenCalled();
  });

  it('shows the loading state while camera permission is pending', async () => {
    cameraMock.__mock.state.permission.mockImplementationOnce(() => new Promise(() => undefined));

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<AutoQRScanner onResult={jest.fn()} />);
      await Promise.resolve();
    });

    const texts = renderer!.root.findAllByType(Text).map(node => node.props.children);
    expect(texts).toContain('Requesting camera permission...');
  });

  it('shows a missing-device state when no camera device exists', async () => {
    cameraMock.__mock.state.device = null;

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<AutoQRScanner onResult={jest.fn()} />);
      await flushPromises();
    });

    const texts = renderer!.root.findAllByType(Text).map(node => node.props.children);
    expect(texts).toContain('No camera device found.');
  });

  it('processes scanned QR values once and supports back navigation', async () => {
    let resolveScan: () => void;
    const onResult = jest.fn(() => new Promise<void>(resolve => {
      resolveScan = resolve;
    }));
    const setView = jest.fn();

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<AutoQRScanner onResult={onResult} setView={setView} />);
      await flushPromises();
    });

    await act(async () => {
      cameraMock.__mock.state.codeScannerConfig.onCodeScanned([{ value: 'qr-data' }]);
      cameraMock.__mock.state.codeScannerConfig.onCodeScanned([{ value: 'ignored' }]);
      resolveScan!();
      await flushPromises();
    });

    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith('qr-data');

    getPressables(renderer!).at(-1)!.props.onPress();
    expect(setView).toHaveBeenCalledWith('default');

    const backButton = renderer!.root.findAll(node => typeof node.props.style === 'function').at(-1)!;
    backButton.props.style({ pressed: true });
    backButton.props.style({ pressed: false });
  });

  it('recovers after QR processing errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const onResult = jest
      .fn()
      .mockRejectedValueOnce(new Error('bad-qr'))
      .mockResolvedValueOnce(undefined);

    await act(async () => {
      ReactTestRenderer.create(<AutoQRScanner onResult={onResult} />);
      await flushPromises();
    });

    await act(async () => {
      cameraMock.__mock.state.codeScannerConfig.onCodeScanned([{ value: 'bad-qr' }]);
      await flushPromises();
    });

    await act(async () => {
      cameraMock.__mock.state.codeScannerConfig.onCodeScanned([{ value: 'good-qr' }]);
      await flushPromises();
    });

    expect(onResult).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenCalledWith('QR processing failed:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('ignores empty scans and passes empty values through safely', async () => {
    const onResult = jest.fn(async () => undefined);

    await act(async () => {
      ReactTestRenderer.create(<AutoQRScanner onResult={onResult} />);
      await flushPromises();
    });

    await act(async () => {
      cameraMock.__mock.state.codeScannerConfig.onCodeScanned([]);
      cameraMock.__mock.state.codeScannerConfig.onCodeScanned([{ value: undefined }]);
      await flushPromises();
    });

    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith('');
  });

  it('does not reset scanned state after unmounting during qr processing', async () => {
    let resolveScan: () => void;
    const onResult = jest.fn(() => new Promise<void>(resolve => {
      resolveScan = resolve;
    }));

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<AutoQRScanner onResult={onResult} />);
      await flushPromises();
    });

    await act(async () => {
      cameraMock.__mock.state.codeScannerConfig.onCodeScanned([{ value: 'late-qr' }]);
      await Promise.resolve();
    });

    await act(async () => {
      renderer!.unmount();
      resolveScan!();
      await flushPromises();
    });

    expect(onResult).toHaveBeenCalledWith('late-qr');
  });

  it('allows the back button to be pressed without a view setter', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(<AutoQRScanner onResult={jest.fn()} />);
      await flushPromises();
    });

    await act(async () => {
      getPressables(renderer!).at(-1)!.props.onPress();
    });

    expect(renderer!.root.findAllByType(Text).map(node => node.props.children)).not.toContain(
      'Camera permission denied.',
    );
  });

  it('still forwards scan results triggered after unmount without touching state', async () => {
    const onResult = jest.fn(async () => undefined);

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<AutoQRScanner onResult={onResult} />);
      await flushPromises();
    });

    await act(async () => {
      renderer!.unmount();
      cameraMock.__mock.state.codeScannerConfig.onCodeScanned([{ value: 'after-unmount' }]);
      await flushPromises();
    });

    expect(onResult).toHaveBeenCalledWith('after-unmount');
  });

  it('processes scans without toggling state when the mounted ref starts false', async () => {
    const actualUseRef = React.useRef;
    const useRefSpy = jest.spyOn(React, 'useRef');

    useRefSpy
      .mockImplementationOnce(initialValue => actualUseRef(initialValue))
      .mockImplementationOnce(() => ({ current: false }))
      .mockImplementationOnce(() => ({ current: false }));

    const onResult = jest.fn(async () => undefined);

    await act(async () => {
      ReactTestRenderer.create(<AutoQRScanner onResult={onResult} />);
      await flushPromises();
    });

    await act(async () => {
      cameraMock.__mock.state.codeScannerConfig.onCodeScanned([{ value: 'guarded-qr' }]);
      await flushPromises();
    });

    expect(onResult).toHaveBeenCalledWith('guarded-qr');
    useRefSpy.mockRestore();
  });
});
