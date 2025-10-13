/**
 * Shared HTML/CSS Editor Utilities
 * 
 * This file contains common utilities and logic shared between
 * HTMLCSSEditor.tsx and HTMLCSSCodeEditor.tsx to reduce duplication
 */

import CryptoJS from "crypto-js";
import { secretKey } from "../constants";
import { QUESTION_STATUS } from "../constants/constants";
import { autoSaveHTMLCode, getAutoSavedHTMLCode, cleanupAutoSavedHTMLCode } from "./autoSaveUtils";
import { validateBasicHTMLStructure } from "./htmlStructureValidation";
import { validateCode, validateStructure, generateHTMLPreview } from "./htmlCssValidationUtils";

// Common interfaces
export interface Tab {
  name: string;
  type: string;
}

export interface CodeValidation {
  [key: string]: {
    template: string;
    structure?: any[];
  };
}

export interface QuestionData {
  Qn_name: string;
  Page_Name: string;
  level: string;
  subtopic_id: string;
  type: string;
  Tabs: Tab[];
  Qn: string;
  requirements: string;
  Code_Validation: CodeValidation;
  defaulttemplate?: string;
  Template?: string;        
  image_path: string;
  video_path: string;
  CreatedBy: string;
  CreatedOn: string;
  LastUpdated: string;
  status?: boolean;
  score?: string;
  entered_ans?: {[key: string]: string};
  image_urls?: Array<{actualUrl: string, expectedUrl: string}>;
}

// Session storage utilities
export const decryptSessionValue = (key: string, defaultValue: string = ''): string => {
  try {
    const encryptedValue = sessionStorage.getItem(key);
    if (!encryptedValue) {
      console.warn(`Session storage key '${key}' not found, using default value`);
      return defaultValue;
    }
    return CryptoJS.AES.decrypt(encryptedValue, secretKey).toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error(`Error decrypting session storage key '${key}':`, error);
    return defaultValue;
  }
};

export const encryptSessionValue = (value: string): string => {
  return CryptoJS.AES.encrypt(value, secretKey).toString();
};

// File content management
export const initializeFileContents = (
  question: QuestionData,
  sessionKey: string,
  isSubmitted: boolean
): {[key: string]: string} => {
  const fileContents: {[key: string]: string} = {};
  
  // Process each file in Code_Validation
  Object.keys(question.Code_Validation).forEach(fileName => {
    // Check if question is submitted and has entered_ans
    if (question.status === true && question.entered_ans && question.entered_ans[fileName]) {
      fileContents[fileName] = question.entered_ans[fileName];
    } else if (fileName === 'index.html') {
      // Use defaulttemplate for index.html if not submitted
      fileContents[fileName] = question.defaulttemplate || '';
    } else {
      // Other files start empty if not submitted
      fileContents[fileName] = '';
    }
  });
  
  return fileContents;
};

// Auto-save utilities
export const loadAutoSavedCode = async (
  question: QuestionData,
  sessionKey: string,
  studentId: string,
  testId: string,
  isSubmitted: boolean
): Promise<{[key: string]: string}> => {
  const fileContents = initializeFileContents(question, sessionKey, isSubmitted);
  
  // Check session storage first for auto-saved code
  const encryptedSessionCode = sessionStorage.getItem(sessionKey);
  
  if (encryptedSessionCode) {
    // Load from session storage if available
    try {
      const decryptedCode = CryptoJS.AES.decrypt(encryptedSessionCode, secretKey).toString(CryptoJS.enc.Utf8);
      const sessionCode = JSON.parse(decryptedCode);
      
      // Merge session code with current file contents
      Object.keys(sessionCode).forEach(fileName => {
        if (fileContents.hasOwnProperty(fileName)) {
          fileContents[fileName] = sessionCode[fileName];
        }
      });
    } catch (error) {
      console.error('Error loading session storage code:', error);
    }
  } else if (!isSubmitted) {
    // Only fetch from backend if no session storage data AND question is not submitted
    try {
      const autoSavedCode = await getAutoSavedHTMLCode(question.Qn_name, studentId, testId, process.env.REACT_APP_BACKEND_URL!);
      if (autoSavedCode) {
        // Merge auto-saved code with current file contents
        Object.keys(autoSavedCode).forEach(fileName => {
          if (fileContents.hasOwnProperty(fileName)) {
            fileContents[fileName] = autoSavedCode[fileName];
          }
        });
      }
    } catch (error) {
      console.error('Error loading auto-saved code from backend:', error);
    }
  }
  
  return fileContents;
};

// Code validation utilities
export const validateCodeWithStructure = async (
  currentCode: string,
  activeTab: string,
  questionData: QuestionData,
  setSuccessMessage: (msg: string) => void,
  setAdditionalMessage: (msg: string) => void,
  setStructureErrorMessage: (msg: string) => void,
  setHasRunCode: (hasRun: boolean) => void,
  setTestResults: (results: any) => void,
  setStructureResults: (results: any) => void,
  setSelectedTestCaseIndex: (index: number | null) => void
) => {
  // First check basic HTML structure for HTML files
  if (activeTab.endsWith('.html')) {
    const basicStructureCheck = validateBasicHTMLStructure(currentCode);
    if (!basicStructureCheck.isValid) {
      let errorMessage = '';
      
      if (basicStructureCheck.missingElements.length > 0) {
        errorMessage += `Missing elements: ${basicStructureCheck.missingElements.join(', ')}. `;
      }
      
      if (basicStructureCheck.structureErrors.length > 0) {
        errorMessage += `Structure errors: ${basicStructureCheck.structureErrors.join(', ')}.`;
      }
      
      setSuccessMessage("Wrong Answer");
      setAdditionalMessage("You have not passed all the test cases.");
      setStructureErrorMessage(errorMessage);
      setHasRunCode(true);
      
      // Clear test results when structure validation fails
      setTestResults((prev: any) => ({
        ...prev,
        [activeTab]: []
      }));
      setStructureResults((prev: any) => ({
        ...prev,
        [activeTab]: []
      }));
      
      setSelectedTestCaseIndex(null);
      return { results: [], structureResults: [] }; // Stop validation here if basic structure is missing
    }
  }
  
  const results = await validateCode(currentCode, activeTab, questionData, validateBasicHTMLStructure);
  const structureValidationResults = await validateStructure(currentCode, activeTab, questionData);
  
  // Update test results for current file
  setTestResults((prev: any) => ({
    ...prev,
    [activeTab]: results
  }));
  
  // Update structure results for current file
  setStructureResults((prev: any) => ({
    ...prev,
    [activeTab]: structureValidationResults
  }));
  
  // Mark that code has been run
  setHasRunCode(true);
  
  // Clear structure error message for successful validation
  setStructureErrorMessage('');
  
  return { results, structureResults: structureValidationResults };
};

// Success rate calculation
export const calculateSuccessRate = (results: any[]): number => {
  const passedTests = results.filter((result: any) => {
    // Handle both boolean results (HTML/CSS) and object results (JavaScript)
    if (typeof result === 'boolean') {
      return result;
    } else if (typeof result === 'object' && result !== null) {
      return result.passed;
    }
    return false;
  }).length;
  
  const totalTests = results.length;
  return totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
};

// Status message utilities
export const setValidationMessages = (
  successRate: number,
  setSuccessMessage: (msg: string) => void,
  setAdditionalMessage: (msg: string) => void
) => {
  if (successRate === 100) {
    setSuccessMessage("Congratulations!");
    setAdditionalMessage("You have passed all the test cases. Click the submit code button.");
  } else {
    setSuccessMessage("Wrong Answer");
    setAdditionalMessage("You have not passed all the test cases.");
  }
};

// Check if a message should be displayed in green (success) or red (error)
export const isSuccessMessage = (message: string): boolean => {
  const successMessages = [
    "Congratulations!",
    "Code submitted successfully!",
    "Success",
    "Passed",
    "Correct"
  ];
  return successMessages.some(successMsg => message.includes(successMsg));
};

// Tab click with message clearing
export const createTabClickWithClear = (
  handleTabClick: (fileName: string) => void,
  setSuccessMessage: (msg: string) => void,
  setAdditionalMessage: (msg: string) => void,
  setStructureErrorMessage: (msg: string) => void
) => {
  return (fileName: string) => {
    handleTabClick(fileName);
    // Clear status messages when changing files
    setSuccessMessage('');
    setAdditionalMessage('');
    setStructureErrorMessage('');
  };
};

// Auto-save code utility
export const autoSaveCode = async (
  fileContents: {[key: string]: string},
  questionName: string,
  studentId: string,
  testId: string,
  isSubmitted: boolean
) => {
  if (!isSubmitted) {
    const codeToSave: {[key: string]: string} = {};
    Object.keys(fileContents).forEach(fileName => {
      codeToSave[fileName] = fileContents[fileName] || '';
    });
    
    // Auto-save to backend
    autoSaveHTMLCode(codeToSave, questionName, studentId, testId, process.env.REACT_APP_BACKEND_URL!);
  }
};

// Generate output code
export const generateOutputCode = (fileContents: {[key: string]: string}, imageUrls?: Array<{actualUrl: string, expectedUrl: string}>) => {
  return generateHTMLPreview(fileContents, imageUrls);
};

// Cleanup utilities
export const cleanupAfterSubmission = async (
  questionName: string,
  studentId: string,
  testId: string
) => {
  cleanupAutoSavedHTMLCode(questionName, studentId, testId, process.env.REACT_APP_BACKEND_URL!);
};
