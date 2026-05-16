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
  const accessIdentity = await loadAccessIdentity();

  const encryptedCredentials = await getEncryptedCredentials(
    qrJson,
    accessIdentity,
  ) as EncryptedCredentialsResponse | false;

  if (!encryptedCredentials || !Array.isArray(encryptedCredentials.credentials)) {
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

  const domainProcessId = encryptedCredentials.domainProcessId || qrJson.domainProcessId;

  return {
    qrJson,
    accessIdentity,
    decryptedCredentials,
    encryptedPayload,
    domainProcessId,
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
  const { qrJson, accessIdentity, decryptedCredentials, encryptedPayload, domainProcessId } = preparedAccess;
  consumeAccessConfirmation(getAccessCacheKey(qrJson));
  const path = qrJson.type === 'domain-login'
    ? await getApiUrl('API_LOGIN')
    : await getApiUrl('API_ALLOW_APPLICATION_LIST');

  try {
    const { xExtensionAuthOne, ...loginData } = qrJson;
    const authToken = xExtensionAuthOne || '';

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

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Extension-Auth': `HMAC ${authToken}`
      },
      body: JSON.stringify(body),
    };

    const response = await fetch(path, requestOptions);

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
    accessPreparationCache.delete(qrCacheKey);
    accessConfirmationTimes.delete(qrCacheKey);
  }
};

// Function to handle domain login ~ access stored credentials for an domain
export const Access = async (qrJson: i.Access)=> {
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

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
    };

    const response = await fetch(path, requestOptions);

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