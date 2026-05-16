/**
 * Show the default view, unless any device or user registration data is missing — in that case, 
 * force the registration view to appear. 
 * Device authentication data is automatically retrieved from the API via the Hub.
 */
import React, { useState, useEffect } from 'react';
import DeviceRegistration from '../../services/DeviceRegistration';
import Entry from './../../component/Entry';
import UserRegistration from '../../component/UserRegistration/UserRegistration';
import {
  getPrivacyPolicy,
  getPrivateId,
  getPublicId,
  getSecret,
  getEmail,
  getPhone,
  getCredentialSecret,
} from '../../services/DeviceStore';
import { getFcmToken } from './../../services/Firebase';

export default function MainScreen() {
  const [validUser, setValidUser] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isInitialized) return;
    
    (async () => {
      // Get/Request FCM token for push notifications
      await getFcmToken();
      // Initialize device registration identifications
      await DeviceRegistration.initialize();
      setIsInitialized(true);

      const privateId = await getPrivateId();
      const publicId = await getPublicId();
      const secret = await getSecret();
      const credentialSecret = await getCredentialSecret();
      const fcmToken = await getFcmToken();
      const email = await getEmail();
      const phone = await getPhone();
      const privacyPolicy = await getPrivacyPolicy();

      // Check private id,public id, secret, email, phone and policy acceptance, before allowing user to access main app
      if (!privateId || !publicId || !secret || !credentialSecret || !email || !phone || !privacyPolicy) {
        setValidUser(false);
      }
    })();
  }, [isInitialized]);

  return (
    <>
      {/** Show user registration view */}
      {!validUser && (
          <UserRegistration setValidUser={setValidUser} />
      )}

      {/** Allow default view */}
      {validUser && (        
          <Entry setValidUser={setValidUser} />       
      )}       
    </>
  );  
}
