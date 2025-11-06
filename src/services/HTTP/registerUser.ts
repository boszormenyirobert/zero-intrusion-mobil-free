/*
* The endpoint is responsible for setting or updating the username and phone number.
*/
import config from '../../config/environment';

// Exception HMAC the registerUser, and recovery
export const registerUser = async (body:any) => {
     await fetch(config.API_RECOVERY_SETTINGS, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
           'X-Extension-Auth': "HMAC "
        },
        body: JSON.stringify(body),
      });

      return false;
}