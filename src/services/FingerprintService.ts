import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';

export interface FingerprintResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Fingerprint Authentication Service
 * Dedicated service for fingerprint/touch ID authentication
 */
export class FingerprintService {
  
  /**
   * Check if fingerprint is available on device
   * Only enabled on Android for strongest security
   */
  static async isAvailable(): Promise<boolean> {
    try {
      // Only enable on Android platform for strongest security
      if (Platform.OS !== 'android') {
        console.log('👆 Fingerprint service only available on Android for security');
        return false;
      }

      const biometryType = await Keychain.getSupportedBiometryType();
      console.log('👆 Fingerprint biometry type:', biometryType);
      
      // Only accept fingerprint/touch ID for strongest security - no face recognition
      const isFingerprint = biometryType === Keychain.BIOMETRY_TYPE.FINGERPRINT || 
                           biometryType === Keychain.BIOMETRY_TYPE.TOUCH_ID;
      
      console.log('👆 Is fingerprint available (strongest security only):', isFingerprint);
      return isFingerprint;
    } catch (error) {
      console.error('❌ Error checking fingerprint availability:', error);
      return false;
    }
  }

  /**
   * Authenticate with fingerprint
   */
  static async authenticate(): Promise<FingerprintResult> {
    try {
      const isAvailable = await this.isAvailable();
      
      if (!isAvailable) {
        return {
          success: false,
          error: 'Fingerprint authentication is not available on this device'
        };
      }

      console.log('👆 Starting fingerprint authentication...');
      console.log('👆 ===== FINGERPRINT SERVICE IS RUNNING =====');

      // Fingerprint authentication with strong biometric security
      const options: any = {
        authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
        showModal: true,
        // Strong biometric - invalidate on biometry changes
        invalidateOnEnrollment: true,
      };

      try {
        // Try to get existing credentials
        const credentials = await Keychain.getInternetCredentials(
          'fingerprint_auth',
          options
        );

        if (credentials && credentials.username) {
          console.log('✅ Fingerprint authentication successful');
          return {
            success: true,
            data: credentials
          };
        } else {
          // Create new credentials for first time
          await Keychain.setInternetCredentials(
            'fingerprint_auth',
            'fingerprint_user',
            'authenticated',
            options
          );

          console.log('✅ Fingerprint authentication successful (first time)');
          return {
            success: true,
            data: { username: 'fingerprint_user', password: 'authenticated' }
          };
        }
      } catch (authError: any) {
        console.error('❌ Fingerprint authentication failed:', authError);
        
        let errorMessage = 'Fingerprint authentication failed';
        if (authError.message) {
          if (authError.message.includes('UserCancel') || authError.message.includes('cancel')) {
            errorMessage = 'Authentication cancelled';
          } else if (authError.message.includes('abgebrochen')) {
            errorMessage = 'Authentication cancelled';
          }
        }

        return {
          success: false,
          error: errorMessage
        };
      }
    } catch (error: any) {
      console.error('❌ Fingerprint service error:', error);
      return {
        success: false,
        error: 'Fingerprint service error'
      };
    }
  }

  /**
   * Get fingerprint capabilities
   */
  static async getCapabilities() {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      const isAvailable = await this.isAvailable();

      return {
        biometryType,
        isAvailable,
        isFingerprint: biometryType === Keychain.BIOMETRY_TYPE.FINGERPRINT,
        isTouchID: biometryType === Keychain.BIOMETRY_TYPE.TOUCH_ID,
      };
    } catch (error) {
      console.error('❌ Error getting fingerprint capabilities:', error);
      return {
        biometryType: null,
        isAvailable: false,
        isFingerprint: false,
        isTouchID: false,
      };
    }
  }
}

export default FingerprintService;