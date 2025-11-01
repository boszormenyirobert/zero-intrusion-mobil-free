import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

  export async function getFcmToken() {
    const existingToken = await AsyncStorage.getItem('fcm_token');
    if (!existingToken) {
      return await checkFcmToken();
    }
    return existingToken;
  }

  async function checkFcmToken(): Promise<string | null> {
    try {
      const newToken = await messaging().getToken();
      if (newToken) {
        console.log('New FCM token:', newToken);
        await AsyncStorage.setItem('fcm_token', newToken);
        return newToken;
      }
    } catch (error) {
      console.error('Error retrieving FCM token:', error);
      return null;
    }
  }

