import { API_RECOVERY_SETTINGS } from  '@env';

// Exception by HMAC the registerUser and registerDevice
export const registerUser = async (body:any) => {
     await fetch(API_RECOVERY_SETTINGS, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
           'X-Extension-Auth': `HMAC` 
        },
        body: JSON.stringify(body),
      });

      return false;

}