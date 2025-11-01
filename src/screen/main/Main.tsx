import React, { useState, useEffect } from 'react';
import DeviceRegistration from '../../services/DeviceRegistration';
import Entry from './../../component/Entry';
import UserRegistration from '../../component/UserRegistration/UserRegistration';
import { getPrivateId, getPublicId, getSecret, getEmail, getPhone } from '../../services/DeviceStore';
import { getFcmToken } from './../../services/Firebase';

export default function MainScreen() {
  const [validUser, setValidUser] = useState(false);

  useEffect(() => {
    (async () => {
      // Initialize device registration identifications
      await DeviceRegistration.initialize();
      // Get/Request FCM token for push notifications
      await getFcmToken();
      
      const privateId = await getPrivateId();
      const publicId = await getPublicId();
      const secret = await getSecret();
      const fcmToken = await getFcmToken();
      const email = await getEmail();
      const phone = await getPhone();

      console.log('privateId from storage !!! :', privateId);
      console.log('publicId from storage !!! :', publicId);
      console.log('secret from storage !!! :', secret);  
      console.log('fcmToken from storage !!! :', fcmToken);
      console.log('email from storage !!! :', email);
      console.log('phone from storage !!! :', phone);

      // Check private id,public id, secret, email, phone and policy acceptance, before allowing user to access main app
      if(privateId && publicId && secret && email && phone) {
        setValidUser(true);
      }
    })();
  }, []);

  return validUser ? <Entry /> : <UserRegistration setValidUser={setValidUser} />;
}