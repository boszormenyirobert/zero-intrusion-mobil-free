import * as Keychain from 'react-native-keychain';

export interface FaceRecognitionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Face Recognition Authentication Service
 * Dedicated service for face recognition/face ID authentication
 */
export class FaceRecognitionService {
  
  /**
   * Check if face recognition is available on device
   * DISABLED for strongest security - face recognition is less secure than fingerprint
   */
  static async isAvailable(): Promise<boolean> {
    try {
      // Face recognition disabled for strongest security
      // Only fingerprint authentication allowed for maximum security
      console.log('👤 Face recognition disabled for strongest security policy');
      return false;
    } catch (error) {
      console.error('❌ Error checking face recognition availability:', error);
      return false;
    }
  }

  /**
   * Authenticate with face recognition
   */
  static async authenticate(): Promise<FaceRecognitionResult> {
    try {
      const isAvailable = await this.isAvailable();
      
      if (!isAvailable) {
        return {
          success: false,
          error: 'Face recognition is not available on this device'
        };
      }

      console.log('👤 Starting face recognition authentication...');
      console.log('👤 ===== FACE RECOGNITION SERVICE IS RUNNING =====');

      // Use the same approach as fingerprint but for face recognition
      const options = {
        showModal: true,
        kLocalizedFallbackTitle: 'Use Device Passcode',
        touchID: true,
        showPrompt: true,
        authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
      };

      const credentials = await Keychain.getInternetCredentials('face_auth', options);

      if (credentials && credentials.username) {
        console.log('✅ Face recognition authentication successful');
        return {
          success: true,
          data: credentials
        };
      } else {
        // First time - create credentials
        await Keychain.setInternetCredentials(
          'face_auth',
          'face_user',
          'authenticated',
          options
        );

        console.log('✅ Face recognition setup and authentication successful');
        return {
          success: true,
          data: { username: 'face_user', password: 'authenticated' }
        };
      }
    } catch (error: any) {
      console.error('❌ Face recognition authentication failed:', error);
      
      let errorMessage = 'Face recognition failed';
      if (error.message) {
        if (error.message.includes('UserCancel') || error.message.includes('cancel')) {
          errorMessage = 'Face recognition cancelled';
        } else if (error.message.includes('User not authenticated')) {
          errorMessage = 'Face recognition failed. Please try again.';
        }
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get face recognition capabilities
   */
  static async getCapabilities() {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      const isAvailable = await this.isAvailable();

      return {
        biometryType,
        isAvailable,
        isFace: biometryType === Keychain.BIOMETRY_TYPE.FACE,
        isFaceID: biometryType === Keychain.BIOMETRY_TYPE.FACE_ID,
      };
    } catch (error) {
      console.error('❌ Error getting face recognition capabilities:', error);
      return {
        biometryType: null,
        isAvailable: false,
        isFace: false,
        isFaceID: false,
      };
    }
  }
}

export default FaceRecognitionService;