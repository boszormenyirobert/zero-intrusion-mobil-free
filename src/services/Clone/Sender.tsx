import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Button } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as deviceStrore from '../DeviceStore';

type SenderProps = {
  setView?: (view: string) => void;
};

const Sender: React.FC<SenderProps> = ({ setView }) => {
  const [qrValue, setQrValue] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const publicId = await deviceStrore.getPublicId();
      const privateId = await deviceStrore.getPrivateId();
      const secret = await deviceStrore.getSecret();
    //  const email = await deviceStrore.getEmail();
    //  const phone = await deviceStrore.getPhone();
      const type ="clone";
      setQrValue(JSON.stringify({ publicId, privateId, secret, type }));
    };    
    fetchData();
  }, []);

  return (
    <View style={styles.container}>
      {qrValue ? (
        <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12 }}>
          <QRCode
            value={qrValue}
            size={300}
          />
        </View>
      ) : null}
      <View style={{ paddingTop: 50 }}>
        <Button title="Back" onPress={() => setView && setView('default')} />
      </View>
    </View>
  );
};

export default Sender;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});