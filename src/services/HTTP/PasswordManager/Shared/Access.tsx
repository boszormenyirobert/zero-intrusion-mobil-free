import * as i from '../../../Interfaces/interfaces';
import {
  getApiUrl,
  getPublicId,
  getPrivateId,
  getSecret,
  getEmail,
  getCredentialSecret,
} from '../../../DeviceStore';
import { encryptToBase64, decryptFromBase64 } from '../../../Encrypter';
import { logHttpRequest, logHttpResponse } from '../../httpLogger';
import { encryptWithGeneratedAesKey } from './AES';
import { encryptWithRsaPublicKey } from './RSA';

type AccessIdentity = {
  publicId: string;
  privateId: string;
  email: string;
};

type EncryptedPayload = {
  credentials: unknown;
  rsaEncryptedKey: string | undefined;
  iv: string;
};

type EncryptedCredentialsResponse = {
  credentials: Array<{
    credential: string;
    targetId?: string;
    description?: string;
    application?: string;
  }>;
  domainProcessId?: string;
  publicKey?: string | Record<string, unknown>;
};

type PreparedAccess = {
  qrJson: i.Access;
  accessIdentity: AccessIdentity;
  decryptedCredentials: Array<{
    credential: string;
    targetId?: string;
    description?: string;
    application?: string;
  }>;
  encryptedPayload: EncryptedPayload | null;
  startedAt: number;
  preparedAt: number;
  domainProcessId?: string;
  publicKey?: string;
};

const accessPreparationCache = new Map<string, Promise<PreparedAccess | false>>();
const accessConfirmationTimes = new Map<string, number>();

const loadAccessIdentity = async (): Promise<AccessIdentity> => {
  const [publicId, privateId, secret, email] = await Promise.all([
    getPublicId(),
    getPrivateId(),
    getSecret(),
    getEmail(),
  ]);

  return {
    publicId,
    privateId: await encryptToBase64(privateId, secret),
    email,
  };
};

const logStep = (startedAt: number, label: string) => {
  console.log(`[Access timing] ${label}: ${Date.now() - startedAt} ms`);
};

const getAccessCacheKey = (qrJson: i.Access) => qrJson.qrCacheKey;

export const markAccessConfirmed = (qrCacheKey?: string | null, confirmedAt?: number) => {
  if (!qrCacheKey || typeof confirmedAt !== 'number') {
    return;
  }

  accessConfirmationTimes.set(qrCacheKey, confirmedAt);
};

export const clearAccessConfirmation = (qrCacheKey?: string | null) => {
  if (!qrCacheKey) {
    return;
  }

  accessConfirmationTimes.delete(qrCacheKey);
};

const consumeAccessConfirmation = (qrCacheKey?: string | null) => {
  if (!qrCacheKey) {
    return null;
  }

  const confirmedAt = accessConfirmationTimes.get(qrCacheKey) ?? null;
  accessConfirmationTimes.delete(qrCacheKey);
  return confirmedAt;
};

const decryptAccessCredentials = async (
  encryptedCredentials: Array<{
    credential: string;
    targetId?: string;
    description?: string;
    application?: string;
  }>,
) => {
  const credentialSecret = await getCredentialSecret();

  return (
    await Promise.all(
      encryptedCredentials.map(async (domain) => {
        const decryptedCredential = await decryptFromBase64(
          domain.credential,
          credentialSecret,
        );

        if (decryptedCredential === null) {
          return null;
        }

        return {
          credential: decryptedCredential,
          targetId: domain.targetId,
          description: domain.description,
          application: domain?.application,
        };
      }),
    )
  ).filter(Boolean) as PreparedAccess['decryptedCredentials'];
};

const normalizePublicKey = (publicKey: unknown): string | undefined => {
  if (typeof publicKey === 'string' && publicKey.trim()) {
    return publicKey;
  }

  if (publicKey && typeof publicKey === 'object') {
    return JSON.stringify(publicKey);
  }

  return undefined;
};


const buildPreparedAccess = async (qrJson: i.Access): Promise<PreparedAccess | false> => {
  const startedAt = Date.now();
  console.log('[Access timing] prepare flow started');
  const accessIdentity = await loadAccessIdentity();

  const encryptedCredentials = await getEncryptedCredentials(
    qrJson,
    accessIdentity,
  ) as EncryptedCredentialsResponse | false;
  logStep(startedAt, 'after getEncryptedCredentials');

  if (!encryptedCredentials || !Array.isArray(encryptedCredentials.credentials)) {
    return false;
  }

  const decryptedCredentials = await decryptAccessCredentials(encryptedCredentials.credentials);
  logStep(startedAt, 'after credential decryption');

  const resolvedPublicKey = normalizePublicKey(encryptedCredentials.publicKey)
    ?? normalizePublicKey(qrJson.publicKey);
  const rsaPublicKey = resolvedPublicKey ?? '{}';
  const useEncryptedPayload = Boolean(rsaPublicKey && rsaPublicKey !== '{}');
  const aesResult = useEncryptedPayload ? encryptWithGeneratedAesKey(decryptedCredentials) : null;
  const rsaEncryptedKey = useEncryptedPayload && aesResult
    ? encryptWithRsaPublicKey(aesResult.key, rsaPublicKey)
    : undefined;
  const encryptedPayload: EncryptedPayload | null = aesResult
    ? { credentials: aesResult.encryptedData, rsaEncryptedKey, iv: aesResult.iv }
    : null;
  const preparedAt = Date.now();
  logStep(startedAt, 'after payload encryption (prepare)');

  // domainProcessId átvétele a decrypted response-ból, ha van
  const domainProcessId = encryptedCredentials.domainProcessId || qrJson.domainProcessId;

  return {
    qrJson,
    accessIdentity,
    decryptedCredentials,
    encryptedPayload,
    startedAt,
    preparedAt,
    domainProcessId,
    publicKey: resolvedPublicKey,
  };
};

const logPrepareCacheState = (qrJson: i.Access, label: string) => {
  const cacheKey = getAccessCacheKey(qrJson);
  if (!cacheKey) {
    return;
  }

  console.log(
    `[Access timing] ${label}: ${accessPreparationCache.has(cacheKey) ? 'cached' : 'not-cached'}`,
  );
};

const getPreparedAccess = async (qrJson: i.Access): Promise<PreparedAccess | false> => {
  const cacheKey = getAccessCacheKey(qrJson);
  if (!cacheKey) {
    return await buildPreparedAccess(qrJson);
  }

  const cachedPreparation = accessPreparationCache.get(cacheKey);
  if (cachedPreparation) {
    console.log('[Access timing] reusing prepared access cache');
    return await cachedPreparation;
  }

  console.log('[Access timing] preparing access cache');
  const preparationPromise = buildPreparedAccess(qrJson)
    .then(result => {
      if (result === false) {
        accessPreparationCache.delete(cacheKey);
        return false;
      }

      accessPreparationCache.set(cacheKey, Promise.resolve(result));
      return result;
    })
    .catch(error => {
      accessPreparationCache.delete(cacheKey);
      throw error;
    });

  accessPreparationCache.set(cacheKey, preparationPromise);
  return await preparationPromise;
};

const submitPreparedAccess = async (preparedAccess: PreparedAccess): Promise<boolean> => {
  const { qrJson, accessIdentity, decryptedCredentials, encryptedPayload, startedAt, preparedAt, domainProcessId } = preparedAccess;
  const confirmedAt = consumeAccessConfirmation(getAccessCacheKey(qrJson));
  if (typeof confirmedAt === 'number') {
    const waitMs = preparedAt - confirmedAt;
    if (waitMs > 0) {
      console.log(`[Access timing] confirm wait for prepare: ${waitMs} ms (confirm arrived early)`);
    } else {
      console.log(`[Access timing] confirm wait for prepare: 0 ms (prepare was already ready)`);
    }
  }
  const path = qrJson.type === 'domain-login'
    ? await getApiUrl('API_LOGIN')
    : await getApiUrl('API_ALLOW_APPLICATION_LIST');

  try {
    const { xExtensionAuthOne, ...loginData } = qrJson;
    const authToken = xExtensionAuthOne || '';

    console.log(
      'PasswordManagerAccess.submitCredentials: credentials count',
      decryptedCredentials.length,
    );

    const body: i.AccessExtended = {
      ...loginData,
      publicId: accessIdentity.publicId,
      privateId: accessIdentity.privateId,
      email: accessIdentity.email,
      update: false,
      credentials: encryptedPayload?.credentials ?? decryptedCredentials,
      rsaEncryptedKey: encryptedPayload?.rsaEncryptedKey,
      iv: encryptedPayload?.iv ?? loginData.iv,
      domainProcessId: domainProcessId ?? loginData.domainProcessId,
    };
     if (path.includes('/api/credential-hub/domain/read/credential')) {
       console.log('Domain-read SUBMIT request payload:', {
         url: path,
         body,
       });
     }
    console.log('Access path:', path);
    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Extension-Auth': `HMAC ${authToken}`
      },
      body: JSON.stringify(body),
    };

    logHttpRequest('PasswordManagerAccess.submitCredentials', path, requestOptions);
    const submitRequestStart = Date.now();
    const response = await fetch(path, requestOptions);
    await logHttpResponse('PasswordManagerAccess.submitCredentials', response);
    console.log(`[Access timing] submit request round-trip: ${Date.now() - submitRequestStart} ms`);
    logStep(startedAt, 'after submitCredentials response');

    console.log('Access response status:', response.status, response.statusText);

    if (!response.ok) {
      console.error('Login failed:', response.status, response.statusText);
      return false;
    }

    const result = await response.json();
    console.log('Login successful:', result);
    logStep(startedAt, 'flow completed');
    if (typeof confirmedAt === 'number') {
      console.log(`[Access timing] confirm to submit response: ${Date.now() - confirmedAt} ms`);
    }
    return true;
  } catch (error) {
    console.error('SystemHubLogin error:', error);
    return false;
  } finally {
    accessPreparationCache.delete(getAccessCacheKey(qrJson));
    accessConfirmationTimes.delete(getAccessCacheKey(qrJson));
  }
};

export const prepareAccess = async (qrJson: i.Access) => {
  return Boolean(await getPreparedAccess(qrJson));
};

export const clearPreparedAccess = (qrCacheKey?: string) => {
  if (qrCacheKey) {
    accessPreparationCache.delete(qrCacheKey);
    accessConfirmationTimes.delete(qrCacheKey);
  }
};

// Function to handle domain login ~ access stored credentials for an domain
export const Access = async (qrJson: i.Access)=> {
  logPrepareCacheState(qrJson, 'confirm entry cache state');
  const preparedAccess = await getPreparedAccess(qrJson);

  if (!preparedAccess) {
    return false;
  }

  return await submitPreparedAccess(preparedAccess);
};

async function getEncryptedCredentials(
  qrJson: i.Access,
  accessIdentity: AccessIdentity,
){
  const startedAt = Date.now();
  
   const path = qrJson.type === 'domain-login'
  ? await getApiUrl('API_DECRYPTED_CREDENTIALS')
  : await getApiUrl('API_DECRYPTED_APPLICATIONS_CREDENTIALS');
   
  try {
    // Extract auth token from qrJson
    //const authToken = qrJson.xExtensionAuthOne || "";

    // Build request body with all loginData fields for testing which are actually needed
    const body: i.AccessCredentialsRequest = {
      publicId: accessIdentity.publicId,
      // Private ID is only double check on the server side, before accessing to the database
      privateId: accessIdentity.privateId,      
      // Cache keys
      qrCacheKey: qrJson.qrCacheKey,
      credentialCacheKey: qrJson.credentialCacheKey,

      type: qrJson.type,
      source: qrJson.source,
      update: false,
    };

    console.log('Access first request outgoing payload:', body);

    // Make API request
    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
    };

    if (path.includes('/api/credential-hub/domain/read/credential/decrypted')) {
      console.log('Domain-read decrypted request payload:', {
        url: path,
        body,
      });
    }

    logHttpRequest('PasswordManagerAccess.getEncryptedCredentials', path, requestOptions);
    const response = await fetch(path, requestOptions);
    await logHttpResponse('PasswordManagerAccess.getEncryptedCredentials', response);
    console.log(`[Access timing] getEncryptedCredentials fetch: ${Date.now() - startedAt} ms`);

    // Check response status
    if (!response.ok) {
      console.error('Login failed:', response.status, response);
      return false;
    }

    return await response.json();
  } catch (error) {
    console.error('SystemHubLogin error:', error);
    return false;
  }
};