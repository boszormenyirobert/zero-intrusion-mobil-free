import React, { useRef,useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable, Animated } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';
import entryStyles from '../../Entry.style';

type AutoQRScannerProps = {
  onResult: (data: string) => void;
  setView?: any;
};

export default function AutoQRScanner({
  onResult,
  setView,
}: AutoQRScannerProps) {
  const [scanned, setScanned] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const device = useCameraDevice('back');
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const requestPermission = async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Denied',
          'Please enable camera access in settings to scan QR codes.',
          [{ text: 'OK' }],
        );
      }
    };
    requestPermission();
  }, []);

    useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  });

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      console.log('Scanned codes:', codes);
      if (!scanned && codes.length > 0) {
        setScanned(true);
        onResult(codes[0].value || '');
        setTimeout(() => setScanned(false), 2000);
      }
    },
  });

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission denied.</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No camera device found.</Text>
      </View>
    );
  }

 return (
    <View style={{ flex: 1 }}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        codeScanner={codeScanner}
      />

      {/* Overlay */}
      <View style={StyleSheet.absoluteFill}>
        <View style={entryStyles.animatedViewContainer}>
          <Animated.View
            style={[
              entryStyles.animatedView,
              { transform: [{ scale: scaleAnim }] }
            ]}
          />
        </View>
      </View>

      {/* Back gomb */}
      <View style={[entryStyles.backContainer]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlay: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    padding: 10,
    borderRadius: 8,
  },
  text: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 10 },
});
