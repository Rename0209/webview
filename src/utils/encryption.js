// Encryption/Decryption utilities
const ENCRYPTION_KEY = 'superkeyahafood1'; // This should match the key used for encryption

export const decryptToken = (encryptedToken) => {
  try {
    // Convert the encrypted token from base64
    const encryptedData = atob(encryptedToken);
    
    // Convert the encrypted data to a Uint8Array
    const encryptedArray = new Uint8Array(encryptedData.length);
    for (let i = 0; i < encryptedData.length; i++) {
      encryptedArray[i] = encryptedData.charCodeAt(i);
    }
    
    // XOR decryption with the key
    const decryptedArray = new Uint8Array(encryptedArray.length);
    for (let i = 0; i < encryptedArray.length; i++) {
      decryptedArray[i] = encryptedArray[i] ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
    }
    
    // Convert back to string
    let decryptedString = '';
    for (let i = 0; i < decryptedArray.length; i++) {
      decryptedString += String.fromCharCode(decryptedArray[i]);
    }
    
    return decryptedString;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}; 