import React, { useState } from 'react';
import { View, Text } from 'react-native';
import styles from '../Entry.style';
import Cards from './Cards/Cards';
import { useTranslation } from 'react-i18next';
import '../i18n';
import AutoQRScanner from './AutoQRScanner/AutoQRScanner'; 
import { handleQRScan } from '../services/HandleQRScan';
import useFirebaseMessaging from '../services/Firebase';
import UserRegistration from './UserRegistration/UserRegistration';
import Clone from './Clone/Clone';
import * as i from '../services/Interfaces/interfaces';

export function ScanCode({
  setValidUser,
}: i.UserRegistrationProps) {
  const { t } = useTranslation();
  
  const [view, setView] = useState('default');
  // Firebase notification and access state management
  const [messageState, setMessageState] = useState(false);
  const [userAccessState, setUserAccessState] = useState(false);
  // Button state management for touchable controls
  const [buttonsEnabled, setButtonsEnabled] = useState(false);
  
  // Initialize Firebase messaging with state management
  const { deactivateButtons, processQRData } = useFirebaseMessaging(
    setMessageState, 
    setUserAccessState, 
    setButtonsEnabled
  );
  
  const handleScanner = async () => {
    setView('scanner');
  }
  const handleResetDevelopment = async () => {
    setView('reset');
  }  
  const handleClone = async () => {
     setView('clone'); 
  }
  const handleAllowAccess = async () => {
    // Only allow if buttons are enabled
    if (!buttonsEnabled) {
      return;
    }
    
    setUserAccessState(true);
    console.log("✅ Access granted by user");
    
    // Process the QR data now that user has allowed access
    await processQRData();
  }
  
  const handleDeclineAccess = async () => {
    // Only allow if buttons are enabled
    if (!buttonsEnabled) {
      console.log("🚫 Decline button is disabled - no action taken");
      return;
    }
    
    console.log("❌ Access declined by user");
    setUserAccessState(false);
    
    // For decline, we can deactivate immediately since no QR processing needed
    deactivateButtons();
  }

  const handleQRResult = (data: string) => {
    handleQRScan(data);
    setView('default');  
  };

return (
  <>
  {/* Default View */}
  {view === 'default' &&(
      <View style={styles.container}>
      
        <Text style={[styles.text, styles.capital,styles.headLine]}>{t('corporate')}</Text>   

        <Cards 
          type="scanCode"
          action={handleScanner}
          icon="qr_code"
        />
        <Cards 
          type="clone"
          action={handleClone}
          icon="clone"
        />    
        <Cards 
          type="reset"
          action={handleResetDevelopment}
          icon="reset"
        /> 
        <View style={styles.splittedRow}>
          <Cards 
            type='biometric'
            action={handleAllowAccess}
            icon="biometric"
            singleRow={false}
            position='left'
            enabled={buttonsEnabled}
            messageState={messageState}
          /> 
          <Cards 
            type='stop'
            action={handleDeclineAccess}
            icon="stop"
            singleRow={false}
            position='right'
            enabled={buttonsEnabled}
            messageState={messageState}
          /> 
        </View>
        
        {/* Show notification status */}
        {messageState && (
          <View style={styles.container}>
            <Text style={[styles.text, styles.capital]}>
              Firebase Notification Active
            </Text>
            <Text style={styles.text}>
              Access State: {userAccessState ? "Allowed" : "Denied"}
            </Text>
            <Text style={styles.text}>
              Buttons: {buttonsEnabled ? "Enabled" : "Disabled"}
            </Text>
          </View>
        )}
        
        <View style={styles.hr}/>
        <Text style={styles.rights}>{t('rights')}</Text>
        
      </View>
    )
  }
   {/* Scanner View */}
   {view === 'scanner' &&(
    <View style={styles.scannerContainer}>
      <AutoQRScanner onResult={handleQRResult} />
    </View>
   )}   

   {/* Update recovery user settings - email & phone */}
   {view === 'reset' &&(
      <UserRegistration 
      setValidUser={setValidUser} 
      setView={setView}
      />
   )}

   {/* Clone view */}
   {view === 'clone' &&(
      <Clone 
        onResult={handleQRResult}
        setView={setView}
      />
   )}   
  </>);
}

export default ScanCode;