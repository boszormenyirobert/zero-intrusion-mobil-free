import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import MainScreen from './src/screen/main/Main';
import BiometricService from './src/services/BiometricService';

export default function HomeScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricCapabilities, setBiometricCapabilities] = useState<any>(null);

  useEffect(() => {
    checkBiometricCapabilities();
  }, []);

  const checkBiometricCapabilities = async () => {
    try {
      console.log('🔍 Checking biometric capabilities...');
      const capabilities = await BiometricService.getCapabilities();
      console.log('📱 Biometric capabilities:', capabilities);
      setBiometricCapabilities(capabilities);
      setIsLoading(false);
    } catch (error) {
      console.error('❌ Biometric capabilities check failed:', error);
      setIsLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const result = await BiometricService.authenticate();
      if (result.success) {
        setIsAuthenticated(true);
      } else {
        Alert.alert(
          'Azonosítási hiba',
          result.error || 'Az azonosítás nem sikerült',
          [{ text: 'Újrapróbálás', onPress: handleBiometricAuth }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Hiba',
        'Az azonosítás során hiba történt',
        [{ text: 'Újrapróbálás', onPress: handleBiometricAuth }]
      );
    }
  };

  if (isAuthenticated) {
    return <MainScreen />;
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Ellenőrzés...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ZeroIntrusion</Text>
      <Text style={styles.subtitle}>Biztonságos hozzáférés</Text>
      
      {biometricCapabilities?.isAvailable ? (
        <TouchableOpacity style={styles.authButton} onPress={handleBiometricAuth}>
          <Text style={styles.authButtonText}>
            {biometricCapabilities.biometryType === 'FaceID' ? '🔒 Face ID' :
             biometricCapabilities.biometryType === 'TouchID' ? '👆 Touch ID' :
             biometricCapabilities.biometryType === 'Fingerprint' ? '👆 Ujjlenyomat' :
             biometricCapabilities.supportedTypes?.fingerprint ? '👆 Ujjlenyomat' :
             '🔒 Biometrikus azonosítás'}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Biometrikus azonosítás nem elérhető ezen az eszközön
          </Text>
          <Text style={styles.errorText}>
            Debug: {JSON.stringify(biometricCapabilities)}
          </Text>
          <TouchableOpacity style={styles.authButton} onPress={() => setIsAuthenticated(true)}>
            <Text style={styles.authButtonText}>Folytatás (teszt módban)</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 50,
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  authButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
  },
  authButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 20,
  },
});