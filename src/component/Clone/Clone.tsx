import React from 'react';
import { View, Text, TouchableOpacity, Image, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import styles from '../../Entry.style';
import '../../i18n';
import { icons } from '../../services/Icons';
import Sender from '../../services/Clone/Sender';
import AutoQRScanner from './../AutoQRScanner/AutoQRScanner';

type AutoQRScannerProps = {
  onResult: (data: string) => void;
  setView: React.Dispatch<React.SetStateAction<string>>;
};

export default function Clone({ onResult, setView }: AutoQRScannerProps) {
  const { t } = useTranslation();
  const [showSender, setShowSender] = React.useState(false);
  const [showReceiver, setShowReceiver] = React.useState(false);

  const options = {
    sender: {
      title: t('clone.sender.title'),
      description: t('clone.sender.description'),
      icon: 'qr_show',
    },
    receiver: {
      title: t('clone.receiver.title'),
      description: t('clone.receiver.description'),
      icon: 'qr_read',
    },
  } as const;

  async function onClick(optionKey: keyof typeof options) {
    console.log('Clicked', optionKey);
    if (optionKey === 'sender') {
      setShowSender(true);
    } else if (optionKey === 'receiver') {
      console.log("Receiver option clicked");
      setShowReceiver(true);
    }
  }

  if (showSender) {
    return (
      <>
        <Sender 
        setView={setView}
        />
      </>
    );
  }

  if (showReceiver) {
    return (
      <>
        <View style={styles.scannerContainer}>
          <AutoQRScanner 
            onResult={onResult} 
            setView={setView}
          />
        </View>
      </>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <Text style={[styles.text, styles.capital,styles.headLine]}>{t('corporate')}</Text>  
        {Object.entries(options).map(([key, content]) => (
          <TouchableOpacity
            key={key}
            style={styles.cardContainer}
            onPress={() => onClick(key as keyof typeof options)}
          >
            <View style={styles.iconContainer}>
              <Image
                source={icons[content.icon]}
                style={[styles.iconSize, styles.icon]}
              />
            </View>
            <View style={styles.descriptionContainer}>
              <Text style={[styles.text, styles.capital, styles.left]}>
                {content.title}
              </Text>
              <Text style={[styles.text, styles.left]}>
                {content.description}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        <Text style={[styles.text, styles.confirmationText]}>
          To complete the clone successfully, the user must confirm their email address, phone number, and accept the privacy policy.
        </Text>
        <Pressable
          onPress={() => setView && setView('default')}
          style={({ pressed }) => [
            styles.button,
            {
              transform: [{ scale: pressed ? 0.95 : 1 }]
            }
          ]}
        >
          <Text style={[styles.btnText]}>Back</Text>
        </Pressable>
      </View>
    </>
  );
}
