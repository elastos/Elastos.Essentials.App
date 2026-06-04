export const AESEncrypt = async (content, password): Promise<string> => {
  const encrypt = (await import('crypto-js/aes')).encrypt;
  return encrypt(JSON.stringify({ content }), password).toString();
};

export const AESDecrypt = async (crypted, password): Promise<string> => {
  try {
    const enc = (await import('crypto-js')).enc;
    const decrypt = (await import('crypto-js/aes')).decrypt;

    const decryptedData = decrypt(crypted, password);
    if (!decryptedData) {
      throw new Error('Decryption failed: No data returned from decrypt function');
    }

    const decryptedString = decryptedData.toString(enc.Utf8);
    if (!decryptedString) {
      throw new Error('Decryption failed: Unable to convert to UTF-8 string');
    }

    const parsedData = JSON.parse(decryptedString);
    if (!parsedData || !parsedData.content) {
      throw new Error('Decryption failed: Invalid JSON structure or missing content field');
    }

    return parsedData.content;
  } catch (error) {
    console.error('AESDecrypt error:', {
      errorMessage: error.message,
      errorType: error.constructor.name,
      cryptedLength: crypted ? crypted.length : 'undefined',
      hasPassword: !!password,
      passwordLength: password ? password.length : 'undefined'
    });
    throw new Error(`AES decryption failed: ${error.message}`);
  }
};
