import * as Keychain from 'react-native-keychain';

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
   * Device PIN/pattern is always available as fallback
   */
  static async isAvailable(): Promise<boolean> {
    return true; // Device PIN/pattern is always available
  }

  /**
   * Authenticate with device PIN/pattern/passcode
   */
  static async authenticate(): Promise<DeviceAuthResult> {
    try {
      console.log('🔢 Starting device PIN/pattern authentication...');

      // Force device authentication by using access control
      const options = {
        accessControl: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
        showModal: true,
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