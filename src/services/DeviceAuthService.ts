import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';

export interface DeviceAuthResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Device PIN/Pattern Authentication Service
 * Dedicated service for device PIN, pattern, or passcode authentication
 */
export class DeviceAuthService {
  
  /**
   * Device PIN/pattern is available as fallback when stronger auth is not available
   * Only used when fingerprint authentication is not available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      // On Android, only use as fallback if fingerprint is not available
      if (Platform.OS === 'android') {
        const biometryType = await Keychain.getSupportedBiometryType();
        const hasFingerprint = biometryType === Keychain.BIOMETRY_TYPE.FINGERPRINT || 
                              biometryType === Keychain.BIOMETRY_TYPE.TOUCH_ID;
        
        // Only available as fallback when fingerprint is not available
        const isAvailableAsFallback = !hasFingerprint;
        console.log('🔢 DeviceAuth available as fallback on Android:', isAvailableAsFallback);
        return isAvailableAsFallback;
      }
      
      // On iOS, always available as fallback
      return true;
    } catch (error) {
      console.error('❌ Error checking device auth availability:', error);
      return true; // Fallback to always available in case of error
    }
  }

  /**
   * Authenticate with device PIN/pattern/passcode
   */
  static async authenticate(): Promise<DeviceAuthResult> {
    try {
      console.log('🔢 Starting device PIN/pattern authentication...');
      console.log('🔢 ===== DEVICE AUTH SERVICE IS RUNNING =====');

      // Force device authentication with strong access control
      const options = {
        accessControl: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
        showModal: true,
        // Strong security - require fresh authentication
        touchID: false,
        biometryType: false,
      };

      try {
        // Try to get existing credentials with device passcode protection
        const credentials = await Keychain.getInternetCredentials(
          'device_auth_secure',
          options
        );

        if (credentials && credentials.username) {
          console.log('✅ Device PIN/pattern authentication successful');
          return {
            success: true,
            data: credentials
          };
        } else {
          // Create new credentials for first time with device passcode protection
          await Keychain.setInternetCredentials(
            'device_auth_secure',
            'device_user',
            'authenticated',
            options
          );

          console.log('✅ Device PIN/pattern authentication successful (first time)');
          return {
            success: true,
            data: { username: 'device_user', password: 'authenticated' }
          };
        }
      } catch (authError: any) {
        console.error('❌ Device authentication failed:', authError);
        
        let errorMessage = 'Device authentication failed';
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
      console.error('❌ Device auth service error:', error);
      return {
        success: false,
        error: 'Device authentication service error'
      };
    }
  }

  /**
   * Get device authentication capabilities
   */
  static async getCapabilities() {
    return {
      isAvailable: true,
      authType: 'device_passcode',
      supportsPin: true,
      supportsPattern: true,
      supportsPassword: true,
    };
  }
}

export default DeviceAuthService;