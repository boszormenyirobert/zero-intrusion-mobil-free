import * as biometricsModule from 'react-native-biometrics';
import StrongBiometricService from '../StrongBiometricService';

const biometricsMock = biometricsModule as unknown as {
  __mockInstance: {
    isSensorAvailable: jest.Mock;
    simplePrompt: jest.Mock;
    biometricKeysExist: jest.Mock;
    createKeys: jest.Mock;
  };
};

describe('StrongBiometricService', () => {
  it('accepts fingerprint biometrics and rejects face id', async () => {
    biometricsMock.__mockInstance.isSensorAvailable.mockResolvedValueOnce({
      available: true,
      biometryType: biometricsModule.BiometryTypes.Biometrics,
    });
    await expect(StrongBiometricService.isAvailable()).resolves.toBe(true);

    biometricsMock.__mockInstance.isSensorAvailable.mockResolvedValueOnce({
      available: true,
      biometryType: biometricsModule.BiometryTypes.FaceID,
    });
    await expect(StrongBiometricService.isAvailable()).resolves.toBe(false);
  });

  it('returns fallback capabilities on sensor errors', async () => {
    biometricsMock.__mockInstance.isSensorAvailable.mockRejectedValueOnce(new Error('boom'));

    await expect(StrongBiometricService.getCapabilities()).resolves.toEqual({
      available: false,
      biometryType: null,
      isStrongBiometric: false,
      isFingerprint: false,
      isTouchID: false,
      isFaceID: false,
      securityLevel: 'NONE',
    });
  });

  it('authenticates successfully with strong biometrics', async () => {
    biometricsMock.__mockInstance.isSensorAvailable
      .mockResolvedValueOnce({ available: true, biometryType: biometricsModule.BiometryTypes.TouchID })
      .mockResolvedValueOnce({ available: true, biometryType: biometricsModule.BiometryTypes.TouchID })
      .mockResolvedValueOnce({ available: true, biometryType: biometricsModule.BiometryTypes.TouchID });
    biometricsMock.__mockInstance.simplePrompt.mockResolvedValue({ success: true });

    const result = await StrongBiometricService.authenticate();

    expect(result.success).toBe(true);
    expect(result.biometryType).toBe(biometricsModule.BiometryTypes.TouchID);
    expect(result.data).toEqual(expect.objectContaining({ securityLevel: 'STRONG' }));
  });

  it('returns failures for unavailable or rejected prompts', async () => {
    biometricsMock.__mockInstance.isSensorAvailable.mockResolvedValueOnce({
      available: false,
      biometryType: null,
    });

    await expect(StrongBiometricService.authenticate()).resolves.toEqual(expect.objectContaining({
      success: false,
      error: expect.stringContaining('Strong biometric authentication not available'),
    }));

    biometricsMock.__mockInstance.isSensorAvailable.mockResolvedValueOnce({
      available: true,
      biometryType: biometricsModule.BiometryTypes.Biometrics,
    });
    biometricsMock.__mockInstance.simplePrompt.mockResolvedValueOnce({
      success: false,
      error: 'Cancelled',
    });

    await expect(StrongBiometricService.authenticate()).resolves.toEqual({
      success: false,
      error: 'Cancelled',
    });
  });

  it('returns false when availability checks throw directly', async () => {
    biometricsMock.__mockInstance.isSensorAvailable.mockRejectedValueOnce(new Error('availability-error'));

    await expect(StrongBiometricService.isAvailable()).resolves.toBe(false);
  });

  it('returns a formatted error when the prompt throws', async () => {
    biometricsMock.__mockInstance.isSensorAvailable
      .mockResolvedValueOnce({ available: true, biometryType: biometricsModule.BiometryTypes.TouchID });
    biometricsMock.__mockInstance.simplePrompt.mockRejectedValueOnce(new Error('prompt-crash'));

    await expect(StrongBiometricService.authenticate()).resolves.toEqual({
      success: false,
      error: 'Strong biometric authentication error: prompt-crash',
    });
  });

  it('handles hardware key helpers', async () => {
    biometricsMock.__mockInstance.biometricKeysExist.mockResolvedValueOnce({ keysExist: true });
    biometricsMock.__mockInstance.biometricKeysExist.mockResolvedValueOnce({ keysExist: false });
    biometricsMock.__mockInstance.biometricKeysExist.mockRejectedValueOnce(new Error('nope'));
    biometricsMock.__mockInstance.createKeys.mockResolvedValueOnce({ publicKey: 'public-key' });
    biometricsMock.__mockInstance.createKeys.mockResolvedValueOnce({ publicKey: '' });
    biometricsMock.__mockInstance.createKeys.mockRejectedValueOnce(new Error('fail'));

    await expect(StrongBiometricService.supportsHardwareKeys()).resolves.toBe(true);
    await expect(StrongBiometricService.supportsHardwareKeys()).resolves.toBe(false);
    await expect(StrongBiometricService.supportsHardwareKeys()).resolves.toBe(false);
    await expect(StrongBiometricService.createKeys()).resolves.toBe(true);
    await expect(StrongBiometricService.createKeys()).resolves.toBe(false);
    await expect(StrongBiometricService.createKeys()).resolves.toBe(false);
  });

  it('returns generated public key when requested', async () => {
    biometricsMock.__mockInstance.createKeys.mockResolvedValueOnce({ publicKey: 'public-key-value' });
    biometricsMock.__mockInstance.createKeys.mockResolvedValueOnce({ publicKey: '' });
    biometricsMock.__mockInstance.createKeys.mockRejectedValueOnce(new Error('fail'));

    await expect(StrongBiometricService.createKeysAndGetPublicKey()).resolves.toBe('public-key-value');
    await expect(StrongBiometricService.createKeysAndGetPublicKey()).resolves.toBeNull();
    await expect(StrongBiometricService.createKeysAndGetPublicKey()).resolves.toBeNull();
  });

  it('reports capability flags for face id sensors', async () => {
    biometricsMock.__mockInstance.isSensorAvailable
      .mockResolvedValueOnce({ available: true, biometryType: biometricsModule.BiometryTypes.FaceID })
      .mockResolvedValueOnce({ available: true, biometryType: biometricsModule.BiometryTypes.FaceID });

    await expect(StrongBiometricService.getCapabilities()).resolves.toEqual({
      available: true,
      biometryType: biometricsModule.BiometryTypes.FaceID,
      isStrongBiometric: false,
      isFingerprint: false,
      isTouchID: false,
      isFaceID: true,
      securityLevel: 'STRONG',
    });
  });

  it('uses the default authentication failure message when the prompt returns no error', async () => {
    biometricsMock.__mockInstance.isSensorAvailable.mockResolvedValueOnce({
      available: true,
      biometryType: biometricsModule.BiometryTypes.TouchID,
    });
    biometricsMock.__mockInstance.simplePrompt.mockResolvedValueOnce({
      success: false,
    });

    await expect(StrongBiometricService.authenticate()).resolves.toEqual({
      success: false,
      error: 'Strong biometric authentication failed',
    });
  });

  it('formats thrown string errors during authentication', async () => {
    biometricsMock.__mockInstance.isSensorAvailable.mockResolvedValueOnce({
      available: true,
      biometryType: biometricsModule.BiometryTypes.TouchID,
    });
    biometricsMock.__mockInstance.simplePrompt.mockRejectedValueOnce('plain-error');

    await expect(StrongBiometricService.authenticate()).resolves.toEqual({
      success: false,
      error: 'Strong biometric authentication error: plain-error',
    });
  });
});
