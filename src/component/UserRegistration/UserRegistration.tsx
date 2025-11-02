import React, { useState } from 'react';
import { View, TextInput, Button, Text, Switch, ScrollView } from 'react-native';
import getEncryptedIdentification from '../../services/Encrypter';
import { registerUser } from '../../services/HTTP/registerUser';
import { getFcmToken } from '../../services/Firebase';
import * as Keychain from 'react-native-keychain';
import styles from './UserRegistration.style';
import { COLORS } from './../../Colors.style';
import { useTranslation } from 'react-i18next';
import '../../i18n';

type UserRegistrationProps = {
  setValidUser: (valid: boolean) => void;
};

export default function UserRegistration({
  setValidUser,
}: UserRegistrationProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [accepted, setAccepted] = useState(false);

  const handleSubmit = async () => {
    try {
      if (!email || !phone || !accepted) {
        return;
      }
      const data = await getEncryptedIdentification();
      data.email = email;
      data.phone = phone;
      data.privacyPolicy = accepted;
      data.fcmToken = await getFcmToken();

      await Keychain.setInternetCredentials('email', 'user', email);
      await Keychain.setInternetCredentials('phone', 'user', phone);

      console.log('Encrypted Identification:', data);
      await registerUser(data);
      setValidUser(true);
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
        placeholderTextColor={COLORS.weight_dark}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder={t('registration.phonePlaceholder')}
        placeholderTextColor={COLORS.weight_dark}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      <View >
        <Switch value={accepted} onValueChange={setAccepted} />
        <Text style={styles.accept}>{t('registration.acceptTerms')}</Text>
      </View>

      <Button title="Regisztráció" onPress={handleSubmit} />
    </ScrollView>
  );
}
