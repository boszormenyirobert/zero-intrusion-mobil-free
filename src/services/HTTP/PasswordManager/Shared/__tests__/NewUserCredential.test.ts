jest.mock('../../../../DeviceStore', () => ({
  getApiUrl: jest.fn(),
  getPublicId: jest.fn(),
  getRsaPrivateKey: jest.fn(),
  getRsaPublicKey: jest.fn(),
  setRsaKeyPair: jest.fn(),
}));

jest.mock('../../../httpLogger', () => ({
  logHttpRequest: jest.fn(),
  logHttpResponse: jest.fn(),
}));

import {
  getApiUrl,
  getPublicId,
  getRsaPrivateKey,
  getRsaPublicKey,
  setRsaKeyPair,
} from '../../../../DeviceStore';
import { NewUserCredential } from '../NewUserCredential';

const fetchMock = global.fetch as unknown as jest.Mock;

describe('PasswordManager NewUserCredential', () => {
  beforeEach(() => {
    (getApiUrl as jest.Mock).mockResolvedValue('https://tenant.example.com/new/to-encrypt');
    (getPublicId as jest.Mock).mockResolvedValue('stored-user-public-id');
    (getRsaPublicKey as jest.Mock).mockResolvedValue('stored-public-key');
    (getRsaPrivateKey as jest.Mock).mockResolvedValue('stored-private-key');
    (setRsaKeyPair as jest.Mock).mockResolvedValue(undefined);
  });

  it('posts generated RSA public key without biometric prompt', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
    });

    await expect(
      NewUserCredential({
        sessionId: 'session-id',
        type: 'new-user-credential',
      }),
    ).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://tenant.example.com/new/to-encrypt',
      expect.objectContaining({
        method: 'POST',
      }),
    );

    const [, requestOptions] = fetchMock.mock.calls[0];
    const body = JSON.parse(requestOptions.body);

    expect(body).toEqual(
      expect.objectContaining({
        sessionId: 'session-id',
        userPublicId: 'stored-user-public-id',
        type: 'new-user-credential',
        source: 'extension',
        publicKey: 'stored-public-key',
        rsaPublicKey: 'stored-public-key',
      }),
    );
  });

  it('returns false when public key generation fails', async () => {
    (getRsaPublicKey as jest.Mock).mockResolvedValueOnce(null);
    (getRsaPrivateKey as jest.Mock).mockResolvedValueOnce(null);
    (setRsaKeyPair as jest.Mock).mockRejectedValueOnce(new Error('store-failed'));

    await expect(
      NewUserCredential({
        sessionId: 'session-id',
        type: 'new-user-credential',
      }),
    ).resolves.toBe(false);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns false when userPublicId is missing in store', async () => {
    (getPublicId as jest.Mock).mockResolvedValueOnce(null);

    await expect(
      NewUserCredential({
        sessionId: 'session-id',
        userPublicId: 'qr-user-public-id',
        type: 'new-user-credential',
      }),
    ).resolves.toBe(false);

    expect(getRsaPublicKey).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
