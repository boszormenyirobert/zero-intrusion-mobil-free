import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useEffect} from 'react';
import { handleQRScan } from './HandleQRScan';
import { normalizeAccessType } from './qrPayload';
import { decryptFromBase64 } from './Encrypter';
import { getCredentialSecret } from './DeviceStore';
import { decryptSilentNewUserCredentialPayload } from './HTTP/PasswordManager/Shared/SilentCredentialDecrypt';
import { saveSilentCredential } from './HTTP/PasswordManager/Shared/SaveSilentCredential';
import {
  clearAccessConfirmation,
  clearPreparedAccess,
  markAccessConfirmed,
  prepareAccess,
} from './HTTP/PasswordManager/Shared/Access';

const SILENT_NEW_USER_CREDENTIAL_TYPE = 'new-user-credential-silent';

const parsePotentialJson = (value: unknown) => {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const hasSilentCredentialType = (payload: unknown): boolean => {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const payloadRecord = payload as Record<string, unknown>;
  if (payloadRecord.type === SILENT_NEW_USER_CREDENTIAL_TYPE) {
    return true;
  }

  return hasSilentCredentialType(payloadRecord.qrContent);
};

const getParsedQrPayload = (data: Record<string, unknown>) => {
  const rawPayload = data.qrData ?? data.qr ?? data.qrContent;
  const parsedPayload = parsePotentialJson(rawPayload);

  if (parsedPayload && typeof parsedPayload === 'object') {
    return {
      rawPayload,
      parsedPayload,
    };
  }

  return {
    rawPayload,
    parsedPayload: null,
  };
};

export const handleSilentCredentialRemoteMessage = async (remoteMessage: any) => {
  const notificationReceivedAtMs = Date.now();
  const data = (remoteMessage?.data ?? {}) as Record<string, unknown>;
  const { parsedPayload } = getParsedQrPayload(data);
  const silentPayload = parsedPayload ?? parsePotentialJson(data.qrContent) ?? data;

  if (!hasSilentCredentialType(silentPayload) && data.type !== SILENT_NEW_USER_CREDENTIAL_TYPE) {
    return false;
  }

  // Extract sessionId from the payload — look in qrContent first, then top level
  const qrContent =
    silentPayload && typeof silentPayload === 'object'
      ? (silentPayload as Record<string, unknown>).qrContent
      : null;
  const qrContentRecord =
    qrContent && typeof qrContent === 'object' ? (qrContent as Record<string, unknown>) : null;
  const sessionId =
    (qrContentRecord?.sessionId as string | undefined) ??
    ((silentPayload as Record<string, unknown>)?.sessionId as string | undefined) ??
    null;

  console.log('[SilentCredential] sessionId resolved from payload', { sessionId });

  try {
    const decryptedPayload = await decryptSilentNewUserCredentialPayload(silentPayload);
    if (decryptedPayload === null) {
      console.error(
        '[SilentCredential] Decryption returned null. Missing iv or unsupported encryptedData format.',
      );
      return true;
    }

    console.log('[SilentCredential] Decrypted payload', decryptedPayload);

    if (!sessionId) {
      console.error('[SilentCredential] Missing sessionId — cannot save credential');
      return true;
    }

    await saveSilentCredential(decryptedPayload, silentPayload, sessionId, {
      notificationReceivedAtMs,
    });
  } catch (error) {
    console.error('Error decrypting new-user-credential-silent payload:', error);
  }

  return true;
};

export const registerFirebaseBackgroundHandler = () => {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    await handleSilentCredentialRemoteMessage(remoteMessage);
  });
};

// Function to get or request FCM token
export async function getFcmToken() {
  const existingToken = await AsyncStorage.getItem('fcm_token');
  if (!existingToken) {
    try {      
      const newToken = await messaging().getToken();
      if (newToken) {
        await AsyncStorage.setItem('fcm_token', newToken);
        return newToken;
      }
    } catch (error) {
      console.error('Error retrieving FCM token:', error);
      return null;
    }
  }
  return existingToken;
}

// Enhanced Firebase messaging hook with manual QR processing
const SHOW_BUTTONS_DELAY_MS = 300;

export default function useFirebaseMessaging(
  setMessageState: (state: boolean) => void, 
  setAccessState?: (state: boolean) => void,
  setButtonsEnabled?: (enabled: boolean) => void
) {  
  // Store pending QR data
  const [pendingQRData, setPendingQRData] = React.useState<string | null>(null);
  const pendingQRTypeRef = React.useRef<string | null>(null);
  const deactivateTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const showButtonsTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAccessCacheKeyRef = React.useRef<string | null>(null);

  const clearShowButtonsTimeout = React.useCallback(() => {
    if (showButtonsTimeoutRef.current) {
      clearTimeout(showButtonsTimeoutRef.current);
      showButtonsTimeoutRef.current = null;
    }
  }, []);
  
  // Create stable deactivateButtons function with useCallback
  const deactivateButtons = React.useCallback((options?: { preserveAccessCache?: boolean }) => {
    if (deactivateTimeoutRef.current) {
      clearTimeout(deactivateTimeoutRef.current);
      deactivateTimeoutRef.current = null;
    }
    clearShowButtonsTimeout();
    const accessCacheKey = pendingAccessCacheKeyRef.current;
    if (accessCacheKey && !options?.preserveAccessCache) {
      clearPreparedAccess(accessCacheKey);
      clearAccessConfirmation(accessCacheKey);
      pendingAccessCacheKeyRef.current = null;
    }
    setMessageState(false);
    setPendingQRData(null);
    pendingQRTypeRef.current = null;
    if (setAccessState) {
      setAccessState(false);
    }
    if (setButtonsEnabled) {
      setButtonsEnabled(false);
    }
  }, [clearShowButtonsTimeout, setMessageState, setAccessState, setButtonsEnabled]);
  
  // Function to process QR data manually when user allows
  const processQRData = React.useCallback(async () => {
    if (pendingQRData) {
      try {
        if (pendingAccessCacheKeyRef.current) {
          markAccessConfirmed(pendingAccessCacheKeyRef.current, Date.now());
        }
        const qrPayload = pendingQRData;
        const fallbackType = pendingQRTypeRef.current ?? undefined;
        const startedAt = Date.now();
        deactivateButtons({ preserveAccessCache: true });
        if (fallbackType) {
          await handleQRScan(qrPayload, fallbackType);
        } else {
          await handleQRScan(qrPayload);
        }
        // Clear pending data after processing
        setPendingQRData(null);
        pendingQRTypeRef.current = null;
      } catch (error) {
        console.error("Error in handleQRScan:", error);
        // Also deactivate on error
        deactivateButtons();
      }
    }
  }, [pendingQRData, deactivateButtons]);

  const handleIncomingMessage = React.useCallback(async (remoteMessage: any) => {
    const data = remoteMessage?.data ?? {};
    const action = data.action;
    const { rawPayload: qrData, parsedPayload: parsedQR } = getParsedQrPayload(data);

    if (await handleSilentCredentialRemoteMessage(remoteMessage)) {
      return;
    }

    if (parsedQR?.type === 'user-credential-decryption') {
      const credentials = Array.isArray(parsedQR.credentials) ? parsedQR.credentials : [];
      const credentialSecret = await getCredentialSecret();
      const decryptedCredentials: string[] = [];

      for (const credential of credentials) {
        const encryptedValue = await decryptFromBase64(credential, credentialSecret);
        if (encryptedValue !== null) {
          decryptedCredentials.push(encryptedValue);
        }
      }
      return;
    }

    const shouldShowButtons =
      action === 'show_allow_close' ||
      parsedQR?.action === 'show_allow_close' ||
      Boolean(qrData) ||
      Boolean(remoteMessage?.notification) ||
      Boolean(remoteMessage?.messageId);

    if (!shouldShowButtons) {
      return;
    }

    clearShowButtonsTimeout();

    if (typeof qrData === 'string') {
      setPendingQRData(qrData);
      pendingQRTypeRef.current = parsedQR
        ? null
        : (typeof data.type === 'string' ? data.type : null);
    } else if (qrData !== undefined && qrData !== null) {
      setPendingQRData(JSON.stringify(qrData));
      pendingQRTypeRef.current = null;
    } else {
      setPendingQRData(null);
      pendingQRTypeRef.current = null;
    }

    if (parsedQR?.qrCacheKey) {
      pendingAccessCacheKeyRef.current = parsedQR.qrCacheKey;
    }

    const normalizedType = normalizeAccessType(parsedQR?.type);
    if (normalizedType === 'domain-login' || normalizedType === 'applications') {
      prepareAccess(parsedQR).catch(error => {
        console.error('Error preparing access on FCM arrival:', error);
      });
    }

    showButtonsTimeoutRef.current = setTimeout(() => {
      setMessageState(true);
      if (setButtonsEnabled) {
        setButtonsEnabled(true);
      }
      showButtonsTimeoutRef.current = null;
    }, SHOW_BUTTONS_DELAY_MS);

    if (deactivateTimeoutRef.current) {
      clearTimeout(deactivateTimeoutRef.current);
      deactivateTimeoutRef.current = null;
    }
    deactivateTimeoutRef.current = setTimeout(() => {
      deactivateButtons();
    }, 10000);
  }, [clearShowButtonsTimeout, deactivateButtons, setButtonsEnabled, setMessageState]);
  
  useEffect(() => {
    const unsubscribeMessage = messaging().onMessage(handleIncomingMessage);
    const unsubscribeNotificationOpened = messaging().onNotificationOpenedApp(handleIncomingMessage);

    messaging()
      .getInitialNotification()
      .then(initialMessage => {
        if (initialMessage) {
          handleIncomingMessage(initialMessage);
        }
      })
      .catch(error => {
        console.error('Error reading initial notification:', error);
      });

    return () => {
      if (deactivateTimeoutRef.current) {
        clearTimeout(deactivateTimeoutRef.current);
        deactivateTimeoutRef.current = null;
      }
      clearShowButtonsTimeout();
      const accessCacheKey = pendingAccessCacheKeyRef.current;
      if (accessCacheKey) {
        clearPreparedAccess(accessCacheKey);
        clearAccessConfirmation(accessCacheKey);
        pendingAccessCacheKeyRef.current = null;
      }
      unsubscribeMessage();
      unsubscribeNotificationOpened();
    };
  }, [clearShowButtonsTimeout, handleIncomingMessage]);
  
  // Return both deactivateButtons and processQRData functions
  return { deactivateButtons, processQRData };
}