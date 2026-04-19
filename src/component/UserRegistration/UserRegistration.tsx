import React, { useEffect, useState } from 'react';
import { View, TextInput, Text, Switch, ScrollView, Pressable } from 'react-native';
import getEncryptedIdentification from '../../services/Encrypter';
import { registerUser } from '../../services/HTTP/registerUser';
import { requestDeviceRegistration } from '../../services/HTTP/registerDevice';
import { getFcmToken } from '../../services/Firebase';
import styles from './UserRegistration.style';
import { COLORS } from './../../Colors.style';
import { useTranslation } from 'react-i18next';
import '../../i18n';
import * as i from '../../services/Interfaces/interfaces';
import * as Device from '../../services/DeviceStore';
import config from '../../config/environment';
import EntryStyle from '../../Entry.style';

type RegistrationStep = 'details' | 'url';

const createEmptyProfile = (url: string): i.UserProfile => ({
  email: '',
  phone: '',
  privacyPolicy: false,
  publicId: '',
  privateId: '',
  secret: '',
  credentialSecret: '',
  url,
});

export default function UserRegistration({
  setValidUser,
  setView
}: i.UserRegistrationProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [url, setUrl] = useState(config.API_BASE);
  const [registrationStep, setRegistrationStep] = useState<RegistrationStep>('details');
  const [draftProfile, setDraftProfile] = useState<i.UserProfile | null>(null);
  const [activeProfileSnapshot, setActiveProfileSnapshot] = useState<i.UserProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const activeProfile = await Device.getActiveProfile();
      const fallbackProfile = createEmptyProfile(config.API_BASE);
      const profile = activeProfile ?? fallbackProfile;

      setActiveProfileSnapshot(profile);
      setEmail(profile.email ?? '');
      setPhone(profile.phone ?? '');
      setAccepted(Boolean(profile.privacyPolicy));
      setUrl(profile.url ?? config.API_BASE);
    })();
  }, []);  

  const resetToActiveProfile = () => {
    const profile = activeProfileSnapshot ?? createEmptyProfile(config.API_BASE);

    setDraftProfile(null);
    setRegistrationStep('details');
    setEmail(profile.email ?? '');
    setPhone(profile.phone ?? '');
    setAccepted(Boolean(profile.privacyPolicy));
    setUrl(profile.url ?? config.API_BASE);
  };

  const handleCreateProfileRequest = async () => {
    if (!url.trim()) {
      return;
    }

    setSubmitting(true);

    try {
      const deviceSecrets = await requestDeviceRegistration(url.trim());

      if (!deviceSecrets) {
        return;
      }

      setDraftProfile({
        ...createEmptyProfile(Device.normalizeApiBaseUrl(url)),
        ...deviceSecrets,
      });
      setEmail('');
      setPhone('');
      setAccepted(false);
      setRegistrationStep('details');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!email || !phone || !accepted || submitting) {
        return;
      }

      const sourceProfile = draftProfile ?? activeProfileSnapshot;
      if (!sourceProfile) {
        return;
      }

      setSubmitting(true);

      const normalizedEmail = email.trim().toLowerCase();
      const nextProfile: i.UserProfile = {
        ...sourceProfile,
        email: normalizedEmail,
        phone: phone.trim(),
        privacyPolicy: accepted,
      };
      const data: typeof i.Device = await getEncryptedIdentification(nextProfile);
      data.email = nextProfile.email;
      data.phone = nextProfile.phone;
      data.privacyPolicy = nextProfile.privacyPolicy;
      data.fcmToken = await getFcmToken();

      const isRegistered = await registerUser(data, nextProfile.url);
      if (!isRegistered) {
        return;
      }

      const savedProfile = await Device.saveProfile(nextProfile, {
        previousEmail: sourceProfile.email,
        setActive: true,
      });

      setActiveProfileSnapshot(savedProfile);
      setDraftProfile(null);
      setRegistrationStep('details');

      setValidUser(true);
      setView?.('default');
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView  style={styles.container}>
      <Text style={styles.headLine}>{t('registration.title')}</Text>

      {registrationStep === 'url' ? (
        <>
          <Text style={styles.subLine}>{t('registration.urlDescription')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('registration.urlPlaceholder')}
            placeholderTextColor={COLORS.white}
            autoCapitalize="none"
            autoCorrect={false}
            value={url}
            onChangeText={setUrl}
          />

          <View style={styles.buttonRow}>
            <Pressable
              onPress={resetToActiveProfile}
              style={({ pressed }) => [
                EntryStyle.button,
                styles.secondaryButton,
                {
                  transform: [{ scale: pressed ? 0.95 : 1 }]
                }
              ]}
            >
              <Text style={[EntryStyle.btnText]}>{t('registration.back')}</Text>
            </Pressable>

            <Pressable
              onPress={handleCreateProfileRequest}
              style={({ pressed }) => [
                EntryStyle.button,
                {
                  transform: [{ scale: pressed ? 0.95 : 1 }]
                }
              ]}
            >
              <Text style={[EntryStyle.btnText]}>
                {submitting ? t('registration.loading') : t('registration.next')}
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.subLine}>
            {t('registration.description')}
          </Text>

          <Text style={styles.profileUrlLabel}>
            {t('registration.currentUrl')}: {draftProfile?.url ?? activeProfileSnapshot?.url ?? config.API_BASE}
          </Text>

          <TextInput
            style={styles.input}
            placeholder={t('registration.emailPlaceholder')}
            placeholderTextColor={COLORS.white}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder={t('registration.phonePlaceholder')}
            placeholderTextColor={COLORS.white}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <View style={styles.switchContainer}>
            <Switch value={accepted} onValueChange={setAccepted} />
            <Text style={styles.accept}>{t('registration.acceptTerms')}</Text>
          </View>

          {draftProfile && (
            <Pressable
              onPress={() => setRegistrationStep('url')}
              style={({ pressed }) => [
                EntryStyle.button,
                styles.secondaryButton,
                {
                  transform: [{ scale: pressed ? 0.95 : 1 }]
                }
              ]}
            >
              <Text style={[EntryStyle.btnText]}>{t('registration.back')}</Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleSubmit}
            style={({ pressed }) => [
              EntryStyle.button,
              {
                transform: [{ scale: pressed ? 0.95 : 1 }]
              }
            ]}
          >
            <Text style={[EntryStyle.btnText]}>
              {submitting ? t('registration.loading') : t('registration.submit')}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setDraftProfile(null);
              setEmail('');
              setPhone('');
              setAccepted(false);
              setUrl(config.API_BASE);
              setRegistrationStep('url');
            }}
            style={({ pressed }) => [
              EntryStyle.button,
              styles.secondaryButton,
              {
                transform: [{ scale: pressed ? 0.95 : 1 }]
              }
            ]}
          >
            <Text style={[EntryStyle.btnText]}>{t('registration.addProfile')}</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}
