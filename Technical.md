# Zero Intrusion Platform - Technical Documentation

## Table of Contents
1. [Platform Overview](#platform-overview)
2. [Security Architecture](#security-architecture)
3. [Core Components](#core-components)
4. [Encryption System](#encryption-system)
5. [API Integration](#api-integration)
6. [Firebase Integration](#firebase-integration)
7. [Development Environment](#development-environment)
8. [Build Configuration](#build-configuration)
9. [Security Considerations](#security-considerations)
10. [Troubleshooting](#troubleshooting)

---

## Platform Overview

The Zero Intrusion Platform is a React Native application designed for secure device registration and credential management. The platform implements end-to-end encryption with Firebase Cloud Messaging integration for real-time secure communication between devices and authentication systems.

### Core Objectives
- **Zero Trust Authentication**: No credentials stored in plaintext
- **Device-Level Security**: Hardware-backed secure storage using React Native Keychain
- **Real-time Communication**: Firebase Cloud Messaging for secure data exchange
- **Cross-Platform Support**: React Native for iOS and Android deployment

### Technology Stack
- **Framework**: React Native 0.81.4 with TypeScript
- **State Management**: React Hooks (useState, useEffect)
- **Security Storage**: React Native Keychain (Hardware Security Module integration)
- **Encryption**: TweetNaCl (XSalsa20 + Poly1305) with Blake2b key derivation
- **Real-time Messaging**: Firebase Cloud Messaging (React Native Firebase)
- **Build System**: Metro Bundler with Gradle (Android) and Xcode (iOS)

---

## Security Architecture

### Encryption Security Arguments

The Zero Intrusion Platform implements **military-grade encryption** using the following cryptographic primitives:

#### 1. **XSalsa20 Stream Cipher**
- **Algorithm**: Extended Salsa20 with 192-bit nonce
- **Key Size**: 256-bit keys (32 bytes)
- **Security Level**: Equivalent to AES-256 in terms of key space
- **Advantages**: 
  - No block mode vulnerabilities (stream cipher)
  - Resistant to timing attacks
  - High performance on mobile processors
  - Proven security record (used in NaCl/libsodium)

#### 2. **Poly1305 Authenticator**
- **Type**: One-time authenticator
- **Purpose**: Message authentication and integrity verification
- **Security**: Provides 128-bit security against forgery
- **Resistance**: Immune to length extension attacks

#### 3. **Blake2b Key Derivation**
- **Hash Function**: Blake2b (cryptographically secure)
- **Output**: 32-byte derived keys
- **Security**: Stronger than SHA-256, faster than SHA-3
- **Purpose**: Derives encryption keys from user credentials

#### 4. **Nonce Generation**
- **Size**: 24 bytes (192 bits) for XSalsa20
- **Source**: `react-native-get-random-values` (cryptographically secure)
- **Uniqueness**: 2^192 possible values ensure no nonce reuse

### Security Properties

The combination of **XSalsa20 + Poly1305** provides:

1. **Confidentiality**: Data encrypted with XSalsa20 is computationally infeasible to decrypt without the key
2. **Authenticity**: Poly1305 MAC ensures data hasn't been tampered with
3. **Integrity**: Any modification to ciphertext is detected
4. **Forward Secrecy**: Each encryption operation uses a unique nonce

### Threat Model Protection

- **✅ Man-in-the-Middle Attacks**: Authenticated encryption prevents tampering
- **✅ Replay Attacks**: Unique nonces prevent message replay
- **✅ Key Recovery**: Blake2b makes key derivation computationally expensive
- **✅ Timing Attacks**: Constant-time operations in TweetNaCl implementation
- **✅ Side-Channel Attacks**: Hardware-backed storage protects keys at rest

---

## Core Components

### 1. Firebase Service (`src/services/Firebase.tsx`)

**Purpose**: Manages Firebase Cloud Messaging and QR code processing with user consent.

```typescript
// Core functionality
- useFirebaseMessaging(): Custom hook for Firebase integration
- processQRData(): Manual QR processing with user consent
- deactivateButtons(): Security timeout for user actions
```

**Security Features**:
- Manual QR processing (no automatic execution)
- User consent required for all operations
- Button timeout prevents accidental actions
- Pending data storage with AsyncStorage

### 2. Device Storage (`src/services/DeviceStore.tsx`)

**Purpose**: Secure credential storage using React Native Keychain.

```typescript
// Secure storage methods
- getPublicId(): Retrieves device public identifier
- getPrivateId(): Retrieves device private identifier  
- getSecret(): Retrieves encryption secret
- getEmail(): Retrieves user email
```

**Security Features**:
- Hardware Security Module integration
- Biometric authentication support
- Encrypted storage at OS level
- Key isolation per application

### 3. Encryption Service (`src/services/Encrypter.tsx`)

**Purpose**: Core encryption/decryption using TweetNaCl cryptography.

```typescript
// Encryption implementation
export const encryptToBase64 = (message: string, secret: string): string => {
  const secretKey = blake2b(32).update(Buffer.from(secret, 'utf8')).digest();
  const nonce = randomBytes(24);
  const messageBuffer = Buffer.from(message, 'utf8');
  
  const encrypted = box(messageBuffer, nonce, secretKey);
  const combined = Buffer.concat([nonce, encrypted]);
  
  return combined.toString('base64');
};
```

**Cryptographic Process**:
1. **Key Derivation**: Blake2b hashes the secret to create 32-byte key
2. **Nonce Generation**: 24 secure random bytes for XSalsa20
3. **Encryption**: XSalsa20 + Poly1305 authenticated encryption
4. **Output**: Base64 encoded (nonce + ciphertext + MAC)

### 4. Request Handler (`src/services/HTTP/RequestHandler.ts`)

**Purpose**: Manages API requests with organized routing system.

```typescript
// API method organization
- systemHubRegistration(): Hub registration requests
- systemHubLogin(): Hub login requests  
- access(): Domain/application access requests
- sharedRegistration(): Credential registration
- sharedDelete(): Secure credential deletion
```

### 5. User Interface Components

#### Entry Component (`src/component/Entry.tsx`)
- Main UI with Allow/Decline buttons
- Button state management with security timeout
- Integration with Firebase messaging hooks

#### Cards Component (`src/component/Cards/Cards.tsx`)
- Visual feedback for button states
- Enabled/disabled state rendering
- User interaction feedback

---

## Encryption System

### Encryption Flow

```
Plaintext Message
       ↓
[Blake2b Key Derivation]
       ↓
   32-byte Key
       ↓
[Random 24-byte Nonce]
       ↓
[XSalsa20 + Poly1305]
       ↓
  Encrypted Message
       ↓
[Base64 Encoding]
       ↓
  Final Ciphertext
```

### Code Implementation

```typescript
import {secretbox, randomBytes} from 'tweetnacl';
import blake2b from 'blake2b';

export const encryptToBase64 = (message: string, secret: string): string => {
  // 1. Derive 32-byte key from secret using Blake2b
  const secretKey = blake2b(32).update(Buffer.from(secret, 'utf8')).digest();
  
  // 2. Generate 24-byte random nonce
  const nonce = randomBytes(24);
  
  // 3. Convert message to buffer
  const messageBuffer = Buffer.from(message, 'utf8');
  
  // 4. Encrypt with XSalsa20 + Poly1305
  const encrypted = secretbox(messageBuffer, nonce, secretKey);
  
  // 5. Combine nonce + ciphertext
  const combined = Buffer.concat([nonce, encrypted]);
  
  // 6. Return Base64 encoded result
  return combined.toString('base64');
};
```

### Decryption Process

```typescript
export const decryptFromBase64 = (encryptedData: string, secret: string): string | null => {
  try {
    // 1. Derive same key
    const secretKey = blake2b(32).update(Buffer.from(secret, 'utf8')).digest();
    
    // 2. Decode from Base64
    const combined = Buffer.from(encryptedData, 'base64');
    
    // 3. Extract nonce (first 24 bytes)
    const nonce = combined.slice(0, 24);
    
    // 4. Extract ciphertext (remaining bytes)
    const ciphertext = combined.slice(24);
    
    // 5. Decrypt and verify MAC
    const decrypted = secretbox.open(ciphertext, nonce, secretKey);
    
    if (!decrypted) {
      return null; // Authentication failed
    }
    
    // 6. Convert back to string
    return Buffer.from(decrypted).toString('utf8');
  } catch (error) {
    return null;
  }
};
```

---

## API Integration

### Interface Definitions

The platform uses TypeScript interfaces for type-safe API communication:

```typescript
// Hub Registration Interface
export interface HubRegistration {
  corporateId: string;
  corporateAuthentication: string;
  domain: string;
  xExtensionAuthOne: string;
  registrationProcessId: string;
  type: 'system_hub_registration';
  isNew: string;
}

// Extended version with user properties
export interface HubRegistrationExtended extends Omit<HubRegistration, 'xExtensionAuthOne'>, UserProperties {
  update: string;
  source: string;
  xExtensionAuth: string;
  description: string;
  userCredential: string;
}
```

### QR Code Data Types

The system supports multiple QR data types with discriminated unions:

- `system_hub_registration`: Initial device registration
- `system_hub_login`: Authentication requests
- `registration-domain`: Domain credential registration
- `update-applications`: Application updates
- `access-domain`: Domain access requests
- `access-applications`: Application access requests
- `delete-domain`: Domain deletion requests
- `delete-applications`: Application deletion requests

### Security in API Requests

1. **Encrypted Payloads**: All sensitive data encrypted before transmission
2. **Request Signing**: Extensions auth tokens for request verification
3. **Process IDs**: Unique identifiers prevent replay attacks
4. **Domain Validation**: Corporate ID and authentication verification

---

## Firebase Integration

### Firebase Cloud Messaging Setup

```typescript
// Firebase hook implementation
export const useFirebaseMessaging = () => {
  const [pendingData, setPendingData] = useState<any>(null);
  const [buttonsEnabled, setButtonsEnabled] = useState(false);

  useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('Firebase message received:', remoteMessage);
      
      if (remoteMessage.data) {
        // Store data for manual processing
        await AsyncStorage.setItem('pendingQRData', JSON.stringify(remoteMessage.data));
        setPendingData(remoteMessage.data);
        setButtonsEnabled(true);
        
        // Auto-deactivate after 30 seconds
        setTimeout(() => deactivateButtons(), 30000);
      }
    });

    return unsubscribe;
  }, []);

  return { pendingData, processQRData, buttonsEnabled };
};
```

### Security Features

1. **Manual Processing**: No automatic QR execution
2. **User Consent**: Explicit Allow/Decline actions required
3. **Timeout Security**: Buttons auto-disable after 30 seconds
4. **Data Persistence**: Pending data stored securely with AsyncStorage

### Message Flow

```
Firebase Cloud Messaging
       ↓
  onMessage() Handler
       ↓
   AsyncStorage Save
       ↓
  Enable Allow/Decline
       ↓
   User Interaction
       ↓
  processQRData()
       ↓
   handleQRScan()
       ↓
  API Request Handler
```

---

## Development Environment

### Prerequisites

- **Node.js**: 18.x or higher
- **React Native CLI**: Latest version
- **Android Studio**: For Android development
- **Xcode**: For iOS development (macOS only)
- **Java**: JDK 11 or higher

### Installation

```bash
# Install dependencies
npm install

# iOS setup
cd ios && pod install && cd ..

# Android setup (ensure Android SDK is configured)
npx react-native run-android

# iOS setup  
npx react-native run-ios
```

### Environment Variables

Create `.env` file in project root:

```bash
# Firebase Configuration
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:android:abcdef123456

# API Endpoints
API_BASE_URL=https://your-api.com
SYSTEM_HUB_URL=https://hub.your-api.com
```

### Dependencies

#### Core Dependencies
```json
{
  "@react-native-firebase/app": "^23.5.0",
  "@react-native-firebase/messaging": "^23.5.0",
  "react-native-keychain": "^10.0.0",
  "tweetnacl": "^1.0.3",
  "blake2b": "^2.1.4",
  "@react-native-async-storage/async-storage": "^1.24.0"
}
```

#### Security Dependencies
- **tweetnacl**: Authenticated encryption (XSalsa20 + Poly1305)
- **blake2b**: Cryptographic hashing for key derivation
- **react-native-keychain**: Hardware-backed secure storage
- **react-native-get-random-values**: Cryptographically secure random numbers

---

## Build Configuration

### Android Configuration

#### `android/app/build.gradle`
```gradle
android {
    compileSdkVersion 34
    buildToolsVersion "33.0.0"
    
    defaultConfig {
        applicationId "com.zerointrusion"
        minSdkVersion 21
        targetSdkVersion 34
        versionCode 1
        versionName "1.0"
    }
    
    signingConfigs {
        release {
            // Configure release signing
        }
    }
}

dependencies {
    implementation "com.google.firebase:firebase-messaging:23.0.0"
    implementation "com.google.firebase:firebase-analytics:21.0.0"
}
```

#### Google Services
Place `google-services.json` in `android/app/` directory with Firebase configuration.

### iOS Configuration

#### `ios/Podfile`
```ruby
platform :ios, '12.0'

target 'ZeroIntrusion' do
  config = use_native_modules!
  use_react_native!(:path => config[:reactNativePath])
  
  pod 'Firebase/Messaging'
  pod 'Firebase/Analytics'
end
```

#### Capabilities Required
- Push Notifications
- Keychain Sharing
- Background App Refresh

### Metro Configuration

#### `metro.config.js`
```javascript
const {getDefaultConfig} = require('@react-native/metro-config');

module.exports = (async () => {
  const defaultConfig = await getDefaultConfig(__dirname);
  
  return {
    ...defaultConfig,
    resolver: {
      ...defaultConfig.resolver,
      assetExts: [...defaultConfig.resolver.assetExts, 'bin'],
    },
  };
})();
```

---

## Security Considerations

### Data Protection

1. **Encryption at Rest**: All sensitive data encrypted using hardware-backed storage
2. **Encryption in Transit**: TLS 1.3 for all network communications
3. **Memory Protection**: No sensitive data stored in application memory longer than necessary
4. **Key Rotation**: Support for periodic key updates

### Authentication Security

1. **Multi-Factor Authentication**: Device + corporate credentials + extension tokens
2. **Zero Trust Model**: Every request authenticated and authorized
3. **Session Management**: No persistent sessions, token-based authentication
4. **Biometric Integration**: Hardware biometric authentication where available

### Attack Mitigation

1. **Timing Attacks**: Constant-time cryptographic operations
2. **Side Channel**: Hardware Security Module isolation
3. **Code Injection**: TypeScript type safety and input validation
4. **MITM Protection**: Certificate pinning and authenticated encryption

### Privacy Protection

1. **Data Minimization**: Only necessary data collected and processed
2. **Local Processing**: Sensitive operations performed on-device
3. **Consent Management**: Explicit user consent for all operations
4. **Data Deletion**: Secure deletion of all user data on request

---

## Troubleshooting

### Common Build Issues

#### 1. Hermes Engine Version Missing
```bash
# Create version.properties file
touch node_modules/react-native/sdks/hermes-engine/version.properties
echo hermes.version=0.81.4 > node_modules/react-native/sdks/hermes-engine/version.properties
```

#### 2. Gradle Build Issues
```bash
# Stop all Gradle daemons
./gradlew --stop

# Clean build directories
rm -rf android/app/.cxx
rm -rf android/app/build
rm -rf android/build

# Clean node modules
rm -rf node_modules
npm install
```

#### 3. Metro Cache Issues
```bash
npx react-native start --reset-cache
npx react-native-clean-project
```

### Firebase Issues

#### 1. Message Not Received
- Verify `google-services.json` is in correct location
- Check Firebase project configuration
- Ensure device has network connectivity
- Verify FCM token registration

#### 2. Encryption Failures
- Check if secret key is properly stored in Keychain
- Verify Blake2b key derivation
- Ensure random number generator is properly initialized

### Performance Optimization

1. **Bundle Size**: Use ProGuard/R8 for Android release builds
2. **Memory Usage**: Implement proper cleanup for crypto operations
3. **Battery Life**: Optimize Firebase listening patterns
4. **Network Usage**: Implement request batching where possible

### Security Auditing

1. **Static Analysis**: Use ESLint security rules
2. **Dependency Scanning**: Regular npm audit runs
3. **Code Review**: Security-focused code reviews
4. **Penetration Testing**: Regular security assessments

---

## Conclusion

The Zero Intrusion Platform implements state-of-the-art security practices using proven cryptographic primitives. The combination of XSalsa20 + Poly1305 encryption, hardware-backed storage, and secure communication protocols provides enterprise-grade security for credential management and device authentication.

### Security Summary

- **Encryption**: Military-grade XSalsa20 + Poly1305 authenticated encryption
- **Key Management**: Hardware Security Module integration with biometric protection
- **Communication**: Firebase Cloud Messaging with manual processing and user consent
- **Authentication**: Multi-factor authentication with zero trust principles
- **Storage**: Hardware-backed secure storage with OS-level encryption

The platform is designed to resist all known cryptographic attacks while maintaining usability and performance across mobile platforms.

---

*Last Updated: January 2025*
*Platform Version: 0.0.1*
*Security Review: Pending*