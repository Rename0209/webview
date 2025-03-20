import CryptoJS from 'crypto-js';

// Encryption/Decryption utilities
const ENCRYPTION_KEY = 'superkeyahafood1'; // This should match the key used for encryption

export const decryptToken = (encryptedToken) => {
  try {
    // Decode the base64 encoded token
    const decryptedData = CryptoJS.AES.decrypt(encryptedToken, CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY), {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });

    // Convert decrypted data to string
    const decryptedString = decryptedData.toString(CryptoJS.enc.Utf8);
    
    return decryptedString;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}; 