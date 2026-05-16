import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useEffect} from 'react';
import { handleQRScan } from './HandleQRScan';
import { decryptFromBase64 } from './Encrypter';
import { getCredentialSecret } from './DeviceStore';
import {
  clearAccessConfirmation,
  clearPreparedAccess,
  markAccessConfirmed,
  prepareAccess,
} from './HTTP/PasswordManager/Shared/Access';

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
        const startedAt = Date.now();
        deactivateButtons({ preserveAccessCache: true });
        await handleQRScan(qrPayload);       
        // Clear pending data after processing
        setPendingQRData(null);
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
    const qrData = data.qrData ?? data.qr;

    let parsedQR: any = null;
    if (typeof qrData === 'string') {
      try {
        parsedQR = JSON.parse(qrData);
      } catch {
        parsedQR = null;
      }
    } else if (qrData && typeof qrData === 'object') {
      parsedQR = qrData;
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
    } else if (qrData !== undefined && qrData !== null) {
      setPendingQRData(JSON.stringify(qrData));
    } else {
      setPendingQRData(null);
    }

    if (parsedQR?.qrCacheKey) {
      pendingAccessCacheKeyRef.current = parsedQR.qrCacheKey;
    }

    if (parsedQR?.type === 'domain-login' || parsedQR?.type === 'applications') {
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