import firebase from '@react-native-firebase/app';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

if (!firebase.apps.length) {
  firebase.initializeApp({});
}

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

