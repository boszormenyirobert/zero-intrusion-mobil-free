import React, { useRef,useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable, Animated } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';
import entryStyles from '../../Entry.style';

type AutoQRScannerProps = {
  onResult: (data: string) => Promise<void>;
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
  const scanLockRef = useRef(false);
  const isMountedRef = useRef(true);

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

    return () => {
      isMountedRef.current = false;
    };
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
  }, [scaleAnim]);

  const processScannedCode = async (value: string) => {
    scanLockRef.current = true;
    if (isMountedRef.current) {
      setScanned(true);
    }

    try {
      await onResult(value);
    } finally {
      scanLockRef.current = false;
      if (isMountedRef.current) {
        setScanned(false);
      }
    }
  };

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      if (scanLockRef.current || codes.length === 0) {
        return;
      }

      console.log('Scanned codes:', codes);
      processScannedCode(codes[0].value || '').catch(error => {
        console.error('QR processing failed:', error);
      });
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
   <View style={styles.scannerContainer}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={!scanned}
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

      {/* Back */}
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
  scannerContainer: { flex: 1 },
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
