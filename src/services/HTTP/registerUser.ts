/*
* The endpoint is responsible for setting or updating the username and phone number.
*/
import { API_RECOVERY_SETTINGS } from  '@env';

// Exception HMAC the registerUser, and recovery
export const registerUser = async (body:any) => {
     await fetch(API_RECOVERY_SETTINGS, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
           'X-Extension-Auth': "HMAC "
        },
        body: JSON.stringify(body),
      });

      return false;
}