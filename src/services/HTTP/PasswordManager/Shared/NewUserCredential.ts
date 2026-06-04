import * as i from '../../../Interfaces/interfaces';
import { getApiUrl, getPublicId, getRsaPrivateKey, getRsaPublicKey, setRsaKeyPair } from '../../../DeviceStore';
import forge from 'node-forge';
import { logHttpRequest, logHttpResponse } from '../../httpLogger';

const ensureRsaPublicKey = async (): Promise<string | null> => {
  const [storedPublicKey, storedPrivateKey] = await Promise.all([
    getRsaPublicKey(),
    getRsaPrivateKey(),
  ]);

  if (storedPublicKey && storedPrivateKey) {
    return storedPublicKey;
  }

  try {
    const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
    const privateKeyPem = forge.pki.privateKeyToPem(keyPair.privateKey);
    const publicDer = forge.asn1.toDer(forge.pki.publicKeyToAsn1(keyPair.publicKey)).getBytes();
    const publicKeyBase64 = forge.util.encode64(publicDer);

    await setRsaKeyPair(privateKeyPem, publicKeyBase64);
    return publicKeyBase64;
  } catch (error) {
    console.error('[NewUserCredential] Failed to generate/store RSA key pair:', error);
    return null;
  }
};

export const NewUserCredential = async (qrJson: i.NewUserCredential): Promise<boolean> => {
  if (!qrJson?.sessionId) {
    console.error('[NewUserCredential] Missing sessionId in QR payload');
    return false;
  }

  try {
    const userPublicId = await getPublicId();
    if (!userPublicId) {
      console.error('[NewUserCredential] Missing userPublicId in device store');
      return false;
    }

    const publicKey = await ensureRsaPublicKey();

    if (!publicKey) {
      console.error('[NewUserCredential] Failed to generate RSA public key');
      return false;
    }

    const path = await getApiUrl('API_REGISTRATION_TO_ENCRYPT');
    const payload = {
      sessionId: qrJson.sessionId,
      userPublicId,
      type: qrJson.type,
      source: qrJson.source ?? 'extension',
      publicKey,
      rsaPublicKey: publicKey,
    };

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    };

    console.log('[NewUserCredential] Outgoing public key registration payload', {
      url: path,
      method: requestOptions.method,
      headers: requestOptions.headers,
      body: payload,
    });

    logHttpRequest('PasswordManagerRegistration.newUserCredential', path, requestOptions);
    const response = await fetch(path, requestOptions);
    let responseBody = '';
    const responseWithBody = response as Response & {
      clone?: () => Response;
      text?: () => Promise<string>;
    };

    if (typeof responseWithBody.clone === 'function') {
      responseBody = await responseWithBody.clone().text().catch(() => '');
    } else if (typeof responseWithBody.text === 'function') {
      responseBody = await responseWithBody.text().catch(() => '');
    }

    console.log('[NewUserCredential] Incoming public key registration response', {
      status: response.status,
      statusText: response.statusText,
      body: responseBody,
    });

    await logHttpResponse('PasswordManagerRegistration.newUserCredential', response);

    if (!response.ok) {
      console.error(
        '[NewUserCredential] Public key registration failed:',
        response.status,
        response.statusText,
        responseBody,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('[NewUserCredential] Unexpected error:', error);
    return false;
  }
};
