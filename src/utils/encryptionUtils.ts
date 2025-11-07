import CryptoJS from 'crypto-js';

export class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

export class DecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecryptionError';
  }
}

const getEncryptionKey = (): string => {
  const encryptionKey = process.env.REACT_APP_ENCRYPTION_KEY || '';
  
  if (!encryptionKey) {
    throw new EncryptionError('ENCRYPTION_KEY not configured');
  }
  
  return encryptionKey;
};

export const encryptData = (data: string): string => {
  try {
    const fernetKey = getEncryptionKey();
    
    const keyBuffer = CryptoJS.enc.Base64.parse(fernetKey);
    const signingKey = CryptoJS.lib.WordArray.create(keyBuffer.words.slice(0, 4), 16);
    const encryptionKey = CryptoJS.lib.WordArray.create(keyBuffer.words.slice(4, 8), 16);
    
    const version = CryptoJS.lib.WordArray.create([0x80000000], 1);
    
    const timestamp = Math.floor(Date.now() / 1000);
    const timestampHigh = Math.floor(timestamp / 0x100000000);
    const timestampLow = timestamp >>> 0;
    const timestampBytes = CryptoJS.lib.WordArray.create([timestampHigh, timestampLow], 8);
    
    const iv = CryptoJS.lib.WordArray.random(16);
    
    const encrypted = CryptoJS.AES.encrypt(data, encryptionKey, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    const tokenWithoutHmac = version.clone()
      .concat(timestampBytes)
      .concat(iv)
      .concat(encrypted.ciphertext);
    
    const hmac = CryptoJS.HmacSHA256(tokenWithoutHmac, signingKey);
    const finalToken = tokenWithoutHmac.concat(hmac);
    
    return CryptoJS.enc.Base64.stringify(finalToken);
    
  } catch (error: any) {
    throw new EncryptionError(`Failed to encrypt data: ${error.message}`);
  }
};

export const decryptData = (encryptedData: string): string => {
  try {
    const fernetKey = getEncryptionKey();
    
    const token = CryptoJS.enc.Base64.parse(encryptedData);
    
    const keyBuffer = CryptoJS.enc.Base64.parse(fernetKey);
    const signingKey = CryptoJS.lib.WordArray.create(keyBuffer.words.slice(0, 4), 16);
    const encryptionKey = CryptoJS.lib.WordArray.create(keyBuffer.words.slice(4, 8), 16);
    
    const tokenLength = token.sigBytes;
    const hmacStart = tokenLength - 32;
    const tokenWithoutHmac = CryptoJS.lib.WordArray.create(token.words, hmacStart);
    const receivedHmac = CryptoJS.lib.WordArray.create(
      token.words.slice(Math.floor(hmacStart / 4)),
      32
    );
    
    const calculatedHmac = CryptoJS.HmacSHA256(tokenWithoutHmac, signingKey);
    if (calculatedHmac.toString() !== receivedHmac.toString()) {
      throw new Error('HMAC verification failed');
    }
    
    const ivStart = 9;
    const iv = CryptoJS.lib.WordArray.create(
      token.words.slice(Math.floor(ivStart / 4), Math.floor((ivStart + 16) / 4)),
      16
    );
    
    const ciphertextStart = 25;
    const ciphertextLength = hmacStart - ciphertextStart;
    const ciphertext = CryptoJS.lib.WordArray.create(
      token.words.slice(Math.floor(ciphertextStart / 4), Math.floor(hmacStart / 4)),
      ciphertextLength
    );
    
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext } as any,
      encryptionKey,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
    return decrypted.toString(CryptoJS.enc.Utf8);
    
  } catch (error: any) {
    throw new DecryptionError(`Failed to decrypt data: ${error.message}`);
  }
};

export const encryptJSON = (data: any): string => {
  try {
    const jsonString = JSON.stringify(data);
    return encryptData(jsonString);
  } catch (error: any) {
    throw new EncryptionError(`Failed to encrypt JSON data: ${error.message}`);
  }
};

export const decryptJSON = (encryptedData: string): any => {
  try {
    const decryptedString = decryptData(encryptedData);
    return JSON.parse(decryptedString);
  } catch (error: any) {
    if (error instanceof DecryptionError) {
      throw error;
    }
    throw new DecryptionError(`Failed to decrypt JSON data: ${error.message}`);
  }
};