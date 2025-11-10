import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import MainScreen from './src/screen/main/Main';
import BiometricService from './src/services/BiometricService';
import FingerprintService from './src/services/FingerprintService';
import FaceRecognitionService from './src/services/FaceRecognitionService';
import DeviceAuthService from './src/services/DeviceAuthService';

export default function HomeScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [_biometricCapabilities, setBiometricCapabilities] = useState<any>(null);
  const [selectedAuthMethod, setSelectedAuthMethod] = useState<string | null>(null);
  const [availableAuthMethods, setAvailableAuthMethods] = useState<any[]>([]);

  useEffect(() => {
    checkBiometricCapabilities();
  }, []);

  const checkBiometricCapabilities = async () => {
    try {
      console.log('🔍 Checking biometric capabilities...');
      const capabilities = await BiometricService.getCapabilities();
      const fingerprintCap = await FingerprintService.getCapabilities();
      const faceCap = await FaceRecognitionService.getCapabilities();
      
      console.log('📱 Biometric capabilities:', capabilities);
      console.log('👆 Fingerprint capabilities:', fingerprintCap);
      console.log('👤 Face capabilities:', faceCap);
      
      setBiometricCapabilities(capabilities);
      
      // Build available authentication methods
      const methods = [];
      
      // Check for fingerprint
      if (fingerprintCap.isAvailable) {
        methods.push({
          id: 'fingerprint',
          name: 'Fingerprint',
          icon: '👆',
          service: 'fingerprint'
        });
      }
      
      // Check for face recognition
      if (faceCap.isAvailable) {
        methods.push({
          id: 'face',
          name: 'Face Recognition',
          icon: '👤',
          service: 'face'
        });
      }
      
      // Check for pattern/PIN (always available as fallback)
      methods.push({
        id: 'pattern',
        name: 'Device PIN/Pattern',
        icon: '🔢',
        service: 'pattern'
      });
      
      setAvailableAuthMethods(methods);
      console.log('📋 Available auth methods:', methods);
      setIsLoading(false);
    } catch (error) {
      console.error('❌ Biometric capabilities check failed:', error);
      // Fallback to pattern only
      setAvailableAuthMethods([{
        id: 'pattern',
        name: 'Device PIN/Pattern',
        icon: '🔢',
        service: 'pattern'
      }]);
      setIsLoading(false);
    }
  };

  const handleAuthMethodSelect = async (method: any) => {
    setSelectedAuthMethod(method.id);
    try {
      console.log('🚀 Starting authentication with:', method.name);
      let result;

      switch (method.service) {
        case 'fingerprint':
          console.log('� Using Fingerprint Service');
          result = await FingerprintService.authenticate();
          break;
        case 'face':
          console.log('� Using Face Recognition Service');
          result = await FaceRecognitionService.authenticate();
          break;
        case 'pattern':
          console.log('🔢 Using Device PIN/Pattern Service');
          result = await DeviceAuthService.authenticate();
          break;
        default:
          console.log('🔒 Using Generic Biometric Service');
          result = await BiometricService.authenticate();
          break;
      }
      
      console.log('🔐 Authentication result:', result);
      
      if (result.success) {
        setIsAuthenticated(true);
      } else {
        const errorMessage = result.error || 'Authentication failed';
        console.error('❌ Authentication failed:', errorMessage);
        
        Alert.alert(
          'Authentication Error',
          errorMessage,
          [
            { text: 'OK', style: 'cancel' }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Authentication error:', error);
      Alert.alert(
        'Error',
        'An error occurred during authentication',
        [
          { text: 'OK', style: 'cancel' }
        ]
      );
    } finally {
      setSelectedAuthMethod(null);
    }
  };

  if (isAuthenticated) {
    return <MainScreen />;
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ZeroIntrusion</Text>
      <Text style={styles.subtitle}>Secure Access</Text>
      
      {availableAuthMethods.length > 0 ? (
        <View style={styles.menuContainer}>
          <Text style={styles.menuTitle}>Choose Authentication Method:</Text>
          
          {availableAuthMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.authButton, 
                selectedAuthMethod === method.id ? styles.selectedButton : null
              ]}
              onPress={() => handleAuthMethodSelect(method)}
              disabled={selectedAuthMethod !== null}
            >
              <Text style={styles.authButtonText}>
                {method.icon} {method.name}
              </Text>
            </TouchableOpacity>
          ))}
          
          {selectedAuthMethod && (
            <Text style={styles.authenticatingText}>
              Authenticating...
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            No authentication methods available on this device
          </Text>
          <TouchableOpacity style={styles.authButton} onPress={() => setIsAuthenticated(true)}>
            <Text style={styles.authButtonText}>Continue (test mode)</Text>
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
  menuContainer: {
    width: '100%',
    alignItems: 'center',
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 30,
    textAlign: 'center',
  },
  authButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 15,
    minWidth: 250,
  },
  selectedButton: {
    backgroundColor: '#FF9500',
    opacity: 0.7,
  },
  authButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  authenticatingText: {
    fontSize: 16,
    color: '#007AFF',
    marginTop: 20,
    fontStyle: 'italic',
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
  debugText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
  },
  testButton: {
    backgroundColor: '#34C759',
    marginTop: 10,
  },
});