import React from 'react';
import { View, TouchableOpacity, Text, Image } from 'react-native';
import styles from '../../Entry.style';
import { COLORS } from '../../Colors.style';
import { useTranslation } from 'react-i18next';
import '../../i18n';
import { icons } from '../../services/Icons';

type CardProps = {
  type: 'scanCode' | 'pay' | 'reset' | 'biometric' | 'stop';
  action: () => void;
  icon: keyof typeof icons;
  singleRow?: boolean;
  position?: 'left' | 'right';
};

export const Cards: React.FC<CardProps> = ({
  type,
  action,
  icon,
  singleRow = true,
  position,
}) => {
    const { t } = useTranslation();    
    const cardData = {
        scanCode: {
            title: t('scanQRCode.title'),
            description:  t('scanQRCode.description'),
        },
        pay: {
            title: t('pay.title'),
            description: t('pay.description'),
        },
        reset: {
            title: t('reset.title'),
            description: t('reset.description')
        },
    } as const;
    const content = cardData[type];

  //single-row layout: User action card layout
  if (singleRow) {
    return (
      <TouchableOpacity style={styles.cardContainer} onPress={action}>
        <View style={styles.iconContainer}>
          <Image source={icons[icon]} style={[styles.iconSize, styles.icon]} />
        </View>
        <View style={styles.descriptionContainer}>
          <Text style={[styles.text, styles.capital, styles.left]}>
            {content.title}
          </Text>
          <Text style={[styles.text, styles.left]}>{content.description}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // multi-row layout: Allow || Decline request
  return (
    <TouchableOpacity
      style={[
        styles.cardContainer,        
        styles.justifyContent,
        styles.flex_01,
        position === 'right' ? styles.alert : undefined,
        position === 'left' ? styles.opticalPadding : undefined
      ]}
      onPress={action}
    >
      {position === 'left' && (
        <Image source={icons[icon]} style={[styles.iconSize, styles.icon, {'tintColor':COLORS.green}]} />
      )}
      {position === 'right' && (
        <Image source={icons[icon]} style={styles.iconSize} />
      )}
    </TouchableOpacity>
  );
};

export default Cards;
