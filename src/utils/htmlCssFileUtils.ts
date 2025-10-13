import CryptoJS from 'crypto-js';
import { secretKey } from '../constants';

export const getFileType = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return extension || 'text';
};

export const updateFileContent = (
  fileContents: {[key: string]: string},
  setFileContents: React.Dispatch<React.SetStateAction<{[key: string]: string}>>,
  fileName: string,
  content: string
) => {
  setFileContents(prev => ({
    ...prev,
    [fileName]: content
  }));
};

export const handleTabClick = (
  fileName: string,
  setActiveTab: React.Dispatch<React.SetStateAction<string>>,
  setEditorInstances: React.Dispatch<React.SetStateAction<{[key: string]: any}>>
) => {
  setActiveTab(fileName);
  // Force re-render of editor by clearing the instance for this file
  setEditorInstances(prev => {
    const newInstances = { ...prev };
    delete newInstances[fileName];
    return newInstances;
  });
};

export const encryptSessionData = (data: any): string => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), secretKey).toString();
};

export const decryptSessionData = (encryptedData: string): any => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch (error) {
    console.error('Error decrypting session data:', error);
    return null;
  }
};

export const getSessionValue = (key: string, defaultValue: string = ''): string => {
  const encryptedValue = sessionStorage.getItem(key);
  if (!encryptedValue) return defaultValue;
  
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedValue, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Error decrypting session value:', error);
    return defaultValue;
  }
};

export const setSessionValue = (key: string, value: string): void => {
  const encryptedValue = CryptoJS.AES.encrypt(value, secretKey).toString();
  sessionStorage.setItem(key, encryptedValue);
};

export const saveCodeToSession = (
  codeToSave: {[key: string]: string},
  sessionKey: string
): void => {
  const encryptedCode = encryptSessionData(codeToSave);
  sessionStorage.setItem(sessionKey, encryptedCode);
};

export const loadCodeFromSession = (sessionKey: string): {[key: string]: string} | null => {
  const encryptedCode = sessionStorage.getItem(sessionKey);
  if (!encryptedCode) return null;
  
  try {
    return decryptSessionData(encryptedCode);
  } catch (error) {
    console.error('Error loading code from session:', error);
    return null;
  }
};
