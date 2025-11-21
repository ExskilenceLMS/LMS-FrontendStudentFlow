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

// Helper function to convert CryptoJS WordArray to Uint8Array
const wordArrayToByteArray = (wordArray: any): Uint8Array => {
  const bytes = new Uint8Array(wordArray.sigBytes);
  for (let i = 0; i < wordArray.sigBytes; i++) {
    const wordIdx = Math.floor(i / 4);
    const byteIdx = i % 4;
    bytes[i] = (wordArray.words[wordIdx] >>> (24 - byteIdx * 8)) & 0xff;
  }
  return bytes;
};

// Helper function to convert byte array to CryptoJS WordArray
const byteArrayToWordArray = (bytes: Uint8Array): any => {
  const words: number[] = [];
  for (let i = 0; i < bytes.length; i += 4) {
    words.push(
      (bytes[i] << 24) | 
      ((bytes[i + 1] || 0) << 16) | 
      ((bytes[i + 2] || 0) << 8) | 
      (bytes[i + 3] || 0)
    );
  }
  return CryptoJS.lib.WordArray.create(words, bytes.length);
};

export const decryptData = (encryptedData: string): string => {
  try {
    const fernetKey = getEncryptionKey();
    
    // Parse the Fernet token (Fernet uses URL-safe base64)
    // Convert URL-safe base64 to standard base64
    const standardBase64Token = encryptedData.replace(/-/g, '+').replace(/_/g, '/');
    const token = CryptoJS.enc.Base64.parse(standardBase64Token);
    
    // Parse the 32-byte Fernet key (also URL-safe base64)
    const standardBase64Key = fernetKey.replace(/-/g, '+').replace(/_/g, '/');
    const keyBuffer = CryptoJS.enc.Base64.parse(standardBase64Key);
    
    if (keyBuffer.sigBytes !== 32) {
      throw new Error(`Invalid Fernet key length: ${keyBuffer.sigBytes} bytes, expected 32`);
    }
    
    const signingKey = CryptoJS.lib.WordArray.create(keyBuffer.words.slice(0, 4), 16);
    const encryptionKey = CryptoJS.lib.WordArray.create(keyBuffer.words.slice(4, 8), 16);
    
    const tokenLength = token.sigBytes;
    
    if (tokenLength < 57) { // 1 + 8 + 16 + 0 + 32 = minimum 57 bytes
      throw new Error(`Invalid Fernet token length: ${tokenLength} bytes`);
    }
    
    // Extract version (should be 0x80)
    const version = (token.words[0] >>> 24) & 0xFF;
    if (version !== 0x80) {
      throw new Error(`Invalid Fernet version: 0x${version.toString(16)}, expected 0x80`);
    }
    
    const hmacStart = tokenLength - 32;
    
    // Convert token to bytes first for proper HMAC extraction
    const allTokenBytes = wordArrayToByteArray(token);
    
    // Extract token without HMAC (first hmacStart bytes)
    const tokenWithoutHmacBytes = allTokenBytes.slice(0, hmacStart);
    const tokenWithoutHmac = byteArrayToWordArray(tokenWithoutHmacBytes);
    
    // Extract received HMAC (last 32 bytes)
    const receivedHmacBytes = allTokenBytes.slice(hmacStart);
    const receivedHmac = byteArrayToWordArray(receivedHmacBytes);
    
    // Verify HMAC
    const calculatedHmac = CryptoJS.HmacSHA256(tokenWithoutHmac, signingKey);
    
    if (calculatedHmac.toString() !== receivedHmac.toString()) {
      throw new Error('Fernet HMAC verification failed');
    }
    
    // Extract IV (bytes 9-24)
    const ivStart = 9;
    const ivBytes = allTokenBytes.slice(ivStart, ivStart + 16);
    const iv = byteArrayToWordArray(ivBytes);
    
    // Extract ciphertext (bytes 25 to hmacStart)
    const ciphertextStart = 25;
    const ciphertextBytes = allTokenBytes.slice(ciphertextStart, hmacStart);
    const ciphertext = byteArrayToWordArray(ciphertextBytes);
    
    // Decrypt using AES-128-CBC
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext } as any,
      encryptionKey,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedString) {
      throw new Error('Fernet decryption resulted in empty string');
    }
    
    return decryptedString;
    
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

// Helper functions for conditional encryption/decryption based on URL and environment variables

/**
 * List of endpoints that should always be encrypted/decrypted regardless of environment settings
 */
export const ENCRYPTED_LOGIN_ENDPOINTS = [
  '/api/new-login/'
];

// Cache environment variables
class EncryptionConfig {
  private static instance: EncryptionConfig;
  private readonly encryptAllPayload: boolean | null;
  private readonly decryptAllResponse: boolean | null;
  private readonly baseUrl: string | null;
  private readonly encryptedEndpointsSet: Set<string>;

  private constructor() {
    // Cache environment variables once during initialization
    const encryptEnv = process.env.REACT_APP_ENCRYPT_ALL_PAYLOAD?.toLowerCase();
    const decryptEnv = process.env.REACT_APP_DECRYPT_ALL_RESPONSE?.toLowerCase();
    
    this.encryptAllPayload = encryptEnv === 'true' ? true : encryptEnv === 'false' ? false : null;
    this.decryptAllResponse = decryptEnv === 'true' ? true : decryptEnv === 'false' ? false : null;
    this.baseUrl = process.env.REACT_APP_BACKEND_URL || null;
    
    // Convert array to Set for O(1) lookup performance
    this.encryptedEndpointsSet = new Set(ENCRYPTED_LOGIN_ENDPOINTS);
  }

  public static getInstance(): EncryptionConfig {
    if (!EncryptionConfig.instance) {
      EncryptionConfig.instance = new EncryptionConfig();
    }
    return EncryptionConfig.instance;
  }

  /**
   * Check if URL matches any encrypted endpoint pattern
   */
  private matchesEncryptedEndpoint(url: string): boolean {
    // Use for...of with early return for better performance than .some()
    for (const pattern of this.encryptedEndpointsSet) {
      if (url.includes(pattern)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if URL belongs to the base backend URL
   */
  private isBaseBackendUrl(url: string): boolean {
    return this.baseUrl ? url.includes(this.baseUrl) : false;
  }

  /**
   * Determine if encryption/decryption should be applied
   * @param url - The API endpoint URL
   * @param isEncryption - true for encryption, false for decryption
   * @returns boolean indicating whether to encrypt/decrypt
   */
  public shouldProcess(url: string, isEncryption: boolean): boolean {
    const envSetting = isEncryption ? this.encryptAllPayload : this.decryptAllResponse;
    
    // Early return for specific endpoints (always process)
    if (this.matchesEncryptedEndpoint(url)) {
      return true;
    }
    
    // If environment variable is explicitly set to false, only process specific endpoints
    if (envSetting === false) {
      return false; // Already checked encrypted endpoints above
    }
    
    // If environment variable is set to true, process only base URL APIs
    if (envSetting === true) {
      return this.isBaseBackendUrl(url);
    }
    
    // Default behavior (null/undefined): only process specific endpoints
    return false; // Already checked encrypted endpoints above
  }
}

/**
 * Check if encryption should be applied based on environment variables and URL
 * @param url - The API endpoint URL
 * @returns boolean indicating whether to encrypt the payload
 */
export const shouldEncryptPayload = (url: string): boolean => {
  return EncryptionConfig.getInstance().shouldProcess(url, true);
};

/**
 * Check if decryption should be applied based on environment variables and URL
 * @param url - The API endpoint URL
 * @returns boolean indicating whether to decrypt the response
 */
export const shouldDecryptResponse = (url: string): boolean => {
  return EncryptionConfig.getInstance().shouldProcess(url, false);
};

/**
 * Conditionally encrypt JSON data based on URL and environment settings
 * @param data - The data to potentially encrypt
 * @param url - The API endpoint URL
 * @returns Encrypted data if conditions are met, otherwise original data
 */
export const conditionalEncryptJSON = (data: any, url: string): any => {
  // Early returns for performance
  if (!data) return data;
  if (!shouldEncryptPayload(url)) return data;
  
  try {
    const encryptedData = encryptJSON(data);
    return { data: encryptedData };
  } catch (error: any) {
    throw new EncryptionError(`Conditional encryption failed: ${error.message}`);
  }
};

/**
 * Conditionally decrypt JSON data based on URL and environment settings
 * @param responseData - The response data to potentially decrypt
 * @param url - The API endpoint URL
 * @returns Decrypted data if conditions are met, otherwise original data
 */
export const conditionalDecryptJSON = (responseData: any, url: string): any => {
  // Early returns for performance
  if (!responseData) return responseData;
  if (!shouldDecryptResponse(url)) return responseData;

  // Check if response has encrypted data structure
  if (
    typeof responseData === 'object' &&
    'data' in responseData &&
    typeof responseData.data === 'string'
  ) {
    try {
      return decryptJSON(responseData.data);
    } catch (error) {
      // Decryption failed, return original data
      console.warn('Conditional decryption failed, returning original data:', error);
      return responseData;
    }
  }

  return responseData;
};