import * as Keychain from 'react-native-keychain';

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
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      console.log('👆 Fingerprint biometry type:', biometryType);
      
      // Only return true for fingerprint/touch ID, not face recognition
      const isFingerprint = biometryType === Keychain.BIOMETRY_TYPE.FINGERPRINT || 
                           biometryType === Keychain.BIOMETRY_TYPE.TOUCH_ID;
      
      console.log('👆 Is fingerprint available:', isFingerprint);
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

      // Use fingerprint-specific authentication only
      const options = {
        authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
        showModal: true,
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