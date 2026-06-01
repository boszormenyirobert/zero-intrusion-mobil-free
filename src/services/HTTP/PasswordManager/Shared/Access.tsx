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
import { buildAccessCacheKey, normalizeAccessType } from '../../../qrPayload';
import { encryptWithGeneratedAesKey } from './AES';
import { encryptWithRsaPublicKey } from './RSA';
import { logHttpRequest, logHttpResponse } from '../../httpLogger';

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
  success?: boolean;
  credentials: Array<{
    credential: string;
    targetId?: string;
    description?: string;
    application?: string;
  }>;
  sessionId?: string;
  publicKey?: string | Record<string, unknown>;
  rsaPublicKey?: string | Record<string, unknown>;
  encryptionPublicKey?: string | Record<string, unknown>;
  processId?: string;
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
  sessionId?: string;
  publicKey?: string;
  processId?: string;
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

const getAccessCacheKey = (qrJson: i.Access) => {
  return buildAccessCacheKey(qrJson.qrCacheKey, qrJson.type) ?? qrJson.qrCacheKey;
};

const collectMatchingCacheKeys = (qrCacheKey: string) => {
  const typedPrefix = `${qrCacheKey}::`;
  const keys = new Set<string>([qrCacheKey]);

  accessPreparationCache.forEach((_, key) => {
    if (key.startsWith(typedPrefix)) {
      keys.add(key);
    }
  });

  accessConfirmationTimes.forEach((_, key) => {
    if (key.startsWith(typedPrefix)) {
      keys.add(key);
    }
  });

  return Array.from(keys);
};

export const markAccessConfirmed = (qrCacheKey?: string | null, confirmedAt?: number) => {
  if (!qrCacheKey || typeof confirmedAt !== 'number') {
    return;
  }

  const keys = collectMatchingCacheKeys(qrCacheKey);
  keys.forEach(key => {
    accessConfirmationTimes.set(key, confirmedAt);
  });
};

export const clearAccessConfirmation = (qrCacheKey?: string | null) => {
  if (!qrCacheKey) {
    return;
  }

  const keys = collectMatchingCacheKeys(qrCacheKey);
  keys.forEach(key => {
    accessConfirmationTimes.delete(key);
  });
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

const normalizeEncryptedCredentialsResponse = (
  response: unknown,
): EncryptedCredentialsResponse | false => {
  if (!response || typeof response !== 'object') {
    return false;
  }

  const parsedResponse = response as Partial<EncryptedCredentialsResponse> & {
    data?: Partial<EncryptedCredentialsResponse>;
    result?: Partial<EncryptedCredentialsResponse>;
    payload?: Partial<EncryptedCredentialsResponse>;
  };

  const nestedResponse = parsedResponse.data ?? parsedResponse.result ?? parsedResponse.payload;

  const successFlag = parsedResponse.success ?? nestedResponse?.success;

  const toCredentialArray = (value: unknown) => {
    if (Array.isArray(value)) {
      return value;
    }

    if (value && typeof value === 'object') {
      const values = Object.values(value).filter(
        item => item && typeof item === 'object' && 'credential' in (item as Record<string, unknown>),
      );

      if (values.length > 0) {
        return values as EncryptedCredentialsResponse['credentials'];
      }
    }

    return undefined;
  };

  const resolvedCredentials = toCredentialArray(parsedResponse.credentials)
    ?? toCredentialArray(nestedResponse?.credentials)
    ?? toCredentialArray(response);

  const resolvedDomainProcessId = parsedResponse.sessionId
    ?? nestedResponse?.sessionId;

  const pickPublicKeyFromRecord = (record: Record<string, unknown>) => {
    const directPublicKey =
      record.publicKey
      ?? record.rsaPublicKey
      ?? record.encryptionPublicKey
      ?? record.public_key
      ?? record.rsa_public_key
      ?? record.encryption_public_key;

    if (directPublicKey) {
      return directPublicKey;
    }

    const normalizedKeyEntry = Object.entries(record).find(([key]) => {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      return (
        normalizedKey === 'publickey'
        || normalizedKey === 'rsapublickey'
        || normalizedKey === 'encryptionpublickey'
      );
    });

    return normalizedKeyEntry?.[1];
  };

  const findPublicKeyDeep = (value: unknown): unknown => {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    const visited = new Set<object>();
    const queue: unknown[] = [value];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || typeof current !== 'object') {
        continue;
      }

      if (visited.has(current as object)) {
        continue;
      }
      visited.add(current as object);

      const currentRecord = current as Record<string, unknown>;

      const directPublicKey = pickPublicKeyFromRecord(currentRecord);

      if (directPublicKey) {
        return directPublicKey;
      }

      Object.values(currentRecord).forEach(child => {
        if (child && typeof child === 'object') {
          queue.push(child);
        }
      });
    }

    return undefined;
  };

  const resolvedPublicKey =
    pickPublicKeyFromRecord(parsedResponse as unknown as Record<string, unknown>)
    ?? (nestedResponse && typeof nestedResponse === 'object'
      ? pickPublicKeyFromRecord(nestedResponse as unknown as Record<string, unknown>)
      : undefined)
    ?? findPublicKeyDeep(response);

  if (successFlag === false) {
    return false;
  }

  if (!Array.isArray(resolvedCredentials)) {
    console.error('[Access][normalizeEncryptedCredentialsResponse] Unsupported response shape', {
      topLevelKeys: Object.keys(parsedResponse as Record<string, unknown>),
      nestedKeys: nestedResponse && typeof nestedResponse === 'object'
        ? Object.keys(nestedResponse as Record<string, unknown>)
        : [],
    });
    return false;
  }

  return {
    success: successFlag,
    credentials: resolvedCredentials,
    sessionId: resolvedDomainProcessId,
 //   publicKey: resolvedPublicKey,
 //   rsaPublicKey: parsedResponse.rsaPublicKey ?? nestedResponse?.rsaPublicKey,
 //   encryptionPublicKey: parsedResponse.encryptionPublicKey ?? nestedResponse?.encryptionPublicKey,
  };
};


const buildPreparedAccess = async (qrJson: i.Access): Promise<PreparedAccess | false> => {
  const accessIdentity = await loadAccessIdentity();

  const encryptedCredentialsResponse = await getEncryptedCredentials(
    qrJson,
    accessIdentity,
  );

  const encryptedCredentials = normalizeEncryptedCredentialsResponse(
    encryptedCredentialsResponse,
  );

  if (!encryptedCredentials) {
    return false;
  }

  const decryptedCredentials = await decryptAccessCredentials(encryptedCredentials.credentials);
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

  const sessionId = qrJson.sessionId;
    console.log('Prepared Access Data qrJson', qrJson)
    console.log('Prepared Access Data encryptedCredentialsResponse', encryptedCredentials)

  const processId = encryptedCredentialsResponse.sessionId ;
  return {
    qrJson,
    accessIdentity,
    decryptedCredentials,
    encryptedPayload,
    sessionId,
    processId,
    publicKey: resolvedPublicKey,
  };
};

const getPreparedAccess = async (qrJson: i.Access): Promise<PreparedAccess | false> => {
  const cacheKey = getAccessCacheKey(qrJson);
  if (!cacheKey) {
    return await buildPreparedAccess(qrJson);
  }

  const cachedPreparation = accessPreparationCache.get(cacheKey);
  if (cachedPreparation) {
    return await cachedPreparation;
  }

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
  const { qrJson, accessIdentity, decryptedCredentials, encryptedPayload, sessionId } = preparedAccess;
  consumeAccessConfirmation(getAccessCacheKey(qrJson));
  const accessType = normalizeAccessType(qrJson.type);
  const path = accessType === 'domain-login'
    ? await getApiUrl('API_LOGIN')
    : await getApiUrl('API_ALLOW_APPLICATION_LIST');

  try {
    const { xExtensionAuthOne, ...loginData } = qrJson;
    const authToken = xExtensionAuthOne || '';
    const body: i.AccessExtended = {
      ...loginData,
      type: accessType ?? loginData.type,
      publicId: accessIdentity.publicId,
      privateId: accessIdentity.privateId,
      email: accessIdentity.email,
      update: false,
      credentials: encryptedPayload?.credentials ?? decryptedCredentials,
      rsaEncryptedKey: encryptedPayload?.rsaEncryptedKey,
      iv: encryptedPayload?.iv ?? loginData.iv,
      sessionId: sessionId ?? loginData.sessionId,      
      processId:preparedAccess.processId,
    };

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Extension-Auth': `HMAC ${authToken}`
      },
      body: JSON.stringify(body),
    };

    logHttpRequest('Access.submitPreparedAccess', path, requestOptions);
    const response = await fetch(path, requestOptions);
    await logHttpResponse('Access.submitPreparedAccess', response);

    if (!response.ok) {
      console.error('Login failed:', response.status, response.statusText);
      return false;
    }

    await response.json();
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
    const keys = collectMatchingCacheKeys(qrCacheKey);
    keys.forEach(key => {
      accessPreparationCache.delete(key);
      accessConfirmationTimes.delete(key);
    });
  }
};

// Function to handle domain login ~ access stored credentials for an domain
export const Access = async (qrJson: i.Access)=> {
  const preparedAccess = await getPreparedAccess(qrJson);

  if (!preparedAccess) {
    return false;
  }

  const mergedPreparedAccess: PreparedAccess = {
    ...preparedAccess,
    // Keep decrypted/cached material, but always submit with the freshest QR envelope fields.
    qrJson: {
      ...preparedAccess.qrJson,
      ...qrJson,
      sessionId: qrJson.sessionId ?? preparedAccess.qrJson?.sessionId,
      source: qrJson.source ?? preparedAccess.qrJson.source,
    },
  };

  return await submitPreparedAccess(mergedPreparedAccess);
};

async function getEncryptedCredentials(
  qrJson: i.Access,
  accessIdentity: AccessIdentity,
){
  const accessType = normalizeAccessType(qrJson.type);
  const path = accessType === 'domain-login'
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

      type: accessType ?? qrJson.type,
      source: qrJson.source,
      update: false,
    };

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
    };

    logHttpRequest('Access.getEncryptedCredentials', path, requestOptions);
    const response = await fetch(path, requestOptions);
    await logHttpResponse('Access.getEncryptedCredentials', response);

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