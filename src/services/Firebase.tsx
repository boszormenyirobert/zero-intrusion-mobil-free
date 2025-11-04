import firebase from '@react-native-firebase/app';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useEffect} from 'react';
import { handleQRScan } from './HandleQRScan';

if (!firebase.apps.length) {
  firebase.initializeApp({});
}

let allowAccess = false;
export const setAccessState = (allow:boolean) => {
  allowAccess=allow;
};

export async function getFcmToken() {
  const existingToken = await AsyncStorage.getItem('fcm_token');
  if (!existingToken) {
    try {      const newToken = await messaging().getToken();
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

export default function useFirebaseMessaging(setMessageState) {  
  useEffect(() => {
    const unsubscribeMessage = messaging().onMessage(async remoteMessage => {
      console.log('FCM message:', remoteMessage.data);
      const {action, qrData} = remoteMessage.data;

      if (action === 'show_allow_close') {
        setMessageState(true);
        
        // Set timer to reset messageState to false after 10 seconds
        setTimeout(() => {
          setMessageState(false);
          setAccessState(false);
        }, 10000);
        
        try {
        //  if (allowAccess) {
            console.log("Access allowed by user.");
            await handleQRScan(qrData.toString());
        //  }          
        } catch (error) {
          console.error("Error in handleQRScan:", error);
        }
      }
    });

    return () => {
      unsubscribeMessage();     
    };
  }, [setMessageState]);
}