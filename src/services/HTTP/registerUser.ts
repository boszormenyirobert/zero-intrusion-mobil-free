/*
* The endpoint is responsible for setting or updating the username and phone number.
*/
import { buildApiConfig } from '../../config/environment';
import { getApiUrl } from '../DeviceStore';
import { logHttpRequest, logHttpResponse } from './httpLogger';

// Exception HMAC the registerUser, and recovery
export const registerUser = async (body:any, apiBaseUrl?: string) => {
     const path = apiBaseUrl
      ? buildApiConfig(apiBaseUrl).API_RECOVERY_SETTINGS
      : await getApiUrl('API_RECOVERY_SETTINGS');

     const requestOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
           'X-Extension-Auth': "HMAC "
        },
        body: JSON.stringify(body),
      };

      logHttpRequest('registerUser', path, requestOptions);
      const response = await fetch(path, requestOptions);
      await logHttpResponse('registerUser', response);

      return response.ok;
};