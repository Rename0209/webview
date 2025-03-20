import CryptoJS from 'crypto-js';

// Encryption/Decryption utilities
const ENCRYPTION_KEY = 'superkeyahafood1'; // This should match the key used for encryption

export const decryptToken = (encryptedToken) => {
  try {
    // First decode the URL-safe token by replacing URL-safe chars
    const normalizedToken = encryptedToken
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // Create key from the secret phrase
    const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);

    // Decrypt the token using AES
    const decryptedData = CryptoJS.AES.decrypt(normalizedToken, key, {
      mode: CryptoJS.mode.ECB,          // Using ECB mode
      padding: CryptoJS.pad.Pkcs7       // PKCS7 padding (same as PKCS5 for AES)
    });

    // Convert the decrypted data to UTF-8 string
    return decryptedData.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

export const encryptToken = (plainText) => {
  try {
    // Encrypt the plain text using AES
    const encryptedData = CryptoJS.AES.encrypt(plainText, CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY), {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });
    
    // Convert encrypted data to base64 string
    return encryptedData.toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
}; 