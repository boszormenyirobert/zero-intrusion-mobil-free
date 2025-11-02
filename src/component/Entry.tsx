import React, { useState } from 'react';
import { View, Text } from 'react-native';
import styles from '../Entry.style';
import Cards from './Cards/Cards';
import { useTranslation } from 'react-i18next';
import '../i18n';
import AutoQRScanner from './AutoQRScanner/AutoQRScanner'; 
import { handleQRScan } from '../services/HandleQRScan';

const ScanCode: React.FunctionComponent = () => {
  const { t } = useTranslation();
  
  const [view, setView] = useState('default');
  
  const handleScanner = async () => {
    setView('scanner');
  }
  const handleResetDevelopment = async () => {
    console.log("handleResetDevelopment");
  }  
  const handlePrepay = async () => {
    console.log("handlePrepay");
  }
  const handleAllowAccess = async () => {
    console.log("handleAllowAccess");
  }
  const handleDeclineAccess = async () => {
    console.log("handleDeclineAccess");
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
          type="pay"
          action={handleResetDevelopment}
          icon="pay"
        />    
        <Cards 
          type="reset"
          action={handlePrepay}
          icon="reset"
        /> 
        <View style={styles.splittedRow}>
          <Cards 
            type='biometric'
            action={handleAllowAccess}
            icon="biometric"
            singleRow={false}
            position='left'
          /> 
          <Cards 
            type='stop'
            action={handleDeclineAccess}
            icon="stop"
            singleRow={false}
            position='right'
          /> 
        </View>
        
        <View style={styles.hr}/>
        <Text style={styles.rights}>{t('rights')}</Text>
        
      </View>
    )
  }
   {/* Scanner View */}
   {view === 'scanner' &&(
    <View style={{ flex: 1 }}>
      <AutoQRScanner onResult={handleQRResult} />
    </View>
   )}   
  </>);
}

export default ScanCode;