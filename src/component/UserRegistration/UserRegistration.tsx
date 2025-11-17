import React, { useEffect, useState } from 'react';
import { View, TextInput, Button, Text, Switch, ScrollView, Pressable } from 'react-native';
import getEncryptedIdentification from '../../services/Encrypter';
import { registerUser } from '../../services/HTTP/registerUser';
import { getFcmToken } from '../../services/Firebase';
import * as Keychain from 'react-native-keychain';
import styles from './UserRegistration.style';
import { COLORS } from './../../Colors.style';
import { useTranslation } from 'react-i18next';
import '../../i18n';
import * as i from '../../services/Interfaces/interfaces';
import * as Device from '../../services/DeviceStore';
import EntryStyle from '../../Entry.style';

export default function UserRegistration({
  setValidUser,
  setView
}: i.UserRegistrationProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    (async () => {
      const fetchedEmail = (await Device.getEmail()) ?? '';
      const fetchedPhone = (await Device.getPhone()) ?? '';
      setEmail(fetchedEmail);
      setPhone(fetchedPhone);
      console.log('Fetched email and phone from storage' + fetchedEmail + ', ' + fetchedPhone );
    })();
  }, []);  

  const handleSubmit = async () => {
    try {
      if (!email || !phone || !accepted) {
        return;
      }
      const data: typeof i.Device = await getEncryptedIdentification();
      data.email = email;
      data.phone = phone;
      data.privacyPolicy = accepted;
      data.fcmToken = await getFcmToken();

      await Keychain.setInternetCredentials('email', 'user', email);
      await Keychain.setInternetCredentials('phone', 'user', phone);
      await registerUser(data);

      setValidUser(true);
      setView?.('default');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <ScrollView  style={styles.container}>
      <Text style={styles.headLine}>{t('registration.title')}</Text>

      <Text style={styles.subLine}>
        {t('registration.description')}
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

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Switch value={accepted} onValueChange={setAccepted} />
        <Text style={styles.accept}>{t('registration.acceptTerms')}</Text>
      </View>

        <Pressable
          onPress={handleSubmit}
          style={({ pressed }) => [
            EntryStyle.button,
            {
              transform: [{ scale: pressed ? 0.95 : 1 }]
            }
          ]}
        >
          <Text style={[EntryStyle.btnText]}>Back</Text>
        </Pressable>        
     
    </ScrollView>
  );
}
