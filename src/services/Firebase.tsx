import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useEffect} from 'react';
import { handleQRScan } from './HandleQRScan';

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
export default function useFirebaseMessaging(
  setMessageState: (state: boolean) => void, 
  setAccessState?: (state: boolean) => void,
  setButtonsEnabled?: (enabled: boolean) => void
) {  
  // Store pending QR data
  const [pendingQRData, setPendingQRData] = React.useState<string | null>(null);
  
  // Create stable deactivateButtons function with useCallback
  const deactivateButtons = React.useCallback(() => {
    console.log("Deactivating buttons until next notification");
    setMessageState(false);
    setPendingQRData(null);
    if (setAccessState) {
      setAccessState(false);
    }
    if (setButtonsEnabled) {
      setButtonsEnabled(false);
    }
  }, [setMessageState, setAccessState, setButtonsEnabled]);
  
  // Function to process QR data manually when user allows
  const processQRData = React.useCallback(async () => {
    if (pendingQRData) {
      try {
        await handleQRScan(pendingQRData);       
        // Clear pending data and deactivate after processing
        setPendingQRData(null);
        deactivateButtons();
      } catch (error) {
        console.error("Error in handleQRScan:", error);
        // Also deactivate on error
        deactivateButtons();
      }
    }
  }, [pendingQRData, deactivateButtons]);
  
  useEffect(() => {
    const unsubscribeMessage = messaging().onMessage(async remoteMessage => {
      const {action, qrData} = remoteMessage.data;

      if (action === 'show_allow_close') {
        // Activate notification and enable buttons
        setMessageState(true);
        if (setButtonsEnabled) {
          setButtonsEnabled(true);
        }
        
        // Store the QR data for later processing - DON'T process yet!
        setPendingQRData(qrData?.toString() || null);
        
        // Set timer to deactivate after 10 seconds
        setTimeout(() => {
          deactivateButtons();
        }, 10000);
      }
    });

    return () => {
      unsubscribeMessage();     
    };
  }, [setMessageState, setAccessState, setButtonsEnabled, deactivateButtons]);
  
  // Return both deactivateButtons and processQRData functions
  return { deactivateButtons, processQRData };
}