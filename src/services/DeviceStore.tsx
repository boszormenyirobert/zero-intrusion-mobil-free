import * as Keychain from 'react-native-keychain';

const getPublicId = async (): Promise<string | null> => {
  try {
    const credentials = await Keychain.getInternetCredentials('publicId');
    if (credentials) {
      return credentials.password;  
    }
    return null;
  } catch (error) {
    console.error('Error retrieving publicId:', error);
    return null;
  }
};

const getPrivateId = async (): Promise<string | null> => {
  try {
    const credentials = await Keychain.getInternetCredentials('privateId');
    if (credentials) {
      return credentials.password;  
    }
    return null;
  } catch (error) {
    console.error('Error retrieving privateId:', error);
    return null;
  }
};

const getSecret = async (): Promise<string | null> => {
  try {
    const credentials = await Keychain.getInternetCredentials('secret');
    if (credentials) {
      return credentials.password;  
    }
    return null;
  } catch (error) {
    console.error('Error retrieving privateId:', error);
    return null;
  }
};

const getEmail = async (): Promise<string | null> => {
  try {
    const credentials = await Keychain.getInternetCredentials('email');
    if (credentials) {
      return credentials.password;  
    }
    return null;
  } catch (error) {
    console.error('Error retrieving privateId:', error);
    return null;
  }
};

const getPhone = async (): Promise<string | null> => {
  try {
    const credentials = await Keychain.getInternetCredentials('phone');
    if (credentials) {
      return credentials.password;  
    }
    return null;
  } catch (error) {
    console.error('Error retrieving privateId:', error);
    return null;
  }
};


export { getPrivateId, getPublicId, getSecret, getEmail, getPhone };
