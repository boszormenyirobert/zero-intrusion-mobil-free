import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
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
      title: 'Send data',
      description: 'It shares your data securely via Bluetooth.',
      icon: 'pay',
    },
    receiver: {
      title: t('allow'),
      description: t('biometric.description'),
      icon: 'reset',
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
      <View>
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
      </View>
    </>
  );
}
