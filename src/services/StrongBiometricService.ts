import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';

export interface StrongBiometricResult {
  success: boolean;
  data?: any;
  error?: string;
  biometryType?: string;
}

/**
 * Strong Biometric Authentication Service
 * Uses react-native-biometrics for true Strong Biometric-only authentication
 * - allowDeviceCredentials: false (NO PIN/Pattern fallbacks)
 * - securityLevel: STRONG (Hardware-backed strong biometrics only)
 * - Only fingerprint/TouchID allowed, NO face recognition
 */
export class StrongBiometricService {
  
  private static rnBiometrics = new ReactNativeBiometrics({
    allowDeviceCredentials: false,  // CRITICAL: No device PIN/pattern fallbacks
  });

  /**
   * Check if strong biometric authentication is available
   * Only returns true for fingerprint/TouchID with hardware security
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const { available, biometryType } = await this.rnBiometrics.isSensorAvailable();
      
      console.log('🔐 Strong biometric sensor available:', available);
      console.log('🔐 Strong biometric type:', biometryType);
      
      if (!available) {
        console.log('❌ No biometric sensor available');
        return false;
      }

      // STRONG BIOMETRIC ONLY: Only allow fingerprint/TouchID
      // NO face recognition for maximum security
      const isStrongBiometric = biometryType === BiometryTypes.Biometrics || 
                               biometryType === BiometryTypes.TouchID;
      
      const isFaceRecognition = biometryType === BiometryTypes.FaceID;
      
      if (isFaceRecognition) {
        console.log('❌ Face recognition detected - BLOCKED for strong biometric policy');
        return false;
      }

      console.log('🔐 Strong biometric available (fingerprint/TouchID only):', isStrongBiometric);
      return isStrongBiometric;
    } catch (error) {
      console.error('❌ Error checking strong biometric availability:', error);
      return false;
    }
  }

  /**
   * Get biometric sensor details
   */
  static async getCapabilities() {
    try {
      const { available, biometryType } = await this.rnBiometrics.isSensorAvailable();
      const isStrongAvailable = await this.isAvailable();
      
      return {
        available,
        biometryType,
        isStrongBiometric: isStrongAvailable,
        isFingerprint: biometryType === BiometryTypes.Biometrics,
        isTouchID: biometryType === BiometryTypes.TouchID,
        isFaceID: biometryType === BiometryTypes.FaceID,
        securityLevel: 'STRONG'
      };
    } catch (error) {
      console.error('❌ Error getting strong biometric capabilities:', error);
      return {
        available: false,
        biometryType: null,
        isStrongBiometric: false,
        isFingerprint: false,
        isTouchID: false,
        isFaceID: false,
        securityLevel: 'NONE'
      };
    }
  }

  /**
   * Authenticate with strong biometric only
   * NO fallbacks, NO device credentials, hardware-backed security only
   */
  static async authenticate(): Promise<StrongBiometricResult> {
    try {
      const isAvailable = await this.isAvailable();
      
      if (!isAvailable) {
        return {
          success: false,
          error: 'Strong biometric authentication not available. Only fingerprint/TouchID with hardware security is supported.'
        };
      }

      console.log('🔐 Starting STRONG BIOMETRIC ONLY authentication...');
      console.log('🔐 ===== STRONG BIOMETRIC SERVICE ACTIVE =====');

      // Use simplePrompt for strong biometric authentication
      const result = await this.rnBiometrics.simplePrompt({
        promptMessage: 'Strong Biometric Authentication',
        cancelButtonText: 'Cancel'
      });

      console.log('🔐 Strong biometric authentication result:', result);

      if (result.success) {
        console.log('✅ Strong biometric authentication successful');
        const capabilities = await this.getCapabilities();
        return {
          success: true,
          data: {
            biometryType: capabilities.biometryType,
            securityLevel: 'STRONG',
            timestamp: new Date().toISOString()
          },
          biometryType: capabilities.biometryType
        };
      } else {
        const errorMessage = result.error || 'Strong biometric authentication failed';
        console.log('❌ Strong biometric authentication failed:', errorMessage);
        return {
          success: false,
          error: errorMessage
        };
      }
    } catch (error: any) {
      console.error('❌ Strong biometric service error:', error);
      return {
        success: false,
        error: `Strong biometric authentication error: ${error.message || error}`
      };
    }
  }

  /**
   * Check if device supports hardware-backed biometric keys
   */
  static async supportsHardwareKeys(): Promise<boolean> {
    try {
      const { keysExist } = await this.rnBiometrics.biometricKeysExist();
      return keysExist;
    } catch (error) {
      console.error('❌ Error checking hardware keys:', error);
      return false;
    }
  }

  /**
   * Create hardware-backed biometric keys (optional for enhanced security)
   */
  static async createKeys(): Promise<boolean> {
    try {
      const { publicKey } = await this.rnBiometrics.createKeys();
      console.log('🔐 Hardware-backed biometric keys created:', !!publicKey);
      return !!publicKey;
    } catch (error) {
      console.error('❌ Error creating biometric keys:', error);
      return false;
    }
  }
}

export default StrongBiometricService;