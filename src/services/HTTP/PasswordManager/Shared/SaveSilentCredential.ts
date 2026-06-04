import { encryptToBase64 } from '../../../Encrypter';
import { getApiUrl, getCredentialSecret, getPublicId } from '../../../DeviceStore';
import { logHttpRequest, logHttpResponse } from '../../httpLogger';

export type SilentCredentialTimingContext = {
  notificationReceivedAtMs: number;
};

export const saveSilentCredential = async (
  decryptedCredential: any,
  silentPayload: any,
  sessionId: string,
  timingContext?: SilentCredentialTimingContext,
): Promise<boolean> => {
  console.log('[SilentCredential] Starting save flow', { sessionId });

  // 1. Resolve userPublicId from device store
  const userPublicId = await getPublicId();
  console.log('[SilentCredential] userPublicId resolved', { hasUserPublicId: Boolean(userPublicId) });

  if (!userPublicId) {
    console.error('[SilentCredential] Missing userPublicId in device store');
    return false;
  }

  // 2. Resolve credentialSecret from device store
  const credentialSecret = await getCredentialSecret();
  console.log('[SilentCredential] credentialSecret resolved', { hasSecret: Boolean(credentialSecret) });

  if (!credentialSecret) {
    console.error('[SilentCredential] Missing credentialSecret in device store');
    return false;
  }

  // 3. Serialize decrypted credential to string for encryption
  const credentialString =
    typeof decryptedCredential === 'string'
      ? decryptedCredential
      : JSON.stringify(decryptedCredential);

  console.log('[SilentCredential] Encrypting credential with credentialSecret');

  // 4. Encrypt with credentialSecret (NaCl secretbox / Blake2b key)
  const encryptedCredential = await encryptToBase64(credentialString, credentialSecret);
  console.log('[SilentCredential] Credential encrypted', { encryptedLength: encryptedCredential.length });

  // 5. Build save payload
  const payload = {
    publicId: userPublicId,
    sessionId,
    userCredential: encryptedCredential,
    type: decryptedCredential?.type,
    domain: decryptedCredential?.domain,
    isNew: decryptedCredential?.isNew,
    source: decryptedCredential?.source,
    update: false,
    description: decryptedCredential?.description,
    application: decryptedCredential?.application,
  };

  console.log('[SilentCredential] Save payload built', {
    userPublicId,
    sessionId,
    encryptedCredentialLength: encryptedCredential.length,
  });

  // 6. Resolve API URL and POST
  const path = await getApiUrl('API_REGISTRATION_NEW_SAVE');
  console.log('[SilentCredential] Sending save request to', path);

  const requestOptions: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  };

  const saveRequestDispatchedAtMs = Date.now();
  if (timingContext?.notificationReceivedAtMs) {
    console.log('[SilentCredential][Timing] notification->save-dispatch', {
      sessionId,
      totalMs: saveRequestDispatchedAtMs - timingContext.notificationReceivedAtMs,
      notificationReceivedAtMs: timingContext.notificationReceivedAtMs,
      saveRequestDispatchedAtMs,
    });
  }

  logHttpRequest('SilentCredential.saveSilentCredential', path, requestOptions);

  try {
    const response = await fetch(path, requestOptions);
    await logHttpResponse('SilentCredential.saveSilentCredential', response);

    console.log('[SilentCredential] Save response received', {
      status: response.status,
      ok: response.ok,
    });

    if (!response.ok) {
      console.error('[SilentCredential] Save failed', {
        status: response.status,
        statusText: response.statusText,
      });
      return false;
    }

    console.log('[SilentCredential] Credential saved successfully');
    return true;
  } catch (error) {
    console.error('[SilentCredential] Save request threw an error:', error);
    return false;
  }
};
