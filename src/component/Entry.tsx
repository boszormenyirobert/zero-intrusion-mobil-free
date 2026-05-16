import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
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
import { getActiveProfile, getProfiles, setActiveProfileByEmail } from '../services/DeviceStore';

export function ScanCode({
  setValidUser,
}: i.UserRegistrationProps) {
  const { t } = useTranslation();
  
  const [view, setView] = useState('default');
  const [profiles, setProfiles] = useState<i.UserProfile[]>([]);
  const [selectedProfileEmail, setSelectedProfileEmail] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
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

  useEffect(() => {
    if (view !== 'default') {
      setShowProfileDropdown(false);
      return;
    }

    const loadProfiles = async () => {
      const [storedProfiles, activeProfile] = await Promise.all([
        getProfiles(),
        getActiveProfile(),
      ]);

      setProfiles(storedProfiles.filter(profile => Boolean(profile.email)));
      setSelectedProfileEmail(activeProfile?.email ?? '');
    };

    loadProfiles();
  }, [view]);
  
  const handleScanner = async () => {
    setView('scanner');
  }
  const handleResetDevelopment = async () => {
    setView('reset');
  }
  const handleResetBack = () => {
    setView('default');
  }
  const handleClone = async () => {
     setView('clone'); 
  }
  const handleProfileSelect = async (email: string) => {
    const selectedProfile = await setActiveProfileByEmail(email);

    if (!selectedProfile) {
      return;
    }

    setSelectedProfileEmail(selectedProfile.email);
    setShowProfileDropdown(false);
  };
  const handleAllowAccess = async () => {
    // Only allow if buttons are enabled
    if (!buttonsEnabled) {
      return;
    }

    const confirmedAt = Date.now();
    console.log('User confirmed request. Starting processing timer.');
    
    setUserAccessState(true);
    
    // Process the QR data now that user has allowed access
    try {
      await processQRData();
      const elapsedMs = Date.now() - confirmedAt;
      console.log(`Confirmed request processed in ${elapsedMs} ms.`);
    } catch (error) {
      const elapsedMs = Date.now() - confirmedAt;
      console.error(`Confirmed request failed after ${elapsedMs} ms:`, error);
      throw error;
    }
  }
  
  const handleDeclineAccess = async () => {
    // Only allow if buttons are enabled
    if (!buttonsEnabled) {
      return;
    }
    
    setUserAccessState(false);
    
    // For decline, we can deactivate immediately since no QR processing needed
    deactivateButtons();
  }

  const handleQRResult = async (data: string) => {
    setView('default');

    try {
      await handleQRScan(data);
    } catch (error) {
      // Error handling removed console output
    } finally {
      deactivateButtons();
    }
  };

return (
  <>
  {/* Default View */}
  {view === 'default' &&(
      <View style={styles.container}>
      
        <Text style={[styles.text, styles.capital,styles.headLine]}>{t('corporate')}</Text>   

        {profiles.length > 0 && (
          <View style={styles.profileSelectorContainer}>
            <Text style={styles.profileSelectorLabel}>{t('registration.profileSelector')}</Text>
            <Pressable
              onPress={() => setShowProfileDropdown(current => !current)}
              style={({ pressed }) => [
                styles.profileSelectorButton,
                pressed && styles.profileSelectorButtonPressed,
              ]}
            >
              <Text style={styles.profileSelectorValue}>
                {selectedProfileEmail || t('registration.profileSelectorPlaceholder')}
              </Text>
            </Pressable>

            {showProfileDropdown && (
              <View style={styles.profileDropdown}>
                {profiles.map(profile => (
                  <Pressable
                    key={profile.email}
                    onPress={() => handleProfileSelect(profile.email)}
                    style={({ pressed }) => [
                      styles.profileDropdownItem,
                      profile.email === selectedProfileEmail && styles.profileDropdownItemActive,
                      pressed && styles.profileDropdownItemPressed,
                    ]}
                  >
                    <Text style={styles.profileDropdownText}>{profile.email}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

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
      <AutoQRScanner 
        onResult={handleQRResult}
        setView={setView} 
      />
    </View>
   )}   

   {/* Update recovery user settings - email & phone */}
   {view === 'reset' &&(
      <View style={styles.resetContainer}>
        <Pressable
          testID="reset-back-button"
          onPress={handleResetBack}
          style={({ pressed }) => [
            styles.resetBackButton,
            pressed && styles.profileSelectorButtonPressed,
          ]}
        >
          <Text style={styles.resetBackButtonText}>{t('registration.back')}</Text>
        </Pressable>
        <UserRegistration
          setValidUser={setValidUser}
          setView={setView}
        />
      </View>
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