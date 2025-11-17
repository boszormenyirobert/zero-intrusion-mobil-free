import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as deviceStrore from '../DeviceStore';
import entryStyles from '../../Entry.style';

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
      {qrValue && (
        <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12 }}>
          <QRCode
            value={qrValue}
            size={300}
          />
        </View>
      )}
        <Pressable
          onPress={() => setView && setView('default')}
          style={({ pressed }) => [
            entryStyles.button,
            {
              transform: [{ scale: pressed ? 0.95 : 1 }]
            }
          ]}
        >
          <Text style={[entryStyles.btnText]}>Back</Text>
        </Pressable>
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