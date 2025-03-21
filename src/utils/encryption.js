import CryptoJS from 'crypto-js';

const SECRET_KEY = 'superkeyahafood1';

export const decryptToken = (encryptedToken) => {
  try {
    // Convert the hex token to CryptoJS format
    const ciphertext = CryptoJS.enc.Hex.parse(encryptedToken);
    
    // Create key from the secret phrase
    const key = CryptoJS.enc.Utf8.parse(SECRET_KEY);

    // Decrypt the token using AES
    const decryptedData = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext },
      key,
      {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
      }
    );

    // Convert the decrypted data to UTF-8 string
    const result = decryptedData.toString(CryptoJS.enc.Utf8);
    if (!result) {
      throw new Error('Decryption resulted in empty string');
    }
    return result;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

export const encryptToken = (plainText) => {
  try {
    // Create key from the secret phrase
    const key = CryptoJS.enc.Utf8.parse(SECRET_KEY);

    // Encrypt the plain text using AES
    const encryptedData = CryptoJS.AES.encrypt(plainText, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });
    
    // Convert encrypted data to hex string
    return encryptedData.ciphertext.toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
}; 