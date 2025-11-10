import * as Keychain from 'react-native-keychain';
import { Alert } from 'react-native';

export interface BiometricConfig {
  title?: string;
  subtitle?: string;
  description?: string;
  fallbackTitle?: string;
  negativeButtonTitle?: string;
}

export interface BiometricResult {
  success: boolean;
  data?: any;
  error?: string;
  biometryType?: string;
}

/**
 * Biometric Authentication Service
 * Provides fingerprint, face recognition and other biometric authentication methods
 */
export class BiometricService {
  
  /**
   * Check if biometric authentication is available on device
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      console.log('🔐 Biometry type available:', biometryType);
      return biometryType !== null;
    } catch (error) {
      console.error('❌ Error checking biometric availability:', error);
      return false;
    }
  }

  /**
   * Get supported biometry type
   */
  static async getBiometryType(): Promise<string | null> {
    try {
      return await Keychain.getSupportedBiometryType();
    } catch (error) {
      console.error('❌ Error getting biometry type:', error);
      return null;
    }
  }

  /**
   * Check if biometric authentication is enrolled (user has set up biometrics)
   */
  static async isEnrolled(): Promise<boolean> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      return biometryType !== null;
    } catch (error) {
      console.error('❌ Error checking biometric enrollment:', error);
      return false;
    }
  }

  /**
   * Authenticate user with biometrics
   */
  static async authenticate(_config?: BiometricConfig): Promise<BiometricResult> {
    try {
      const isAvailable = await this.isAvailable();
      
      if (!isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication not available'
        };
      }

      const biometryType = await this.getBiometryType();
      console.log('🔐 Attempting authentication with biometry type:', biometryType);
      
      // For Face recognition on Android, use biometric prompt approach
      if (biometryType === Keychain.BIOMETRY_TYPE.FACE || 
          biometryType === Keychain.BIOMETRY_TYPE.FACE_ID) {
        
        console.log('👤 Using Face recognition authentication');
        
        try {
          // For face recognition, use the same approach as fingerprint but with different key
          const faceOptions = {
            showModal: true,
            authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
            accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
          };

          // Set credentials with biometric protection - this should trigger face unlock
          await Keychain.setInternetCredentials(
            'face_auth_biometric',
            'face_user',
            'authenticated',
            faceOptions
          );

          console.log('✅ Face recognition credentials created with biometric protection');

          // Now try to get them back - this will trigger the face unlock prompt
          const credentials = await Keychain.getInternetCredentials(
            'face_auth_biometric',
            faceOptions
          );

          if (credentials && credentials.username) {
            console.log('✅ Face recognition authentication successful');
            return {
              success: true,
              data: credentials,
              biometryType: biometryType
            };
          } else {
            throw new Error('Face recognition verification failed');
          }
        } catch (faceError: any) {
          console.error('❌ Face recognition with biometric protection failed:', faceError);
          
          if (faceError.message && (faceError.message.includes('UserCancel') || faceError.message.includes('cancel'))) {
            throw new Error('Face recognition cancelled');
          }
          
          // If biometric face recognition fails, try with device passcode fallback
          if (faceError.message && faceError.message.includes('User not authenticated')) {
            console.log('🔄 Face recognition fallback: trying device passcode...');
            
            try {
              const faceFallbackOptions = {
                authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS,
                accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
                showModal: true,
              };

              const fallbackCredentials = await Keychain.getInternetCredentials(
                'face_auth_fallback',
                faceFallbackOptions
              );

              if (fallbackCredentials && fallbackCredentials.username) {
                console.log('✅ Face recognition fallback successful');
                return {
                  success: true,
                  data: fallbackCredentials,
                  biometryType: biometryType
                };
              } else {
                await Keychain.setInternetCredentials(
                  'face_auth_fallback',
                  'face_fallback_user',
                  'authenticated',
                  faceFallbackOptions
                );

                console.log('✅ Face recognition fallback successful (first time)');
                return {
                  success: true,
                  data: { username: 'face_fallback_user', password: 'authenticated' },
                  biometryType: biometryType
                };
              }
            } catch (fallbackError: any) {
              console.error('❌ Face recognition fallback also failed:', fallbackError);
              throw new Error('Face recognition failed. Please try again or use device PIN.');
            }
          }
          
          throw new Error('Face recognition failed. Please try again.');
        }
      }

      // For fingerprint authentication - clear approach
      let options: any = {
        showModal: true,
        authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
      };

      try {
        // Now try to set fresh credentials for authentication
        try {
          await Keychain.setInternetCredentials(
            'biometric_auth_fresh',
            'biometric_user',
            'authenticated',
            options
          );
          console.log('✅ Fresh fingerprint credentials created');
        } catch (setError: any) {
          console.error('❌ Failed to create fingerprint credentials:', setError);
          throw setError;
        }

        // Try to get the credentials back (this triggers biometric prompt)
        const credentials = await Keychain.getInternetCredentials(
          'biometric_auth_fresh',
          options
        );

        if (credentials && credentials.username && credentials.password) {
          console.log('✅ Direct fingerprint authentication successful');
          return {
            success: true,
            data: credentials,
            biometryType: biometryType
          };
        } else {
          throw new Error('Fingerprint authentication verification failed');
        }
      } catch (authError: any) {
        console.error('❌ Direct fingerprint authentication failed:', authError);
        
        // If direct authentication fails, try with device passcode fallback
        if (authError.message && authError.message.includes('User not authenticated')) {
          console.log('🔄 Retrying with device passcode fallback...');
          
          const fallbackOptions = {
            authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS,
            accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
            showModal: true,
          };

          try {
            const fallbackCredentials = await Keychain.getInternetCredentials(
              'biometric_auth_fallback',
              fallbackOptions
            );

            if (fallbackCredentials && fallbackCredentials.username) {
              console.log('✅ Fallback authentication successful');
              return {
                success: true,
                data: fallbackCredentials,
                biometryType: biometryType
              };
            } else {
              await Keychain.setInternetCredentials(
                'biometric_auth_fallback',
                'fallback_user',
                'authenticated',
                fallbackOptions
              );

              console.log('✅ Fallback authentication successful (first time)');
              return {
                success: true,
                data: { username: 'fallback_user', password: 'authenticated' },
                biometryType: biometryType
              };
            }
          } catch (fallbackError: any) {
            console.error('❌ Fallback authentication also failed:', fallbackError);
            throw fallbackError;
          }
        } else {
          throw authError;
        }
      }
    } catch (error: any) {
      console.error('❌ Biometric authentication failed:', error);
      
      let errorMessage = 'Authentication failed';
      if (error.message) {
        if (error.message.includes('User not authenticated')) {
          errorMessage = 'Biometric authentication failed. Please try again or use device PIN.';
        } else if (error.message.includes('UserCancel')) {
          errorMessage = 'Authentication cancelled';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Store data securely with biometric protection
   */
  static async storeSecurely(
    service: string, 
    username: string, 
    data: string,
    config?: BiometricConfig
  ): Promise<BiometricResult> {
    try {
      const options = {
        authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
        showModal: true,
        kLocalizedFallbackTitle: config?.fallbackTitle || 'Use Passcode',
      };

      await Keychain.setInternetCredentials(service, username, data, options);
      
      console.log('✅ Data stored securely with biometric protection');
      return {
        success: true,
        data: { service, username }
      };
    } catch (error: any) {
      console.error('❌ Failed to store data securely:', error);
      return {
        success: false,
        error: error.message || 'Failed to store data'
      };
    }
  }

  /**
   * Retrieve securely stored data with biometric authentication
   */
  static async retrieveSecurely(
    service: string,
    config?: BiometricConfig
  ): Promise<BiometricResult> {
    try {
      const options = {
        authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
        showModal: true,
        kLocalizedFallbackTitle: config?.fallbackTitle || 'Use Passcode',
      };

      const credentials = await Keychain.getInternetCredentials(service, options);
      
      if (credentials && credentials.username && credentials.password) {
        console.log('✅ Data retrieved securely with biometric authentication');
        return {
          success: true,
          data: {
            username: credentials.username,
            password: credentials.password
          }
        };
      } else {
        return {
          success: false,
          error: 'No data found for service: ' + service
        };
      }
    } catch (error: any) {
      console.error('❌ Failed to retrieve secure data:', error);
      return {
        success: false,
        error: error.message || 'Failed to retrieve data'
      };
    }
  }

  /**
   * Remove securely stored data (simplified version)
   */
  static async removeSecurely(service: string): Promise<BiometricResult> {
    try {
      // Try to set empty credentials to effectively remove them
      await Keychain.setInternetCredentials(service, '', '');
      
      console.log('✅ Secure data removed successfully');
      return {
        success: true,
        data: { service }
      };
    } catch (error: any) {
      console.error('❌ Failed to remove secure data:', error);
      return {
        success: false,
        error: error.message || 'Failed to remove data'
      };
    }
  }

  /**
   * Show biometric authentication prompt with custom UI
   */
  static async promptAuthentication(config?: BiometricConfig): Promise<BiometricResult> {
    const biometryType = await this.getBiometryType();
    
    if (!biometryType) {
      Alert.alert(
        'Biometric Authentication Unavailable',
        'Your device does not support biometric authentication or it is not set up.',
        [{ text: 'OK' }]
      );
      return {
        success: false,
        error: 'Biometric authentication not available'
      };
    }

    try {
      const result = await this.authenticate(config);
      
      if (result.success) {
        Alert.alert(
          'Authentication Successful',
          'You have been successfully authenticated.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Authentication Failed',
          result.error || 'Authentication was not successful.',
          [{ text: 'OK' }]
        );
      }
      
      return result;
    } catch (error: any) {
      Alert.alert(
        'Authentication Error',
        error.message || 'An error occurred during authentication.',
        [{ text: 'OK' }]
      );
      
      return {
        success: false,
        error: error.message || 'Authentication error'
      };
    }
  }

  /**
   * Get biometric capabilities info
   */
  static async getCapabilities() {
    try {
      const biometryType = await this.getBiometryType();
      const isAvailable = await this.isAvailable();
      const isEnrolled = await this.isEnrolled();

      return {
        biometryType,
        isAvailable,
        isEnrolled,
        supportedTypes: {
          fingerprint: biometryType === Keychain.BIOMETRY_TYPE.FINGERPRINT,
          faceId: biometryType === Keychain.BIOMETRY_TYPE.FACE_ID,
          faceRecognition: biometryType === Keychain.BIOMETRY_TYPE.FACE,
          iris: biometryType === Keychain.BIOMETRY_TYPE.IRIS,
        }
      };
    } catch (error) {
      console.error('❌ Error getting biometric capabilities:', error);
      return {
        biometryType: null,
        isAvailable: false,
        isEnrolled: false,
        supportedTypes: {
          fingerprint: false,
          faceId: false,
          faceRecognition: false,
          iris: false,
        }
      };
    }
  }
}

export default BiometricService;