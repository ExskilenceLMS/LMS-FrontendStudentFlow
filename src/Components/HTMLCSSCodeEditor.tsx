import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExpand } from '@fortawesome/free-solid-svg-icons';
import { getApiClient } from "../utils/apiAuth";
import { useNavigate } from "react-router-dom";
import SkeletonCode from "../Components/EditorSkeletonCode"
import { secretKey } from "../constants";
import { QUESTION_STATUS } from "../constants/constants";
import { autoSaveHTMLCode, getAutoSavedHTMLCode, cleanupAutoSavedHTMLCode } from "../utils/autoSaveUtils";
import CryptoJS from "crypto-js";

interface Tab {
  name: string;
  type: string;
}

interface CodeValidation {
  [key: string]: {
    template: string;
    structure?: any[];
  };
}

interface QuestionData {
  Qn_name: string;
  Page_Name: string;
  level: string;
  subtopic_id: string;
  type: string;
  Tabs: Tab[];
  Qn: string;
  requirements: string;
  Code_Validation: CodeValidation;
  defaulttemplate: string;
  image_path: string;
  video_path: string;
  CreatedBy: string;
  CreatedOn: string;
  LastUpdated: string;
  status?: boolean;
  score?: string;
}

interface HTMLCSSEditorProps {
  questionData: any;
  currentQuestionIndex: number;
  onQuestionChange: (index: number) => void;
  onNext: () => void;
  showNextButton: boolean;
  nextButtonText: string;
  onQuestionSubmitted: (questionName: string) => void;
}

const HTMLCSSEditor: React.FC<HTMLCSSEditorProps> = ({
  questionData: propQuestionData,
  currentQuestionIndex: propCurrentQuestionIndex,
  onQuestionChange,
  onNext,
  showNextButton,
  nextButtonText,
  onQuestionSubmitted
}) => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [fileContents, setFileContents] = useState<{[key: string]: string}>({});
  const [activeTab, setActiveTab] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittedFiles, setSubmittedFiles] = useState<{[key: string]: boolean}>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [hasRunCode, setHasRunCode] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [additionalMessage, setAdditionalMessage] = useState<string>('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [showRequirement, setShowRequirement] = useState(false);
  const [activeSection, setActiveSection] = useState<'output' | 'testcases'>('output');
  const [editorInstances, setEditorInstances] = useState<{[key: string]: any}>({});
  const [testResults, setTestResults] = useState<{[key: string]: boolean[]}>({});
  const [structureResults, setStructureResults] = useState<{[key: string]: boolean[]}>({});
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState<number | null>(null);
  const [activeOutputTab, setActiveOutputTab] = useState('image');
  const hasLoadedAutoSavedCode = useRef(false);
  // Helper function to safely decrypt session storage values
  const decryptSessionValue = (key: string, defaultValue: string = ''): string => {
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

  // Decrypts data using AES decryption (matching Python editor pattern)
  const decryptData = (encryptedData: string) => {
    const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  };

  const studentId = decryptSessionValue('StudentId');
  const testId = decryptSessionValue('TestId');
  
  // Transform TestSection data to HTML/CSS format
  const transformTestSectionData = (testSectionQuestion: any): QuestionData => {
    const questionData = testSectionQuestion.question_data || testSectionQuestion;
          
          return {
      Qn_name: testSectionQuestion.Qn_name,
      Page_Name: questionData.Page_Name,
      level: questionData.level,
      subtopic_id: questionData.subtopic_id,
      type: questionData.type,
      Tabs: questionData.Tabs,
      Qn: questionData.Qn || testSectionQuestion.Qn,
      requirements: questionData.requirements,
      Code_Validation: questionData.Code_Validation,
      defaulttemplate: questionData.defaulttemplate,
      image_path: questionData.image_path,
      video_path: questionData.video_path,
      CreatedBy: questionData.CreatedBy,
      CreatedOn: questionData.CreatedOn,
      LastUpdated: questionData.LastUpdated,
      status: testSectionQuestion.status,
      score: questionData.score
    };
  };
  
  // Create a default question data structure if propQuestionData doesn't have the expected structure
  const rawQuestionData = propQuestionData?.qns_data?.coding?.[propCurrentQuestionIndex] || propQuestionData;
  const questionData = useMemo(() => {
    return rawQuestionData ? transformTestSectionData(rawQuestionData) : null;
  }, [rawQuestionData]);
  
  
  
 
 

  // Handle question change - exactly like practice editor's handleQuestionChange function
  const handleQuestionChange = useCallback(async (question: any) => {
    if (!question || !studentId || !testId) return;
    
    // Reset output tab to image (default)
    setActiveOutputTab('image');
    
    // Clear editor instances for fresh start - exactly like practice editor
    setEditorInstances({});
    
    // Reset additional states for fresh question
    setTestResults({});
    setStructureResults({});
    setSelectedTestCaseIndex(null);
    setSuccessMessage('');
    setAdditionalMessage('');
    setHasRunCode(false);
    setIsSubmitted(false);
    
    // Initialize file contents from Code_Validation - exactly like practice editor
    const fileContents: {[key: string]: string} = {};
    
        // Check if question is submitted (either via question.status or session storage)
        const questionStatusKey = `coding_${question?.Qn_name}`;
        const statusSessionKey = `${testId}_questionStatus`;
        const sessionStatus = sessionStorage.getItem(statusSessionKey);
        
        let isSubmittedStatus = false;
        if (sessionStatus) {
          try {
            const decryptedStatuses = CryptoJS.AES.decrypt(sessionStatus, secretKey).toString(CryptoJS.enc.Utf8);
            const statuses = JSON.parse(decryptedStatuses);
            isSubmittedStatus = statuses[questionStatusKey] === "Submitted";
            } catch (error) {
            console.error('Error decrypting submit status:', error);
            isSubmittedStatus = false;
          }
        }
        
        const isSubmitted = question.status === true || isSubmittedStatus;
      
      // Process each file in Code_Validation
        Object.keys(question?.Code_Validation || {}).forEach(fileName => {
          if (fileName === 'index.html') {
            // Use defaulttemplate for index.html, or empty if not available
            fileContents[fileName] = question?.defaulttemplate || '';
          } else {
            // Other files start empty
            fileContents[fileName] = '';
          }
        });
      
      // Check session storage first for auto-saved code (priority over entered_ans for test flow)
      const sessionKey = `userCode_${testId}_${question?.Qn_name}`;
      const encryptedSessionCode = sessionStorage.getItem(sessionKey);
      
      if (encryptedSessionCode) {
        // Load from session storage if available (both submitted and non-submitted questions)
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
      if (!question.status) {
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
      }
      
      setFileContents(fileContents);
      
      // Set active tab to the first file
    if (question?.Tabs && question.Tabs.length > 0) {
        setActiveTab(question.Tabs[0].name);
      }
      
    // Set submission status based on already calculated isSubmitted
    if (isSubmitted) {
         setIsSubmitted(true);
         setHasRunCode(true);
       } else {
         setIsSubmitted(false);
         setHasRunCode(false);
       }
  }, [studentId, testId]);

  // Call handleQuestionChange when questionData changes
  useEffect(() => {
    if (questionData) {
      handleQuestionChange(questionData);
    }
  }, [questionData, handleQuestionChange]);

  // Ensure activeTab is set when questionData is available
  useEffect(() => {
    if (questionData?.Tabs && questionData.Tabs.length > 0 && !activeTab) {
      setActiveTab(questionData.Tabs[0].name);
    }
  }, [questionData?.Tabs, activeTab]);


  const handleTabClick = (fileName: string) => {
    setActiveTab(fileName);
    // Force re-render of editor by clearing the instance for this file
    setEditorInstances(prev => {
      const newInstances = { ...prev };
      delete newInstances[fileName];
      return newInstances;
    });
  };


  // Helper function to get file type based on extension
  const getFileType = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension || 'text';
  };

  // Helper function to get current file content
  const getCurrentFileContent = useCallback((): string => {
    const currentActiveTab = activeTab || (questionData?.Tabs && questionData.Tabs.length > 0 ? questionData.Tabs[0].name : '');
    return fileContents[currentActiveTab] || '';
  }, [fileContents, activeTab, questionData?.Tabs]);

  // Helper function to update file content
  const updateFileContent = (fileName: string, content: string) => {
    setFileContents(prev => ({
      ...prev,
      [fileName]: content
    }));
  };



  
  const onChangeFileContent = useCallback((value: string, viewUpdate: any) => {
    // Ensure we have an active tab, fallback to first tab if none selected
    const currentActiveTab = activeTab || (questionData?.Tabs && questionData.Tabs.length > 0 ? questionData.Tabs[0].name : '');
    
    if (!currentActiveTab) return;
    
    updateFileContent(currentActiveTab, value);
    
    if (questionData?.Qn_name && !processing && !isSubmitted) {
      // Create a dynamic object with all current file contents
      const codeToSave: {[key: string]: string} = {};
      
      // Add all current file contents
      Object.keys(fileContents).forEach(fileName => {
        codeToSave[fileName] = fileContents[fileName] || '';
      });
      
      // Update the current file content before saving
      codeToSave[currentActiveTab] = value;
      
      const encryptedCode = CryptoJS.AES.encrypt(JSON.stringify(codeToSave), secretKey).toString();
      sessionStorage.setItem(`userCode_${testId}_${questionData.Qn_name}`, encryptedCode);
    }
  }, [activeTab, fileContents, questionData?.Qn_name, questionData?.Tabs, processing, testId, isSubmitted]);

  // HTML Structure Validation using regex
  const validateHTMLStructure = (htmlCode: string, tag: string, attributes: any, parentTag?: string, content?: string, parentAttributes?: any): boolean => {
    // Special handling for DOCTYPE declarations
    if (tag === '!DOCTYPE') {
      const doctypePattern = /<!DOCTYPE\s+html\s*>/i;
      return doctypePattern.test(htmlCode);
    }
    
    // Remove DOCTYPE and normalize whitespace
    const cleanHTML = htmlCode.replace(/<!DOCTYPE[^>]*>/gi, '').replace(/\s+/g, ' ').trim();
    
    // Find the parent tag boundaries if specified
    if (parentTag) {
      // Build regex pattern for parent tag with attributes
      let parentPattern = `<${parentTag}\\b`;
      if (parentAttributes) {
        for (const [key, value] of Object.entries(parentAttributes)) {
          if (Array.isArray(value)) {
            parentPattern += `[^>]*${key}=["']${value[0]}["']`;
          } else if (value === true) {
            parentPattern += `[^>]*${key}(?:\\s|>|$)`;
          } else {
            parentPattern += `[^>]*${key}=["']${value}["']`;
          }
        }
      }
      parentPattern += `[^>]*>`;
      
      const parentStartRegex = new RegExp(parentPattern, 'g');
      const parentEndRegex = new RegExp(`</${parentTag}>`, 'g');
      
      const parentStartMatch = parentStartRegex.exec(cleanHTML);
      if (!parentStartMatch) return false; // Parent not found
      
      const parentStartIndex = parentStartMatch.index + parentStartMatch[0].length;
      
      // Find the closing tag
      parentEndRegex.lastIndex = parentStartIndex;
      const parentEndMatch = parentEndRegex.exec(cleanHTML);
      if (!parentEndMatch) return false; // Parent not properly closed
      
      const parentEndIndex = parentEndMatch.index;
      const parentContent = cleanHTML.substring(parentStartIndex, parentEndIndex);
      
      // Check if the tag exists within the parent content with correct content
      return checkTagInContent(parentContent, tag, attributes, content);
    } else {
      // Check if tag exists anywhere in the HTML with correct content
      return checkTagInContent(cleanHTML, tag, attributes, content);
    }
  };

  // Helper function to check if a tag with attributes and content exists
  const checkTagInContent = (content: string, tag: string, attributes: any, expectedContent?: string): boolean => {
    // Build regex pattern for the tag
    let pattern = `<${tag}\\b`;
    
    if (attributes) {
      for (const [key, value] of Object.entries(attributes)) {
        if (Array.isArray(value)) {
          // Escape special regex characters in the value
          const escapedValue = String(value[0]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          pattern += `[^>]*${key}=["']${escapedValue}["']`;
        } else if (value === true) {
          // Handle boolean attributes (like readonly, disabled, etc.)
          pattern += `[^>]*${key}(?:\\s|>|$)`;
        } else {
          // Escape special regex characters in the value
          const escapedValue = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          pattern += `[^>]*${key}=["']${escapedValue}["']`;
        }
      }
    }
    
    // If content is expected, include it in the pattern
    if (expectedContent) {
      // Escape special regex characters in content
      const escapedContent = expectedContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      pattern += `[^>]*>\\s*${escapedContent}\\s*</${tag}>`;
    } else {
      pattern += `[^>]*/?>`;
    }
    
    const regex = new RegExp(pattern, 'g');
    const result = regex.test(content);
    
    return result;
  };

  // CSS Parser
  const parseCSS = (cssCode: string) => {
    try {
      const result: any = {};
      
      // Extract CSS rules using regex
      const rules = cssCode.match(/([^{}]+)\s*\{([^{}]*)\}/g);
      
      if (rules) {
        rules.forEach(rule => {
          const [selectorPart, properties] = rule.split('{');
          const cleanProperties = properties.replace('}', '').trim();
          
          // Handle multiple selectors (comma-separated)
          const selectors = selectorPart.split(',').map(s => s.trim());
          
          // Parse properties
          const props: any = {};
          const propPairs = cleanProperties.split(';');
          
          propPairs.forEach(prop => {
            const [key, value] = prop.split(':');
            if (key && value) {
              props[key.trim()] = value.trim();
            }
          });
          
          // Apply properties to all selectors
          selectors.forEach(selector => {
            if (!result[selector]) {
              result[selector] = {};
            }
            // Merge properties (later rules override earlier ones)
            Object.assign(result[selector], props);
          });
        });
      }
      
      return result;
    } catch (error) {
      return null;
    }
  };

  // CSS Validation
  const validateCSSRequirement = (cssCode: string, requirementIndex: number, cssStructure: any[]) => {
    const parsed = parseCSS(cssCode);
    if (!parsed) return false;
    
    // Get the requirement from the structure
    const requirement = cssStructure[requirementIndex];
    if (!requirement) return false;
    
    const { selector, properties } = requirement;
    
    // Check if selector exists in CSS
    const selectorRules = parsed[selector];
    if (!selectorRules) {
      return false;
    }
    
    // Check if all required properties exist with correct values
    let allPropertiesValid = true;
    for (const prop of properties) {
      const { property, value } = prop;
      if (selectorRules[property] !== value) {
        allPropertiesValid = false;
      }
    }
    
    return allPropertiesValid;
  };

  // HTML Validation
  const validateHTMLRequirement = (htmlCode: string, requirementIndex: number, htmlStructure: any[]) => {
    // Get the requirement from the structure
    const requirement = htmlStructure[requirementIndex];
    if (!requirement) return false;
    
    const { tag, attributes, parent, content } = requirement;
    
    // Find parent tag name and attributes if specified
    let parentTag: string | undefined = undefined;
    let parentAttributes: any = undefined;
    if (parent) {
      const parentRequirement = htmlStructure.find((item: any) => item.id === parent);
      if (parentRequirement) {
        parentTag = parentRequirement.tag;
        parentAttributes = parentRequirement.attributes;
      }
    }
    
    // Use raw HTML string validation instead of DOM parsing
    const result = validateHTMLStructure(htmlCode, tag, attributes, parentTag, content, parentAttributes);
    
    return result;
  };

  // Structure validation function - only checks parent-child relationships
  const validateStructure = (code: string, fileName: string, questionData: any) => {
    const fileValidation = questionData?.Code_Validation[fileName];
    if (!fileValidation) return [];
    
    const structure = fileValidation.structure;
    const type = fileName.endsWith('.html') ? 'HTML' : fileName.endsWith('.css') ? 'CSS' : 'JS';
    
    if (type === 'HTML') {
      // For HTML, check only parent-child relationships
      return structure.map((requirement: any) => {
        const { tag, parent } = requirement;
        
        if (!parent) {
          // Root element - just check if it exists
          return code.includes(`<${tag}`);
        } else {
          // Child element - check if it's inside its parent
          const parentRequirement = structure.find((item: any) => item.id === parent);
          if (!parentRequirement) {
            // Parent ID not found in structure list - skip parent-child validation
            // Just check if the tag exists in the code
            return code.includes(`<${tag}`);
          }
          
          const parentTag = parentRequirement.tag;
          // Check if the child tag exists inside the parent tag
          // Use case-insensitive matching and handle self-closing tags
          const parentRegex = new RegExp(`<${parentTag}[^>]*>([\\s\\S]*?)</${parentTag}>`, 'gi');
          const parentMatches = [...code.matchAll(parentRegex)];
          
          for (const match of parentMatches) {
            if (match[1] && match[1].includes(`<${tag}`)) {
              return true;
            }
          }
          return false;
        }
      });
    }
    
    // For CSS, structure validation is the same as regular validation
    return structure.map((_: any, index: number) => {
      return validateCSSRequirement(code, index, structure);
    });
  };

  // Main validation function - checks all requirements (structure + attributes)
  const validateCode = (code: string, fileName: string, questionData: any) => {
    const fileValidation = questionData?.Code_Validation[fileName];
    if (!fileValidation) return [];
    
    const structure = fileValidation.structure;
    const type = fileName.endsWith('.html') ? 'HTML' : fileName.endsWith('.css') ? 'CSS' : 'JS';
    
    // Get structure validation results
    const structureResults = validateStructure(code, fileName, questionData);
    
    const results = structure.map((_: any, index: number) => {
      if (type === 'HTML') {
        // For HTML: both structure AND attributes must pass
        const structurePass = structureResults[index];
        const attributesPass = validateHTMLRequirement(code, index, structure);
        return structurePass && attributesPass;
      } else if (type === 'CSS') {
        // For CSS: structure validation is the same as regular validation
        return validateCSSRequirement(code, index, structure);
      }
      return false;
    });
    
    return results;
  };


  // Helper function to generate expected description
  const getExpectedDescription = (requirement: any, fileType: string) => {
    if (fileType.endsWith('.html')) {
      // For HTML, show only the clean structure without parent references
      if (Array.isArray(requirement)) {
        return buildCleanHTMLStructure(requirement);
      } else {
        // Single element without children
        const { tag, attributes, content } = requirement;
        let expected = `<${tag}`;
        
        if (attributes && Object.keys(attributes).length > 0) {
          Object.entries(attributes).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              expected += ` ${key}="${value[0]}"`;
            } else if (value === true) {
              expected += ` ${key}`;
            } else {
              expected += ` ${key}="${value}"`;
            }
          });
        }
        
        // Special handling for DOCTYPE declarations
        if (tag === '!DOCTYPE') {
          expected += `>`;
          return expected;
        }
        
        if (content) {
          expected += `>${content}</${tag}>`;
        } else {
          expected += `></${tag}>`;
        }
        
        return expected;
      }
    } else if (fileType.endsWith('.css')) {
      const { selector, properties } = requirement;
      const propList = properties.map((prop: any) => `  ${prop.property}: ${prop.value};`).join('\n');
      return `${selector} {\n${propList}\n}`;
    }
    
    return 'Expected result';
  };

  const buildCleanHTMLStructure = (structure: any[]): string => {
    // Build a tree structure from the flat array
    const elementMap = new Map();
    const rootElements: any[] = [];
    
    // First pass: create all elements
    structure.forEach(element => {
      elementMap.set(element.id, { ...element, children: [] });
    });
    
    // Second pass: build parent-child relationships
    structure.forEach(element => {
      const elementObj = elementMap.get(element.id);
      if (element.parent) {
        const parent = elementMap.get(element.parent);
        if (parent) {
          parent.children.push(elementObj);
        }
      } else {
        rootElements.push(elementObj);
      }
    });
    
    // Build clean HTML from tree structure (only show elements that should be visible)
    return rootElements.map(element => buildCleanElementHTML(element, 0)).join('\n');
  };

  const buildCleanElementHTML = (element: any, indent: number): string => {
    const spaces = '  '.repeat(indent);
    const { tag, attributes, content, children } = element;
    
    let html = `${spaces}<${tag}`;
    
    // Add attributes
    if (attributes && Object.keys(attributes).length > 0) {
      Object.entries(attributes).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          html += ` ${key}="${value[0]}"`;
        } else if (value === true) {
          html += ` ${key}`;
        } else {
          html += ` ${key}="${value}"`;
        }
      });
    }
    
    // Special handling for DOCTYPE declarations
    if (tag === '!DOCTYPE') {
      html += `>`;
      return html;
    }
    
    // Handle content and children
    if (children && children.length > 0) {
      html += '>\n';
      children.forEach((child: any) => {
        html += buildCleanElementHTML(child, indent + 1) + '\n';
      });
      html += `${spaces}</${tag}>`;
    } else if (content) {
      html += `>${content}</${tag}>`;
    } else {
      html += `></${tag}>`;
    }
    
    return html;
  };


  const handleCheckCode = () => {
    // If maximized, return to normal view when RUN is clicked
    if (isMaximized) {
      setIsMaximized(false);
    }
    
    // Validate only the current active file
    if (questionData && activeTab) {
      const currentCode = getCurrentFileContent();
      const results = validateCode(currentCode, activeTab, questionData);
      const structureValidationResults = validateStructure(currentCode, activeTab, questionData);
      
      // Update test results for current file
      setTestResults(prev => ({
        ...prev,
        [activeTab]: results
      }));
      
      // Update structure results for current file
      setStructureResults(prev => ({
        ...prev,
        [activeTab]: structureValidationResults
      }));
      
      // Mark that code has been run
      setHasRunCode(true);
      
      // Auto-save to backend when running (not session storage)
      const codeToSave: {[key: string]: string} = {};
      Object.keys(fileContents).forEach(fileName => {
        codeToSave[fileName] = fileContents[fileName] || '';
      });
      
      // Auto-save to backend only if not submitted
      if (questionData?.Qn_name && !isSubmitted) {
        autoSaveHTMLCode(codeToSave, questionData.Qn_name, studentId, testId, process.env.REACT_APP_BACKEND_URL!);
      }
      
      // Switch to test cases tab to show results
      setActiveSection('testcases');
      setSelectedTestCaseIndex(0);
      
      // Calculate success rate
      const passedTests = results.filter((result: boolean) => result).length;
      const totalTests = results.length;
      const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
      
      if (successRate === 100) {
        setSuccessMessage("Congratulations!");
        setAdditionalMessage("You have passed all the test cases. Click the submit code button.");
      } else {
        setSuccessMessage("Wrong Answer");
        setAdditionalMessage("You have not passed all the test cases.");
      }
    }
  };
  

  const renderEditor = useCallback(() => {
    // Ensure we have an active tab, fallback to first tab if none selected
    const currentActiveTab = activeTab || (questionData?.Tabs && questionData.Tabs.length > 0 ? questionData.Tabs[0].name : '');
    
    if (!currentActiveTab) {
      return <div className="d-flex align-items-center justify-content-center h-100">
        <div className="text-muted">No files available</div>
      </div>;
    }
    
    const fileType = getFileType(currentActiveTab);
    const currentContent = fileContents[currentActiveTab] || '';
    
    let extensions: any[] = [];
    if (fileType === 'html') {
      extensions = [html()];
    } else if (fileType === 'css') {
      extensions = [css()];
    }
    
        return (
          <CodeMirror
            key={`${currentActiveTab}-${questionData?.Qn_name}`} // Stable key for each file and question
            className="text-xl text-start custom-codemirror"
            value={currentContent}
            height="100%"
            extensions={extensions}
            onChange={onChangeFileContent}
            style={{ backgroundColor: 'white', overflow: 'auto' }}
            basicSetup={{
              history: true, // Each instance has its own history
              lineNumbers: true,
              foldGutter: true,
              dropCursor: false,
              allowMultipleSelections: false,
              indentOnInput: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: true,
              highlightSelectionMatches: true
            }}
          />
        );
  }, [activeTab, questionData?.Qn_name, questionData?.Tabs, fileContents, onChangeFileContent]);

  // Generate HTML preview with dynamic file processing
  const generateHTMLPreview = (files: {[key: string]: string}) => {
    // Get the main HTML file (prefer index.html, fallback to first HTML file)
    const htmlFileNames = Object.keys(files).filter(name => name.endsWith('.html'));
    const mainHtmlFile = htmlFileNames.find(name => name === 'index.html') || htmlFileNames[0];
    
    if (!mainHtmlFile) {
      return '';
    }

    let htmlContent = files[mainHtmlFile] || '';

    // If no HTML content, return empty
    if (!htmlContent.trim()) {
      return '';
    }

    // Ensure we have a complete HTML document
    if (!htmlContent.includes('<html')) {
      htmlContent = htmlContent;
    }
    if (!htmlContent.includes('<head')) {
      htmlContent = htmlContent.replace('<html>', '<html>\n<head>\n<title>Preview</title>\n</head>');
    }
    if (!htmlContent.includes('<body')) {
      htmlContent = htmlContent.replace('</head>', '</head>\n<body>') + '\n</body>';
    }

    let htmlWithDataUrl = htmlContent;
    
    // Process all file references dynamically
    const processFileReferences = (pattern: RegExp, fileType: string, dataUrlPrefix: string, attributeName: string | null = null) => {
      const matches = htmlWithDataUrl.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Extract filename from various attribute patterns
          const srcMatch = match.match(/src=["']([^"']+)["']|href=["']([^"']+)["']|data-src=["']([^"']+)["']|include=["']([^"']+)["']|data=["']([^"']+)["']/i);
          if (srcMatch) {
            const fileName = srcMatch[1] || srcMatch[2] || srcMatch[3] || srcMatch[4] || srcMatch[5];
            // Find the corresponding file content
            const referencedFile = Object.keys(files).find(f => f === fileName && f.endsWith(fileType === 'CSS' ? '.css' : '.html'));
            if (referencedFile) {
              const fileContent = files[referencedFile] || '';
              const fileDataUrl = `${dataUrlPrefix}${encodeURIComponent(fileContent)}`;
              
              // Determine which attribute to replace
              let attribute = attributeName;
              if (!attribute) {
                if (srcMatch[1]) attribute = 'src';
                else if (srcMatch[2]) attribute = 'href';
                else if (srcMatch[3]) attribute = 'data-src';
                else if (srcMatch[4]) attribute = 'include';
                else if (srcMatch[5]) attribute = 'data';
              }
              
              // Replace the reference
              htmlWithDataUrl = htmlWithDataUrl.replace(
                new RegExp(`${attribute}=["']${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'gi'),
                `${attribute}="${fileDataUrl}"`
              );
            }
          }
        });
      }
    };

    // Simple HTML file reference processor
    const processHTMLFileReferences = () => {
      // Find all HTML files in the files object
      const htmlFiles = Object.keys(files).filter(f => f.endsWith('.html'));
      
      htmlFiles.forEach(htmlFileName => {
        const fileContent = files[htmlFileName] || '';
        const fileDataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(fileContent)}`;
        
        // Simple replacements - replace with actual content
        htmlWithDataUrl = htmlWithDataUrl.replace(
          new RegExp(`<div[^>]*include=["']${htmlFileName}["'][^>]*></div>`, 'gi'),
          `<div>${fileContent}</div>`
        );
        
        htmlWithDataUrl = htmlWithDataUrl.replace(
          new RegExp(`<div[^>]*data-src=["']${htmlFileName}["'][^>]*></div>`, 'gi'),
          `<div>${fileContent}</div>`
        );
        
        htmlWithDataUrl = htmlWithDataUrl.replace(
          new RegExp(`<link[^>]*rel=["']import["'][^>]*href=["']${htmlFileName}["'][^>]*>`, 'gi'),
          `<div>${fileContent}</div>`
        );
        
        // For iframe, object, embed - replace with data URLs
        htmlWithDataUrl = htmlWithDataUrl.replace(
          new RegExp(`<iframe[^>]*src=["']${htmlFileName}["'][^>]*>`, 'gi'),
          `<iframe src="${fileDataUrl}"`
        );
        
        htmlWithDataUrl = htmlWithDataUrl.replace(
          new RegExp(`<object[^>]*data=["']${htmlFileName}["'][^>]*>`, 'gi'),
          `<object data="${fileDataUrl}"`
        );
        
        htmlWithDataUrl = htmlWithDataUrl.replace(
          new RegExp(`<embed[^>]*src=["']${htmlFileName}["'][^>]*>`, 'gi'),
          `<embed src="${fileDataUrl}"`
        );
      });
    };

    // Process CSS files linked via <link> tags
    processFileReferences(
      /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
      'CSS',
      'data:text/css;charset=utf-8,'
    );

    // Process HTML file references
    processHTMLFileReferences();

    return htmlWithDataUrl;
  };

  // Generate output code using the improved preview generation
  const generateOutputCode = () => {
    return generateHTMLPreview(fileContents);
  };

  const srcCode = generateOutputCode();

      const handleSubmit = async () => {
        setProcessing(true);
        const url = `${process.env.REACT_APP_BACKEND_URL}api/student/test/questions/submit/frontend/`;
        
        try {
          // Get all HTML files and their content
          const htmlFiles = Object.keys(fileContents).filter(fileName => 
            fileName.endsWith('.html')
          );
          const htmlCode: {[key: string]: string} = {};
          const htmlResult: {[key: string]: string} = {};
          
          htmlFiles.forEach(fileName => {
            htmlCode[fileName] = fileContents[fileName] || '';
            // Calculate score for HTML file based on test results
            const testResultsForFile = testResults[fileName] || [];
            const passedTests = testResultsForFile.filter(result => result).length;
            const totalTests = testResultsForFile.length;
            htmlResult[fileName] = `${passedTests}/${totalTests}`;
          });
          
          // Get all CSS files and their content
          const cssFiles = Object.keys(fileContents).filter(fileName => 
            fileName.endsWith('.css')
          );
          const cssCode: {[key: string]: string} = {};
          const cssResult: {[key: string]: string} = {};
          
          cssFiles.forEach(fileName => {
            cssCode[fileName] = fileContents[fileName] || '';
            // Calculate score for CSS file based on test results
            const testResultsForFile = testResults[fileName] || [];
            const passedTests = testResultsForFile.filter(result => result).length;
            const totalTests = testResultsForFile.length;
            cssResult[fileName] = `${passedTests}/${totalTests}`;
          });
          
          // Get all JS files and their content
          const jsFiles = Object.keys(fileContents).filter(fileName => 
            fileName.endsWith('.js')
          );
          const jsCode: {[key: string]: string} = {};
          const jsResult: {[key: string]: string} = {};
          
          jsFiles.forEach(fileName => {
            jsCode[fileName] = fileContents[fileName] || '';
            // Calculate score for JS file based on test results
            const testResultsForFile = testResults[fileName] || [];
            const passedTests = testResultsForFile.filter(result => result).length;
            const totalTests = testResultsForFile.length;
            jsResult[fileName] = `${passedTests}/${totalTests}`;
          });
          
          // Get max score from question data (e.g., "0/10" -> use 10 as max score)
          const questionScore = questionData?.score || "0/10";
          const maxScore = parseInt(questionScore.split('/')[1]);
          
          // Get additional required fields from session storage (matching Python editor pattern)
          const decryptedBatchId = decryptData(sessionStorage.getItem("BatchId") || "");
          const decryptedCourseId = sessionStorage.getItem('CourseId') ? 
            CryptoJS.AES.decrypt(sessionStorage.getItem('CourseId')!, secretKey).toString(CryptoJS.enc.Utf8) : "course19";
          
          // Use same pattern as Python editor
          const subjectId = decryptData(sessionStorage.getItem("TestSubjectId") || "");
          const subject = sessionStorage.getItem("TestSubject") || "";
          
          const weekNumber = decryptSessionValue('WeekNumber', '0');
          const dayNumber = decryptSessionValue('DayNumber', '0');
          
          const postData = {
            student_id: studentId,
            question_id: questionData?.Qn_name,
            question_done_at: testId,
            test_id: testId,
            subject_id: subjectId,
            batch_id: decryptedBatchId,
            course_id: decryptedCourseId,
            week_number: weekNumber,
            day_number: dayNumber,
            subject: subject,
            score: maxScore,
            HTML_Code: htmlCode,
            HTML_Result: htmlResult,
            CSS_Code: cssCode,
            CSS_Result: cssResult,
            JS_Code: jsCode,
            JS_Result: jsResult
          };

          // Debug: Log the values being sent (matching Python editor pattern)
          console.log('Subject data being sent:', {
            subject_id: subjectId,
            subject: subject,
            batch_id: decryptedBatchId,
            course_id: decryptedCourseId,
            week_number: weekNumber,
            day_number: dayNumber
          });
    
          const response = await getApiClient().post(
            url,
            postData
          );
    
          const responseData = response.data;
          
          // Mark as submitted
          setIsSubmitted(true);

          // Save submission status to session storage (like Python editor)
          const questionStatusKey = `coding_${questionData?.Qn_name}`;
          const statusSessionKey = `${testId}_questionStatus`;
          
          // Get existing statuses
          let statuses: {[key: string]: string} = {};
          const existingStatus = sessionStorage.getItem(statusSessionKey);
          if (existingStatus) {
            try {
              const decryptedStatuses = CryptoJS.AES.decrypt(existingStatus, secretKey).toString(CryptoJS.enc.Utf8);
              statuses = JSON.parse(decryptedStatuses);
            } catch (error) {
              console.error('Error decrypting existing statuses:', error);
            }
          }
          
          // Update status for this question
          statuses[questionStatusKey] = "Submitted";
          
          // Save updated statuses
          const encryptedStatuses = CryptoJS.AES.encrypt(JSON.stringify(statuses), secretKey).toString();
          sessionStorage.setItem(statusSessionKey, encryptedStatuses);

          // Save the submitted code to session storage so it persists
          const codeToSave: {[key: string]: string} = {};
          Object.keys(fileContents).forEach(fileName => {
            codeToSave[fileName] = fileContents[fileName] || '';
          });
          const encryptedCode = CryptoJS.AES.encrypt(JSON.stringify(codeToSave), secretKey).toString();
          sessionStorage.setItem(`userCode_${testId}_${questionData?.Qn_name}`, encryptedCode);

          // Call the parent callback to mark question as submitted
          if (questionData?.Qn_name) {
            onQuestionSubmitted(questionData?.Qn_name);
          }

          cleanupAutoSavedHTMLCode(questionData?.Qn_name!, studentId, testId, process.env.REACT_APP_BACKEND_URL!);

          // Show success message
          setSuccessMessage("Code submitted successfully!");
     
        } catch (error) {
          console.error("Error submitting code:", error);
          setSuccessMessage("Submission failed");
          setAdditionalMessage("There was an error submitting your code. Please try again.");
        } finally {
          setProcessing(false);
        }
      };



  if (!propQuestionData || !questionData) {
        return (
          <div className="container-fluid p-0" style={{ height: "100vh", maxWidth: "100%", overflowX: "hidden", backgroundColor: "#f2eeee" }}>
            <div className="p-0 my-0 me-2" style={{ backgroundColor: "#F2EEEE" }}>
              <SkeletonCode />
            </div>
          </div>
        );
      }
      

  // Check if required session storage values are missing
  if (!studentId || !testId) {
    return (
      <div className="container-fluid p-0" style={{ height: "100vh", maxWidth: "100%", overflowX: "hidden", backgroundColor: "#f2eeee" }}>
        <div className="p-0 my-0 me-2" style={{ backgroundColor: "#F2EEEE", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="text-center">
            <h4 className="text-danger">Session Error</h4>
            <p>Required session data is missing. Please refresh the page or log in again.</p>
            <button 
              className="btn btn-primary" 
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div key={questionData?.Qn_name || 'default'} className="container-fluid p-0" style={{ height: 'calc(100vh - 70px)', overflowX: "hidden", overflowY: "hidden", backgroundColor: "#f2eeee" }}>
      <div className="p-0 my-0" style={{ backgroundColor: "#F2EEEE", marginRight: '10px' }}>
        <div className="container-fluid p-0 pt-2" style={{ maxWidth: "100%", overflowX: "hidden", overflowY: "auto", backgroundColor: "#f2eeee" }}>
          <div className="row g-2">
            <div className="col-12">
              <div className="" style={{ height: "100vh", overflow: "hidden", padding: '0px 0px 65px 0px' }}>
                <div className="d-flex" style={{ height: '100%', width: '100%' }}>
                  {/* ===== PROBLEM STATEMENT PANEL ===== */}
                  <div className="col-5 lg-8 bg-white" style={{ height: "100%", display: "flex", flexDirection: "column", marginLeft: "-10px", marginRight: "10px" }}>
                    <div className="bg-white" style={{ height: "100%", backgroundColor: "#E5E5E533", display: "flex", flexDirection: "column" }}>
                      
                      {/* ===== FIRST ROW - PROBLEM STATEMENT & REQUIREMENTS (50%) ===== */}
                      <div style={{ height: "50%", display: "flex", flexDirection: "column", borderBottom: "2px solid #dee2e6" }}>
                        {/* Combined Content with Scrollbar */}
                        <div 
                          className="flex-fill overflow-auto p-3"
                          style={{ 
                            scrollbarWidth: "thin",
                            scrollbarColor: "#c1c1c1 #f1f1f1"
                          }}
                        >
                          {/* Problem Statement Section */}
                          <div style={{ marginBottom: "20px" }}>
                            <h4 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "10px", color: "#333" }}>
                              Problem Statement
                            </h4>
                            <div 
                              style={{ 
                                whiteSpace: "pre-wrap", 
                                wordBreak: "break-word",
                                fontFamily: "inherit",
                                lineHeight: "1.5",
                                fontSize: "14px",
                                color: "#555"
                              }} 
                              dangerouslySetInnerHTML={{ __html: questionData?.Qn || '' }}
                            />
                          </div>

                          {/* Requirements Section */}
                          <div>
                            <h4 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "10px", color: "#333" }}>
                              Requirements
                            </h4>
                            <div 
                              dangerouslySetInnerHTML={{ __html: questionData?.requirements || '' }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* ===== THIRD ROW - EXPECTED OUTPUT (50%) ===== */}
                      <div className="px-3" style={{ height: "50%", display: "flex", flexDirection: "column" }}>
                        {/* Expected Output Header */}
                        <div className="py-2" style={{ borderBottom: "1px solid #e9ecef" }}>
                            <h5 className="m-0" style={{ fontSize: "16px", fontWeight: "600" }}>
                              Expected Output
                            </h5>
                        </div>

                        {/* Output Tabs - Only show if both image and video are available */}
                        {questionData?.image_path && questionData?.video_path && (
                          <div className="py-2" style={{ borderBottom: "1px solid #e9ecef" }}>
                            <div className="d-flex">
                              <button
                                className={`btn me-2 ${activeOutputTab === 'image' ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => setActiveOutputTab('image')}
                                style={{ fontSize: "12px", padding: "4px 8px" }}
                              >
                                Image
                              </button>
                              <button
                                className={`btn ${activeOutputTab === 'video' ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => setActiveOutputTab('video')}
                                style={{ fontSize: "12px", padding: "4px 8px" }}
                              >
                                Video
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {/* Content with Scrollbar */}
                        <div 
                          className="flex-fill overflow-auto py-3 d-flex justify-content-center align-items-start"
                          style={{ 
                            scrollbarWidth: "thin",
                            scrollbarColor: "#c1c1c1 #f1f1f1"
                          }}
                        >
                          {/* Show image if it's the active tab or if no video is available */}
                          {((questionData?.image_path && questionData?.video_path && activeOutputTab === 'image') || 
                            (questionData?.image_path && !questionData?.video_path)) && (
                            <img 
                              key={`image-${questionData?.Qn_name}`}
                              src={questionData.image_path} 
                              className="img-fluid" 
                              alt="Expected Output" 
                              style={{ 
                                pointerEvents: 'none', 
                                maxWidth: '100%',
                                height: 'auto',
                                borderRadius: '4px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                              }} 
                            />
                          )}

                          {/* Show video if it's the active tab or if no image is available */}
                          {((questionData?.image_path && questionData?.video_path && activeOutputTab === 'video') || 
                            (!questionData?.image_path && questionData?.video_path)) && (
                            <video 
                              key={`video-${questionData?.Qn_name}`}
                              src={questionData.video_path} 
                              className="img-fluid" 
                              controls
                              style={{ 
                                maxWidth: '100%',
                                height: 'auto',
                                borderRadius: '4px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                              }} 
                            />
                          )}

                          {/* Show message if neither image nor video is available */}
                          {!questionData?.image_path && !questionData?.video_path && (
                            <div className="text-center text-muted" style={{ padding: "20px" }}>
                              <FontAwesomeIcon icon={faExpand} style={{ fontSize: "48px", opacity: 0.3 }} />
                              <p className="mt-2"></p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>


                  {/* ===== CODE EDITOR AND CONTROLS PANEL ===== */}
                  <div className="col-6 lg-8" style={{ height: "100%", display: "flex", flexDirection: "column", width: '55.1%' }}>
                    
                    {/* ===== CODE EDITOR ===== */}
                    <div className="bg-white me-3" style={{ height: "45%", backgroundColor: "#E5E5E533" }}>
                    <div className="border-bottom border-dark p-3 d-flex justify-content-between align-items-center">
                         <div className="d-flex align-items-center" style={{ flex: 1, minWidth: 0 }}>
                           <div 
                             className="d-flex"
                             style={{ 
                               flexWrap: 'nowrap',
                               overflowX: 'auto',
                               overflowY: 'hidden',
                               scrollbarWidth: "thin",
                               scrollbarColor: "#c1c1c1 #f1f1f1",
                               flex: 1,
                               minWidth: 0,
                               maxWidth: 'calc(100% - 40px)'
                             }}
                           >
                            {(questionData?.Tabs || []).map((tab: any, index: number) => (
                                <div
                                    key={index}
                                    style={{
                                     minWidth: 'fit-content',
                                     width: 'auto',
                                        height: '30px',
                                        borderRadius: '10px',
                                     backgroundColor: activeTab === tab.name ? "black" : "transparent",
                                     color: activeTab === tab.name ? "white" : "black",
                                     border: activeTab === tab.name ? "none" : "1px solid black",
                                        display: 'inline-block',
                                        textAlign: 'center',
                                        lineHeight: '30px',
                                        marginRight: '8px',
                                     cursor: 'pointer',
                                     padding: '0 12px',
                                     whiteSpace: 'nowrap',
                                     flexShrink: 0
                                    }}
                                   className={`tab-button me-1 ${activeTab === tab.name ? 'selected-tab' : ''}`}
                                   onClick={() => handleTabClick(tab.name)}
                                   title={tab.name} // Show full filename on hover
                                >
                                   {tab.name}
                                </div>
                            ))}
                           </div>
                           <FontAwesomeIcon 
                             icon={faExpand} 
                             className='text-dark ms-2 me-1' 
                             onClick={() => setIsMaximized(true)} 
                             style={{ cursor: 'pointer', fontSize: "16px", flexShrink: 0 }} 
                           />
                        </div>
                    </div>
                    <div className="col top" style={{ height: `calc(100% - 60px)`, overflowY: 'auto', marginBottom: '10px' }}>
                        {renderEditor()}
                    </div>
                    </div>

                    {/* ===== PROCESSING STATUS AND ACTION BUTTONS ===== */}
                    <div style={{ height: "6%", backgroundColor: "#E5E5E533" }} className="d-flex flex-column justify-content-center me-4 pe-1">
                      <div className="d-flex justify-content-between align-items-center h-100">
                        <div className="d-flex flex-column justify-content-center">
                          {processing ? (
                            <h5 className="m-0 processingDivHeadingTag">Processing...</h5>
                          ) : (
                            <>
                              {successMessage && <h5 className="m-0 ps-1" style={{ fontSize: '14px' }}>{successMessage}</h5>}
                              {additionalMessage && <p className="processingDivParaTag m-0 ps-1" style={{ fontSize: "10px" }}>{additionalMessage}</p>}
                            </>
                          )}
                        </div>
                        <div className="d-flex justify-content-end">
                          {/* Run Code Button */}
                          <button
                            className="btn btn-sm btn-light me-2 processingDivButton"
                            style={{
                              whiteSpace: "nowrap",
                              fontSize: "12px",
                              minWidth: "70px",
                              boxShadow: "#888 1px 2px 5px 0px",
                              height: "30px",
                              position: "relative",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "4px"
                            }}
                            onClick={handleCheckCode}
                            disabled={processing}
                          >
                            RUN
                          </button>
                          
                          {/* Submit Code Button */}
                          <button
                            className="btn btn-sm btn-light me-2 processingDivButton"
                            style={{
                              backgroundColor: "#FBEFA5DB",
                              whiteSpace: "nowrap",
                              fontSize: "12px",
                              minWidth: "70px",
                              boxShadow: "#888 1px 2px 5px 0px",
                              height: "30px"
                            }}
                            onClick={handleSubmit}
                            disabled={processing || isSubmitted || !hasRunCode}
                          >
                            {processing ? "PROCESSING..." : isSubmitted ? "SUBMITTED" : "SUBMIT"}
                          </button>
                          
                          {/* Next Button (only shown when question is completed) */}
                          {isSubmitted && showNextButton &&
                            <button
                              className="btn btn-sm btn-light processingDivButton"
                            style={{
                                whiteSpace: "nowrap",
                                fontSize: "12px",
                                minWidth: "70px",
                                boxShadow: "#888 1px 2px 5px 0px",
                                height: "30px"
                              }}
                              disabled={processing}
                              onClick={onNext}
                            >
                              {nextButtonText}
                            </button>
                          }
                        </div>
                      </div>
                    </div>

                    {/* ===== OUTPUT AND TEST RESULTS PANEL ===== */}
                    <div className="bg-white me-3" style={{ height: "48%", backgroundColor: "#E5E5E533", position: "relative" }}>
                      <div className="p-3" style={{ height: "calc(100% - 10px)", display: "flex", flexDirection: "column" }}>
                        {/* ===== SECTION TABS ===== */}
                        <div className="d-flex mb-3" style={{ flexShrink: 0 }}>
                          <button
                            className={`btn ${activeSection === 'output' ? 'btn-primary' : 'btn-outline-primary'} me-2`}
                            onClick={() => setActiveSection('output')}
                            style={{ fontSize: "12px", padding: "6px 12px" }}
                          >
                            Output
                          </button>
                          <button
                            className={`btn ${activeSection === 'testcases' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setActiveSection('testcases')}
                            style={{ fontSize: "12px", padding: "6px 12px" }}
                          >
                            Test Cases
                          </button>
                </div>

                        {/* ===== HTML/CSS OUTPUT ===== */}
                        {activeSection === 'output' && (
                          <div style={{ flex: 1, maxHeight: "90%", overflow: "auto" }}>
                    <iframe
                    style={{ width: '100%', height: '100%', backgroundColor: '', color: 'black', borderColor: 'white', outline: 'none', resize: 'none' }}
                    className="w-full h-full"
                    srcDoc={srcCode}
                    title="output"
                    sandbox="allow-scripts"
                    width="100%"
                    height="100%"
                    ></iframe>
                </div>
                        )}
                        
                        {/* ===== TEST CASES SECTION ===== */}
                        {activeSection === 'testcases' && (
                          <div style={{ flex: 1, maxHeight: "90%", overflow: "auto" }}>
                            {testResults[activeTab] && testResults[activeTab].length > 0 ? (
                              <div className="d-flex" style={{ height: "100%" }}>
                                {/* Left Column - Test Case List (30%) */}
                                <div className="border-end" style={{ 
                                  width: "30%", 
                                  overflowY: "auto", 
                                  padding: "10px",
                                  scrollbarWidth: "thin",
                                  scrollbarColor: "#c1c1c1 #f1f1f1"
                                }}>
                                  {testResults[activeTab].map((result, index) => (
                                    <div
                                      key={index}
                                      className={`p-2 border-bottom cursor-pointer ${
                                        selectedTestCaseIndex === index ? 'text-primary' : ''
                                      }`}
                                      style={{ 
                                        fontSize: "12px",
                                        cursor: "pointer",
                                        minHeight: "40px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        margin: "6px 0px",
                                        borderRadius: "8px",
                                        padding: "8px 12px",
                                        backgroundColor: selectedTestCaseIndex === index ? '#f2f2f0' : '#f8f9fa',
                                        border: '1px solid #dee2e6',
                                        color: selectedTestCaseIndex === index ? '#007bff' : '#212529'
                                      }}
                                      onClick={() => setSelectedTestCaseIndex(index)}
                                    >
                                      <span>Test Case {index + 1}</span>
                                      {result ? (
                                        <span className="text-success">✓</span>
                                      ) : (
                                        <span className="text-danger">✗</span>
                                      )}
                </div>
                                  ))}
                  </div>
                                
                                {/* Right Column - Test Case Details (70%) */}
                                <div className="px-4 pt-3 pb-3" style={{ width: "70%", overflowY: "auto" }}>
                                  {selectedTestCaseIndex !== null && testResults[activeTab][selectedTestCaseIndex] !== undefined && (
                                    <div>
                                      {/* Test Case Status */}
                                      <div className="mb-3">
                                        <strong>Status: </strong>
                                        <span className={testResults[activeTab][selectedTestCaseIndex] ? "text-success" : "text-danger"}>
                                          {testResults[activeTab][selectedTestCaseIndex] ? "Pass" : "Failed"}
                                        </span>
                </div>
                                      
                                      {/* Structure */}
                                      <div className="mb-3">
                                        <strong>Structure: </strong>
                                        <span className={structureResults[activeTab] && structureResults[activeTab][selectedTestCaseIndex] ? "text-success" : "text-danger"}>
                                          {structureResults[activeTab] && structureResults[activeTab][selectedTestCaseIndex] ? "Pass" : "Failed"}
                                        </span>
              </div>
                                      
                                      {/* Expected */}
                                      <div className="mb-3">
                                        <strong>Expected: </strong>
                                        <div className="mt-2 p-2" style={{ 
                                          backgroundColor: "#f8f9fa", 
                                          border: "1px solid #e9ecef", 
                                          borderRadius: "4px",
                                          fontSize: "13px",
                                          whiteSpace: "pre",
                                          fontFamily: "monospace"
                                        }}>
                                          {questionData?.Code_Validation[activeTab]?.structure?.[selectedTestCaseIndex] ? 
                                            getExpectedDescription(questionData?.Code_Validation[activeTab].structure?.[selectedTestCaseIndex], activeTab) :
                                            'Expected result'
                                          }
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center text-muted" style={{ padding: "20px" }}>
                                <FontAwesomeIcon icon={faExpand} style={{ fontSize: "48px", opacity: 0.3 }} />
                                <p className="mt-2">Click RUN to validate your code</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      {/* ===== MAXIMIZED EDITOR VIEW ===== */}
      {isMaximized && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100vw', 
            height: '100vh', 
            backgroundColor: '#f2eeee', 
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header with file tabs */}
          <div className="bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center" style={{ flex: 1, minWidth: 0 }}>
              <div 
                className="d-flex"
                style={{ 
                  flexWrap: 'nowrap',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  scrollbarWidth: "thin",
                  scrollbarColor: "#c1c1c1 #f1f1f1",
                  flex: 1,
                  minWidth: 0,
                  maxWidth: 'calc(100% - 200px)'
                }}
              >
                {(questionData?.Tabs || []).map((tab: any, index: number) => (
                  <div
                    key={index}
                    style={{
                      minWidth: 'fit-content',
                      width: 'auto',
                      height: '30px',
                      borderRadius: '10px',
                      backgroundColor: activeTab === tab.name ? "black" : "transparent",
                      color: activeTab === tab.name ? "white" : "black",
                      border: activeTab === tab.name ? "none" : "1px solid black",
                      display: 'inline-block',
                      textAlign: 'center',
                      lineHeight: '30px',
                      marginRight: '8px',
                      cursor: 'pointer',
                      padding: '0 12px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                    className={`tab-button me-1 ${activeTab === tab.name ? 'selected-tab' : ''}`}
                    onClick={() => handleTabClick(tab.name)}
                    title={tab.name}
                  >
                    {tab.name}
                  </div>
                ))}
              </div>
            </div>
            <div className="d-flex align-items-center">
              <button
                className="btn btn-sm btn-light me-2"
                style={{
                  whiteSpace: "nowrap",
                  fontSize: "12px",
                  minWidth: "70px",
                  boxShadow: "#888 1px 2px 5px 0px",
                  height: "30px"
                }}
                onClick={() => setShowRequirement(!showRequirement)}
                disabled={processing}
              >
                {showRequirement ? 'HIDE REQUIREMENT' : 'REQUIREMENT'}
              </button>
              <button
                className="btn btn-sm btn-light me-2"
                style={{
                  whiteSpace: "nowrap",
                  fontSize: "12px",
                  minWidth: "70px",
                  boxShadow: "#888 1px 2px 5px 0px",
                  height: "30px"
                }}
                onClick={handleCheckCode}
                disabled={processing}
              >
                RUN
              </button>
            </div>
          </div>
          
          {/* Main content area */}
          <div style={{ flex: 1, display: 'flex', margin: '10px', gap: '10px' }}>
            {/* Editor area */}
            <div style={{ 
              width: showRequirement ? '60%' : '100%', 
              backgroundColor: 'white', 
              borderRadius: '4px',
              transition: 'width 0.3s ease'
            }}>
              {renderEditor()}
            </div>
            
            {/* Requirement panel - only shown when showRequirement is true */}
            {showRequirement && (
              <div style={{ 
                width: '40%',
                backgroundColor: 'white', 
                borderRadius: '4px', 
                padding: '0px', 
                height: 'calc(100vh - 70px)',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0
              }}>
                {/* Problem Statement & Requirements Section (50%) */}
                <div style={{ 
                  height: '50%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  borderBottom: '2px solid #dee2e6'
                }}>
                  <div 
                    className="flex-fill overflow-auto p-3"
                    style={{ 
                      scrollbarWidth: "thin",
                      scrollbarColor: "#c1c1c1 #f1f1f1"
                    }}
                  >
                    {/* Problem Statement Section */}
                    <div style={{ marginBottom: "20px" }}>
                      <h4 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "10px", color: "#333" }}>
                        Problem Statement
                      </h4>
                      <div 
                        style={{ 
                          whiteSpace: "pre-wrap", 
                          wordBreak: "break-word",
                          fontFamily: "inherit",
                          lineHeight: "1.5",
                          fontSize: "14px",
                          color: "#555"
                        }} 
                        dangerouslySetInnerHTML={{ __html: questionData?.Qn || '' }}
                      />
                    </div>

                    {/* Requirements Section */}
                    <div>
                      <h4 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "10px", color: "#333" }}>
                        Requirements
                      </h4>
                      <div  
                        dangerouslySetInnerHTML={{ __html: questionData?.requirements || '' }}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Expected Output Section (50%) */}
                <div style={{ 
                  height: '50%', 
                  display: 'flex', 
                  flexDirection: 'column'
                }}>
                  <div className="p-2" style={{ borderBottom: "1px solid #e9ecef" }}>
                    <h5 className="m-0" style={{ fontSize: "16px", fontWeight: "600" }}>
                    Expected Output
                  </h5>
                  </div>

                  {/* Output Tabs - Only show if both image and video are available */}
                  {questionData?.image_path && questionData?.video_path && (
                    <div className="p-2" style={{ borderBottom: "1px solid #e9ecef" }}>
                      <div className="d-flex">
                        <button
                          className={`btn me-2 ${activeOutputTab === 'image' ? 'btn-primary' : 'btn-outline-primary'}`}
                          onClick={() => setActiveOutputTab('image')}
                          style={{ fontSize: "12px", padding: "4px 8px" }}
                        >
                          Image
                        </button>
                        <button
                          className={`btn ${activeOutputTab === 'video' ? 'btn-primary' : 'btn-outline-primary'}`}
                          onClick={() => setActiveOutputTab('video')}
                          style={{ fontSize: "12px", padding: "4px 8px" }}
                        >
                          Video
                        </button>
                      </div>
                    </div>
                  )}

                  <div 
                    className="flex-fill overflow-auto p-3 d-flex justify-content-center align-items-start"
                    style={{ 
                      scrollbarWidth: "thin",
                      scrollbarColor: "#c1c1c1 #f1f1f1"
                    }}
                  >
                    {/* Show image if it's the active tab or if no video is available */}
                    {((questionData?.image_path && questionData?.video_path && activeOutputTab === 'image') || 
                      (questionData?.image_path && !questionData?.video_path)) && (
                      <img 
                        key={`maximized-image-${questionData?.Qn_name}`}
                        src={questionData.image_path} 
                        className="img-fluid" 
                        alt="Expected Output" 
                        style={{ 
                          pointerEvents: 'none', 
                          maxWidth: '100%',
                          height: 'auto',
                          borderRadius: '4px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }} 
                      />
                    )}

                    {/* Show video if it's the active tab or if no image is available */}
                    {((questionData?.image_path && questionData?.video_path && activeOutputTab === 'video') || 
                      (!questionData?.image_path && questionData?.video_path)) && (
                      <video 
                        key={`maximized-video-${questionData?.Qn_name}`}
                        src={questionData.video_path} 
                        className="img-fluid" 
                        controls
                        style={{ 
                          maxWidth: '100%',
                          height: 'auto',
                          borderRadius: '4px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }} 
                      />
                    )}

                    {/* Show message if neither image nor video is available */}
                    {!questionData?.image_path && !questionData?.video_path && (
                      <div className="text-center text-muted" style={{ padding: "20px" }}>
                        <FontAwesomeIcon icon={faExpand} style={{ fontSize: "48px", opacity: 0.3 }} />
                        <p className="mt-2"></p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}



    </div>
  );
};

export default HTMLCSSEditor;