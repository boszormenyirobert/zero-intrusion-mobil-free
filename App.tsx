import React, { useState, useEffect } from 'react';
import { View, Text, Alert, Platform } from 'react-native';
import MainScreen from './src/screen/main/Main';
import StrongBiometricService from './src/services/StrongBiometricService';
import EntryStyles from './src/Entry.style';
import { COLORS } from './src/Colors.style';

export default function HomeScreen() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAuthMethod, setSelectedAuthMethod] = useState<string | null>(null);
  const [availableAuthMethods, setAvailableAuthMethods] = useState<any[]>([]);

  useEffect(() => {
    checkStrongBiometricCapabilities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const performStrongBiometricAuthentication = async () => {
    try {
      console.log('🔐 Starting automatic strong biometric authentication...');
      setSelectedAuthMethod('auto_strong_biometric');
      
      const result = await StrongBiometricService.authenticate();
      console.log('🔐 Automatic strong biometric authentication result:', result);
      
      if (result.success) {
        console.log('✅ AUTOMATIC STRONG BIOMETRIC authentication successful!');
        setIsAuthenticated(true);
      } else {
        const errorMessage = result.error || 'Strong biometric authentication failed';
        console.error('❌ Automatic strong biometric authentication failed:', errorMessage);
        
        Alert.alert(
          'Strong Biometric Authentication Failed',
          errorMessage,
          [
            { 
              text: 'Retry', 
              onPress: () => performStrongBiometricAuthentication() 
            },
            { 
              text: 'Cancel', 
              style: 'cancel',
              onPress: () => setSelectedAuthMethod(null)
            }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Automatic strong biometric authentication error:', error);
      Alert.alert(
        'Authentication Error',
        'An error occurred during automatic strong biometric authentication',
        [
          { 
            text: 'Retry', 
            onPress: () => performStrongBiometricAuthentication() 
          },
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => setSelectedAuthMethod(null)
          }
        ]
      );
    }
  };

  const checkStrongBiometricCapabilities = async () => {
    try {
      console.log('🔍 Checking STRONG BIOMETRIC ONLY capabilities...');
      
      // Use the new StrongBiometricService for true strong biometric authentication
      const strongBiometricCap = await StrongBiometricService.getCapabilities();
      const isStrongBiometricAvailable = await StrongBiometricService.isAvailable();
      
      console.log('=== STRONG BIOMETRIC ONLY (react-native-biometrics) ===');
      console.log('🔐 Strong biometric capabilities:', JSON.stringify(strongBiometricCap, null, 2));
      console.log('🔐 Strong biometric available:', isStrongBiometricAvailable);
      console.log('📱 Platform:', Platform.OS);
      console.log('=== END DEBUG ===');
      
      // Build available authentication methods - STRONG BIOMETRIC ONLY
      const methods = [];
      
      console.log('🔍 Building auth methods for STRONG BIOMETRIC ONLY mode...');
      
      // ONLY Strong Biometric allowed - no fallbacks for maximum security
      if (isStrongBiometricAvailable && strongBiometricCap.isStrongBiometric) {
        console.log('✅ Strong biometric available - STARTING AUTOMATIC AUTHENTICATION');
        
        // Automatically start strong biometric authentication
        await performStrongBiometricAuthentication();
        
        methods.push({
          id: 'strong_biometric_only',
          name: 'Strong Biometric Only',
          service: 'strong_biometric',
          securityLevel: 'strong',
          details: `${strongBiometricCap.biometryType} (Hardware-backed)`
        });
      } else {
        // If strong biometric is not available, show error - no fallbacks allowed
        console.log('❌ Strong biometric not available - ACCESS DENIED');
        console.log('❌ Strong biometric available:', isStrongBiometricAvailable);
        console.log('❌ Capabilities:', strongBiometricCap);
        methods.push({
          id: 'access_denied',
          name: 'Strong Biometric Required',
          service: 'none',
          securityLevel: 'denied',
          disabled: true,
          details: 'Device does not support hardware-backed strong biometrics'
        });
      }
      
      setAvailableAuthMethods(methods);
      console.log('📋 Available auth methods (STRONG BIOMETRIC ONLY):', methods);
      setIsLoading(false);
    } catch (error) {
      console.error('❌ Strong biometric capabilities check failed:', error);
      // In Strong Biometric Only mode, if capabilities check fails, deny access
      setAvailableAuthMethods([{
        id: 'capability_error',
        name: 'Strong Biometric Check Failed',
        service: 'none',
        securityLevel: 'denied',
        disabled: true,
        details: 'Failed to check strong biometric capabilities'
      }]);
      setIsLoading(false);
    }
  };

  if (isAuthenticated) {
    return <MainScreen />;
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>ZeroIntrusion</Text>
        <Text style={styles.loadingText}>Checking Strong Biometric Capabilities...</Text>
      </View>
    );
  }

  // If authentication is in progress
  if (selectedAuthMethod) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>ZeroIntrusion</Text>
        <Text style={styles.subtitle}>Strong Biometric Only Mode</Text>
        <Text style={styles.authenticatingText}>
          Authenticating with Strong Biometric...
        </Text>
        <Text style={styles.detailsText}>
          Please authenticate using your fingerprint or TouchID
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ZeroIntrusion</Text>
      <Text style={styles.subtitle}>Strong Biometric Only Mode</Text>
      
      {availableAuthMethods.length > 0 ? (
        <View style={styles.menuContainer}>
          {availableAuthMethods.map((method) => (
            <View key={method.id} style={styles.statusContainer}>
              <Text style={styles.statusText}>
                {method.name}
              </Text>
              {method.securityLevel === 'strong' && (
                <Text style={styles.securityLevelText}>
                  STRONG BIOMETRIC ONLY
                </Text>
              )}
              {method.securityLevel === 'denied' && (
                <Text style={styles.errorText}>
                  DEVICE NOT COMPATIBLE
                </Text>
              )}
              {method.details && (
                <Text style={styles.detailsText}>
                  {method.details}
                </Text>
              )}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Strong Biometric authentication is required but not available on this device
          </Text>
          <Text style={styles.errorText}>
            Please ensure your device supports fingerprint/TouchID authentication with hardware security.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = {
  container: {
    ...EntryStyles.container,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  title: {
    ...EntryStyles.headLine,
    color: COLORS.white,
    fontSize: 32,
    fontWeight: 'bold' as const,
    marginBottom: 10,
  },
  subtitle: {
    ...EntryStyles.text,
    fontSize: 18,
    marginBottom: 50,
    textAlign: 'center' as const,
  },
  loadingText: {
    ...EntryStyles.text,
    fontSize: 18,
    textAlign: 'center' as const,
  },
  menuContainer: {
    width: '100%' as const,
    alignItems: 'center' as const,
  },
  menuTitle: {
    ...EntryStyles.headLine,
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '600' as const,
    marginBottom: 30,
  },
  authButton: {
    ...EntryStyles.cardContainer,
    height: 'auto' as const,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 15,
    minWidth: 250 as const,
    justifyContent: 'center' as const,
  },
  strongSecurityButton: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  disabledButton: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  selectedButton: {
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.yellow,
  },
  authButtonText: {
    ...EntryStyles.text,
    fontSize: 18,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  disabledButtonText: {
    color: COLORS.weight_dark,
  },
  securityLevelText: {
    ...EntryStyles.text,
    fontSize: 12,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
    marginTop: 5,
  },
  detailsText: {
    ...EntryStyles.text,
    fontSize: 10,
    textAlign: 'center' as const,
    marginTop: 3,
    fontStyle: 'italic' as const,
  },
  authenticatingText: {
    ...EntryStyles.text,
    fontSize: 16,
    marginTop: 20,
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
  },
  errorContainer: {
    alignItems: 'center' as const,
    padding: 20,
  },
  errorText: {
    ...EntryStyles.text,
    fontSize: 16,
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  statusContainer: {
    ...EntryStyles.cardContainer,
    height: 'auto' as const,
    marginTop: 15,
    justifyContent: 'center' as const,
  },
  statusText: {
    ...EntryStyles.text,
    fontSize: 18,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
};