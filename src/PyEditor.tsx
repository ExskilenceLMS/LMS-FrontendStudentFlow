import React, { useState, useEffect, useRef } from "react";
import AceEditor from "react-ace";
import { getApiClient } from "./utils/apiAuth";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/theme-dreamweaver";
import Sk from "skulpt";
import { useLocation, useNavigate } from "react-router-dom";
import SkeletonCode from './Components/EditorSkeletonCode'
import { secretKey } from "./constants";
import CryptoJS from "crypto-js";

/**
 * Interface for Example data structure
 * Contains input examples with expected outputs and explanations
 */
interface Example {
  Example: {
    Inputs: string[];      // Array of input values for the example
    Output: string;        // Expected output for the example
    Explanation: string;   // Explanation of how the example works
  };
}

/**
 * Interface for TestCase data structure
 * Handles mixed format: can be either array format (validation) or object format (actual tests)
 */
interface TestCase {
  Testcase: {
    Value: string[];       // Input values for the test case
    Output: string;        // Expected output for the test case
  } | string[];           // Can be either object format or array format for validation
}

/**
 * Interface for Question data structure
 * Represents a complete coding question with all its metadata and content
 */
interface Question {
  // Core question data
  Qn_name: string;        // Unique identifier for the question
  entered_ans: string;    // Student's previously entered answer
  score: string;          // Current score (e.g., "0/10")
  status: boolean;        // Whether the question is completed/solved
  Qn: string;            // The actual question text/problem statement
  Ans: string;           // Sample/expected answer code
  
  // Question metadata
  Name: string;          // Question name/title
  QNty: string;         // Question type identifier
  QnTe: string;         // Question template
  QnTy: string;         // Question type
  Tags: string[];       // Tags for categorization
  test: any[];          // Additional test data
  Hints: any[];         // Hints for the question
  Level: string;        // Difficulty level
  Table: string;        // Database table reference
  Examples: Example[];  // Example inputs and outputs
  Template: string;     // Code template
  ConceptID: string;    // Concept identifier
  CreatedBy: string;    // Creator information
  CreatedON: string;    // Creation date
  TestCases: TestCase[]; // Test cases for validation
  LastUpdated: string;  // Last update timestamp
  MultiSelect: string;  // Multi-select option
  Explanations: any[];  // Detailed explanations
  FunctionCall: string; // Function call pattern
  QuestionType: string; // Type of question
  
  // Additional optional fields that might be present
  topic_id?: string;
  subject_id?: string;
  currentFile?: string;
  subtopic_id?: string;
  Last_Updated_by?: string;
  level?: string;
  Query?: string;
}

/**
 * FastAPI Backend Response Interfaces
 */
// interface FastAPIHealthResponse {
//   status: string;
//   timestamp: string;
//   version: string;
//   redis_connected: boolean;
//   docker_available: boolean;
//   queue_length: number;
// }

interface FastAPISubmitResponse {
  submission_id: string;
  status: string;
  message: string;
  estimated_wait_time: number;
}

interface FastAPIStatusResponse {
  submission_id: string;
  status: string;
  result: {
    success: boolean;
    parsed_results: any[] | {
      success: boolean;
      output: string;
      error: string | null;
    };
    raw_output: string;
    actual_output: string;
    exit_code: number;
    execution_time: number;
    error?: string;
    results?: any[];
    compilation_error?: boolean;
    error_type?: string;
    line_number?: number;
    offset?: number;
  };
  error: string | null;
  execution_time: number;
  created_at: string;
  completed_at: string;
  queue_position: number;
}

// Helper type for parsed results
type ParsedResults = {
  success: boolean;
  output: string;
  error: string | null;
} | any[];

/**
 * Main PyEditor Component
 * Provides a complete Python coding environment with:
 * - Code editor with syntax highlighting
 * - FastAPI backend integration for code execution
 * - Test case validation
 * - Progress tracking
 * - Question navigation
 */
const PyEditor: React.FC = () => {
  const navigate = useNavigate();
  
  // ===== STATE MANAGEMENT =====
  
  // Questions and navigation state
  const [questions, setQuestions] = useState<Question[]>([
    {
      Qn_name: '',
      entered_ans: '',
      score: '',
      status: false,
      Qn: '',
      Ans: '',
      Name: '',
      QNty: '',
      QnTe: '',
      QnTy: '',
      Tags: [],
      test: [],
      Hints: [],
      Level: '',
      Table: '',
      Examples: [],
      Template: '',
      ConceptID: '',
      CreatedBy: '',
      CreatedON: '',
      TestCases: [],
      LastUpdated: '',
      MultiSelect: '',
      Explanations: [],
      FunctionCall: '',
      QuestionType: '',
    }
  ]);
  
  // UI state management
  const [pythonCode, setPythonCode] = useState<string>("");           // Current Python code in editor
  const [loading, setLoading] = useState<boolean>(true);              // Loading state for API calls
  const [output, setOutput] = useState<string>("");                   // Code execution output
  const [isWaitingForInput, setIsWaitingForInput] = useState<boolean>(false);  // Input prompt state
  const [currentInput, setCurrentInput] = useState<string>("");       // Current input for prompts
  const inputResolver = useRef<((value: string) => void) | null>(null);  // Resolver for input prompts
  const outputRef = useRef<HTMLPreElement>(null);                    // Reference to output element
  const [hasUserInteracted, setHasUserInteracted] = useState<boolean>(false);  // Track user interaction
  
  // Test case and validation state
  const [runResponseTestCases, setRunResponseTestCases] = useState<any[]>([]);  // Test case results
  const [successMessage, setSuccessMessage] = useState<string>("");   // Success/error messages
  const [additionalMessage, setAdditionalMessage] = useState<string>("");  // Additional info messages
  const [processing, setProcessing] = useState<boolean>(false);       // Processing state during execution
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<'output' | 'testcases'>('output');  // Currently selected test case
  
  // Question navigation and progress state
  const [functionCall, setFunctionCall] = useState<string>("");       // Function call pattern
  const [template, setTemplate] = useState<string>();                 // Code template
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);     // Submission status
  const [status, setStatus] = useState<boolean>(false);              // Question completion status
  const [enteredAns, setEnteredAns] = useState<string>("");          // Student's entered answer
  const [isNextBtn, setIsNextBtn] = useState<boolean>(false);        // Next button visibility
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);  // Current question index
  const [testCases, setTestCases] = useState<TestCase[]>([]);        // Current question's test cases
  const [Ans, setAns] = useState<string>("");                        // Current answer code
  
  // ===== FASTAPI BACKEND STATE =====
  
  // const [backendHealthy, setBackendHealthy] = useState<boolean>(false);  // Backend health status
  // const [healthCheckInterval, setHealthCheckInterval] = useState<NodeJS.Timeout | null>(null);  // Health check interval
  const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(null);  // Current submission ID
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'submitting' | 'executing' | 'completed' | 'error'>('idle');  // Execution status
  
  // ===== FASTAPI RESPONSE STORAGE =====
  
  const [questionResponses, setQuestionResponses] = useState<{[key: string]: any}>({});
  const [lastRunCode, setLastRunCode] = useState<{[key: string]: string}>({});
  
  // ===== SESSION STORAGE DATA EXTRACTION =====
  
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const queryQuestionIndex = urlParams.get('questionIndex');
  
  // Decrypt student data from session storage
  const encryptedStudentId = sessionStorage.getItem('StudentId');
  const decryptedStudentId = CryptoJS.AES.decrypt(encryptedStudentId!, secretKey).toString(CryptoJS.enc.Utf8);
  const studentId = decryptedStudentId;
  
  const encryptedSubjectId = sessionStorage.getItem('SubjectId');
  const decryptedSubjectId = CryptoJS.AES.decrypt(encryptedSubjectId!, secretKey).toString(CryptoJS.enc.Utf8);
  const subjectId = decryptedSubjectId;
  
  const encryptedSubject = sessionStorage.getItem('Subject');
  const decryptedSubject = CryptoJS.AES.decrypt(encryptedSubject!, secretKey).toString(CryptoJS.enc.Utf8);
  const subject = decryptedSubject;
  
  const encryptedWeekNumber = sessionStorage.getItem('WeekNumber');
  const decryptedWeekNumber = CryptoJS.AES.decrypt(encryptedWeekNumber!, secretKey).toString(CryptoJS.enc.Utf8);
  const weekNumber = decryptedWeekNumber;
  
  const encryptedDayNumber = sessionStorage.getItem('DayNumber');
  const decryptedDayNumber = CryptoJS.AES.decrypt(encryptedDayNumber!, secretKey).toString(CryptoJS.enc.Utf8);
  const dayNumber = decryptedDayNumber;
  
  // Additional student data (for potential future use)
  const actualStudentId= CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualEmail= CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualName= CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);
 
  /**
   * Encrypts data using AES encryption for secure storage
   * @param data - String data to encrypt
   * @returns Encrypted string
   */
  const encryptData = (data: string) => {
  return CryptoJS.AES.encrypt(data, secretKey).toString();
};

  /**
   * Decrypts data using AES decryption
   * @param encryptedData - Encrypted string to decrypt
   * @returns Decrypted string
   */
const decryptData = (encryptedData: string) => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
  return bytes.toString(CryptoJS.enc.Utf8);
};

  // ===== FASTAPI BACKEND INTEGRATION =====
  
  /**
   * Checks the health status of the FastAPI backend
   * Updates the backend health state and manages the health check interval
   */
  // const checkBackendHealth = async () => {
  //   try {
  //     const response = await fetch(`${process.env.REACT_APP_PYEXE_BASE_URL}health`);
  //     const data: FastAPIHealthResponse = await response.json();
  //     setBackendHealthy(data.status === 'healthy');
  //   } catch (error) {
  //     console.error('Backend health check failed:', error);
  //     setBackendHealthy(false);
  //   }
  // };

  /**
   * Starts periodic health checks every 10 seconds
   */
  // const startHealthChecks = () => {
  //   // Initial health check
  //   checkBackendHealth();
  //   
  //   // Set up periodic health checks every 10 seconds
  //   const interval = setInterval(checkBackendHealth, 10000);
  //   setHealthCheckInterval(interval);
  // };

  /**
   * Submits code to FastAPI backend for execution
   * @param code - The Python code to execute
   * @param testCases - Test cases to validate against
   * @param timeout - Execution timeout in seconds
   * @param questionId - Question identifier
   * @param testId - Test identifier
   * @returns Submission ID from the backend
   */
  const submitCodeToBackend = async (code: string, testCases: any[], timeout: number = 15, questionId: string = "q123", testId: string ="practice"): Promise<string> => {
    // Transform test cases to match the expected API format
    const transformedTestCases = testCases.map((testCase, index) => {
      if (index === 0 && Array.isArray(testCase.Testcase)) {
        // First test case should remain as simple array for keyword validation
        return {
          Testcase: testCase.Testcase
        };
      } else if (testCase.Testcase && testCase.Testcase.Value) {
        // Other test cases with Value property, use as is
        return {
          Testcase: {
            Value: testCase.Testcase.Value,
            Output: testCase.Testcase.Output
          }
        };
      } else if (Array.isArray(testCase.Testcase)) {
        // If Testcase is an array but not the first one, convert to Value format
        return {
          Testcase: {
            Value: testCase.Testcase,
            Output: "validation_check"
          }
        };
      } else {
        // Fallback for other formats
        return {
          Testcase: {
            Value: Array.isArray(testCase) ? testCase : [testCase],
            Output: "validation_check"
          }
        };
      }
    });

    const payload = {
      code: code,
      TestCases: transformedTestCases,
      FunctionCall: functionCall,
      language: "python",
      timeout: timeout,
      memory_limit: timeout === 10 ? "100m" : "200m",
      user_id: studentId,
      question_id: questionId,
      test_id: testId
    };

    const response = await fetch(`${process.env.REACT_APP_PYEXE_BASE_URL}api/v1/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: FastAPISubmitResponse = await response.json();
    return data.submission_id;
  };

  /**
   * Polls the execution status of a submission
   * @param submissionId - The submission ID to check
   * @param maxWaitTime - Maximum time to wait in seconds
   * @returns The final status response
   */
  const pollExecutionStatus = async (submissionId: string, maxWaitTime: number = 30): Promise<FastAPIStatusResponse> => {
    const startTime = Date.now();
    const pollInterval = 1000; // Poll every 1 second

    while (Date.now() - startTime < maxWaitTime * 1000) {
      try {
        const response = await fetch(`${process.env.REACT_APP_PYEXE_BASE_URL}api/v1/execute/${submissionId}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        const data: FastAPIStatusResponse = await response.json();
        
        if (data.status === 'completed') {
          return data;
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        console.error('Error polling execution status:', error);
        throw error;
      }
    }
    
    throw new Error(`Execution timeout after ${maxWaitTime} seconds`);
  };

  // ===== SKULPT (PYTHON EXECUTION ENGINE) SETUP =====
  
  /**
   * Loads Skulpt (Python-to-JavaScript compiler) for client-side Python execution
   * This allows running Python code directly in the browser
   * NOTE: This is kept for potential fallback, but primary execution is now via FastAPI
   */
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/skulpt@latest/dist/skulpt.min.js";
    script.async = true;
    script.onload = () => {
      // Load Skulpt standard library after main script loads
      const builtinScript = document.createElement('script');
      builtinScript.src = "https://cdn.jsdelivr.net/npm/skulpt@1.1.0/dist/skulpt-stdlib.js";
      builtinScript.async = true;
      document.body.appendChild(builtinScript);
    };
    document.body.appendChild(script);
  }, []);

  /**
   * Generates a unique key for storing user code in session storage
   * Format: userCode_{subject}_{weekNumber}_{dayNumber}_{questionName}
   * @param qnName - Question name/identifier
   * @returns Unique storage key
   */
  const getUserCodeKey = (qnName: string) => {
    return `userCode_${subject}_${weekNumber}_${dayNumber}_${qnName}`;
  };

  /**
   * Processes test cases to handle mixed format (array and object formats)
   * Converts array format to object format for consistency
   * @param testCases - Array of test cases with mixed formats
   * @returns Processed test cases in consistent object format
   */
  const processTestCases = (testCases: TestCase[]) => {
    return testCases.map(testCase => {
      // Do not convert array format to object format here.
      // The submitCodeToBackend function will handle the final API payload formatting.
      return testCase;
    });
  };

  /**
   * Extract mandatory keywords from the first test case
   */
  const extractMandatoryKeywords = (testCases: TestCase[]) => {
    if (!testCases || testCases.length === 0) return [];
    
    const firstTestCase = testCases[0];
    if (!firstTestCase || !firstTestCase.Testcase) return [];
    
    // Get the first test case value (keywords)
    const testCaseValue = Array.isArray(firstTestCase.Testcase) 
      ? firstTestCase.Testcase 
      : firstTestCase.Testcase.Value;
    
    if (!Array.isArray(testCaseValue)) return [];
    
    // Filter out keywords that contain "def" and return the rest
    return testCaseValue.filter(keyword => !keyword.includes('def'));
  };

  /**
   * Generate editor value with FunctionCall appended to template
   */
  const generateEditorValue = () => {
    const currentQuestion = questions[currentQuestionIndex];
    const template = currentQuestion?.Template || "";
    const functionCall = currentQuestion?.FunctionCall || "";
    
    // If user has entered code (and it's not empty), use that
    if (Ans && Ans.trim() !== "") {
      return Ans;
    }
    
    // If user has interacted and cleared the editor, return empty
    if (hasUserInteracted && Ans === "") {
      return "";
    }
    
    // If template exists, append FunctionCall
    if (template) {
      if (functionCall) {
        return template + '\n\n\n\n\n' + functionCall;
      }
      return template;
    }
    
    return "";
  };

  // ===== DATA FETCHING =====
  
  /**
   * Fetches coding questions from the backend API
   * Processes the response and sets up initial state
   */
  useEffect(() => {
    const fetchQuestions = async () => {
      // Construct API URL with all necessary parameters
      const url=`${process.env.REACT_APP_BACKEND_URL}api/student/practicecoding/` +
          `${studentId}/` +
          `${subject}/` +
          `${subjectId}/` +
          `${dayNumber}/` +
          `${weekNumber}/` +
          `${sessionStorage.getItem("currentSubTopicId")}/`
      
      try {
        const response = await getApiClient().get(url);
        
        // Process the questions and handle mixed test case formats
        const questionsWithSavedCode = response.data.questions.map((q: Question) => {
          const savedCodeKey = getUserCodeKey(q.Qn_name);
          const savedCode = sessionStorage.getItem(savedCodeKey);
          
          // Process test cases to handle mixed format
          const processedTestCases = processTestCases(q.TestCases);
          
          if (savedCode !== null) {
            // Restore previously saved code for this question
            return { ...q, entered_ans: savedCode, TestCases: processedTestCases };
          }
          return { ...q, TestCases: processedTestCases };
        });
        
        setQuestions(questionsWithSavedCode);

        // Set initial question index from session storage or default to 0
        const initialIndex = parseInt(sessionStorage.getItem("currentQuestionIndex")!) ? 
          parseInt(sessionStorage.getItem("currentQuestionIndex")!) : 0;
        
        setCurrentQuestionIndex(initialIndex);
        setStatus(questionsWithSavedCode[initialIndex].status);
        setEnteredAns(questionsWithSavedCode[initialIndex].entered_ans);
        setFunctionCall(questionsWithSavedCode[initialIndex].FunctionCall || '');
        setAns(questionsWithSavedCode[initialIndex].entered_ans ||  ''); 
        setLoading(false);
        // Initialize empty test case results
        setRunResponseTestCases([]);

      } catch (innerError: any) {
        setLoading(false);
        console.error("Error fetching python questions data:", innerError);
            } 
    };

    fetchQuestions();
  }, []);
  
  // ===== CODE EDITOR HANDLERS =====
  
  /**
   * Handles code changes in the AceEditor
   * Saves code to session storage for persistence
   * @param newCode - Updated code from the editor
   */
  const handleCodeChange = (newCode: string) => {
    setAns(newCode);
    setHasUserInteracted(true); // Mark user interaction
    
    // Save code to session storage for current question
    if (questions[currentQuestionIndex]?.Qn_name) {
      const codeKey = getUserCodeKey(questions[currentQuestionIndex].Qn_name);
      sessionStorage.setItem(codeKey, newCode);
    }
  };

  /**
   * Handles keyboard input for interactive Python programs (input() function)
   * Manages input prompts and user responses
   * @param event - Keyboard event
   */
  const handleKeyPress = (event: React.KeyboardEvent<HTMLPreElement>) => {
    if (!isWaitingForInput) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      if (inputResolver.current) {
        const inputValue = currentInput;
        setOutput(prev => prev + '\n');
        inputResolver.current(inputValue);
        inputResolver.current = null;
        setIsWaitingForInput(false);
        setCurrentInput("");
      }
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      if (currentInput.length > 0) {
        setCurrentInput(prev => prev.slice(0, -1));
        setOutput(prev => prev.slice(0, -1));
      }
    } else if (event.key.length === 1) {
      event.preventDefault();
      setCurrentInput(prev => prev + event.key);
      setOutput(prev => prev + event.key);
    }
  };

  /**
   * Creates an input prompt for Python input() function
   * Returns a promise that resolves with user input
   * @param prompt - The prompt text to display
   * @returns Promise that resolves with user input
   */
  const promptInput = (prompt: string) => {
    return new Promise<string>((resolve) => {
      setOutput(prev => prev + prompt);
      setIsWaitingForInput(true);
      inputResolver.current = resolve;
      if (outputRef.current) {
        outputRef.current.focus();
      }
    });
  };

  // ===== FASTAPI CODE EXECUTION =====
  
  /**
   * Code execution with test cases (RUN CODE button)
   * Executes code and validates against test cases
   */
  const handleRunCode = async () => {
    if (!Ans.trim()) {
      return;
    }

    setProcessing(true);
    setExecutionStatus('submitting');
    setOutput('');
    setSuccessMessage('');
    setAdditionalMessage('');
    setRunResponseTestCases([]);
    setSelectedTestCaseIndex(null);
    setActiveSection('output');

    try {
      // Use actual test cases from current question
      const currentQuestion = questions[currentQuestionIndex];
      const testCases = currentQuestion?.TestCases || [];

      const submissionId = await submitCodeToBackend(Ans, testCases, 10, "q790", "practice");
      setCurrentSubmissionId(submissionId);
      setExecutionStatus('executing');

      // Poll for completion
      const result = await pollExecutionStatus(submissionId, 15);
      
      if (result.result.success) {
        setOutput(result.result.actual_output);
        
        // Store FastAPI response for this question
        const questionKey = `coding_${currentQuestion.Qn_name}`;
        const responseData: any = {
          ...result,
          runResponseTestCases: [] as any[],
          output: result.result.actual_output,
          successMessage: "",
          additionalMessage: ""
        };
        
        if (Array.isArray(result.result.parsed_results)) {
          const testCaseResults = result.result.parsed_results.map((testCase, index) => ({
            id: `TestCase${index + 1}`,
            passed: testCase.passed,
            input: testCase.input || '',
            expected: testCase.expected || '',
            actual: testCase.actual || ''
          }));
          
          const allPassed = result.result.parsed_results.every((testCase: any) => testCase.passed);
          const finalResult = { 
            id: "Result",
            passed: allPassed,
            message: allPassed ? "Passed" : "Failed"
          };
          
          responseData.runResponseTestCases = [...testCaseResults, finalResult];
          
          if (allPassed) {
            responseData.successMessage = "Congratulations!";
            responseData.additionalMessage = "You have passed all the test cases. Click the submit code button.";
          } else {
            responseData.successMessage = "Wrong Answer";
            responseData.additionalMessage = "You have not passed all the test cases.";
          }
        }
        
        storeFastApiResponse(questionKey, responseData);
        
        // Store the code that was run
        setLastRunCode(prev => ({
          ...prev,
          [questionKey]: Ans
        }));
        
        if (Array.isArray(result.result.parsed_results)) {
          const testCaseResults = result.result.parsed_results.map((testCase, index) => ({
            id: `TestCase${index + 1}`,
            passed: testCase.passed,
            input: testCase.input || '',
            expected: testCase.expected || '',
            actual: testCase.actual || ''
          }));
          
          const allPassed = result.result.parsed_results.every((testCase: any) => testCase.passed);
          const finalResult = { 
            id: "Result",
            passed: allPassed,
            message: allPassed ? "Passed" : "Failed"
          };
          
          setRunResponseTestCases([...testCaseResults, finalResult]);
          setSuccessMessage(responseData.successMessage);
          setAdditionalMessage(responseData.additionalMessage);
        }
      } else {
        // Get the actual error message from result.error field
        const errorMessage = result.result.error;
        setOutput(`Error: ${errorMessage}`);
        setSuccessMessage('Execution failed');
        
        // Create failed test case results for errors so they can be submitted
        const currentQuestion = questions[currentQuestionIndex];
        let errorTestCases: any[] = [];
        
        if (currentQuestion && currentQuestion.TestCases && currentQuestion.TestCases.length > 0) {
          // Create failed test cases for each test case in the question
          errorTestCases = currentQuestion.TestCases.map((_, index) => ({
            id: `TestCase${index + 1}`,
            passed: false,
            output: "Error occurred during execution"
          }));
          
          // Add final result
          errorTestCases.push({
            id: "Result",
            passed: false,
            output: "Failed due to execution error"
          });
        }
        
        setRunResponseTestCases(errorTestCases);
        
        // Store error response for this question
        const questionKey = `coding_${currentQuestion.Qn_name}`;
        const errorResponseData = {
          ...result,
          runResponseTestCases: errorTestCases,
          output: `Error: ${errorMessage}`,
          successMessage: "Execution failed",
          additionalMessage: "Code has compilation or runtime errors"
        };
        
        storeFastApiResponse(questionKey, errorResponseData);
        
        // Store the code that was run (even for errors)
        setLastRunCode(prev => ({
          ...prev,
          [questionKey]: Ans
        }));
      }
      
      setExecutionStatus('completed');
    } catch (error) {
      console.error('Code execution with tests failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Execution failed';
      setOutput(`Error: ${errorMessage}`);
      setSuccessMessage('Execution failed');
      setExecutionStatus('error');
      
      // Create failed test case results for network/API errors so they can be submitted
      const currentQuestion = questions[currentQuestionIndex];
      let errorTestCases: any[] = [];
      
      if (currentQuestion && currentQuestion.TestCases && currentQuestion.TestCases.length > 0) {
        // Create failed test cases for each test case in the question
        errorTestCases = currentQuestion.TestCases.map((_, index) => ({
          id: `TestCase${index + 1}`,
          passed: false,
          output: "Error occurred during execution"
        }));
        
        // Add final result
        errorTestCases.push({
          id: "Result",
          passed: false,
          output: "Failed due to execution error"
        });
      }
      
      setRunResponseTestCases(errorTestCases);
      
      // Store error response for this question
      const questionKey = `coding_${currentQuestion.Qn_name}`;
      const errorResponseData = {
        submission_id: "error",
        status: "error",
        result: {
          success: false,
          error: errorMessage,
          parsed_results: [],
          raw_output: "",
          actual_output: "",
          exit_code: -1,
          execution_time: 0
        },
        runResponseTestCases: errorTestCases,
        output: `Error: ${errorMessage}`,
        successMessage: "Execution failed",
        additionalMessage: "Network or API error occurred"
      };
      
      storeFastApiResponse(questionKey, errorResponseData);
      
      // Store the code that was run (even for errors)
      setLastRunCode(prev => ({
        ...prev,
        [questionKey]: Ans
      }));
    } finally {
      setProcessing(false);
    }
  };

  // ===== QUESTION NAVIGATION =====
  
  /**
   * Handles switching between different questions
   * Saves current code and loads new question data
   * @param index - Index of the question to switch to
   */
const handleQuestionChange = (index: number) => {
    // Save current code before switching
  if (questions[currentQuestionIndex]?.Qn_name && Ans) {
    const currentCodeKey = getUserCodeKey(questions[currentQuestionIndex].Qn_name);
    sessionStorage.setItem(currentCodeKey, Ans);
  }

  setOutput('');
  setCurrentQuestionIndex(index);
  setHasUserInteracted(false); // Reset interaction state for new question

  // Retrieve and decrypt the submit status from session storage
  const submitStatusKey = `submitStatus_${studentId}_${subject}_${weekNumber}_${dayNumber}_${questions[index].Qn_name}`;
  const encryptedSubmitStatus = sessionStorage.getItem(submitStatusKey);
  const isSubmittedStatus = encryptedSubmitStatus ? decryptData(encryptedSubmitStatus) === 'true' : false;

  setStatus(questions[index].status);
  setIsSubmitted(isSubmittedStatus);

    // Load saved code for the new question
  const nextQuestionKey = getUserCodeKey(questions[index].Qn_name);
  const savedCode = sessionStorage.getItem(nextQuestionKey);

  if (savedCode !== null) {
    setEnteredAns(savedCode);
    setAns(savedCode);
  } else {
    setEnteredAns(questions[index].entered_ans);
    setAns(questions[index].entered_ans || '');
  }

  const question = questions[index];
    // Process test cases to handle mixed format
    const processedTestCases = processTestCases(question.TestCases || []);
    setTestCases(processedTestCases);

    // Reset UI state for new question
  setRunResponseTestCases([]);
  setSuccessMessage("");
  setAdditionalMessage("");
    setSelectedTestCaseIndex(null);
    setActiveSection('output');
};

  /**
   * Handles navigation to the next question
   * Saves current progress and loads next question
   */
const handleNext = () => {
    // Save current code before proceeding
  if (questions[currentQuestionIndex]?.Qn_name && Ans) {
    const currentCodeKey = getUserCodeKey(questions[currentQuestionIndex].Qn_name);
    sessionStorage.setItem(currentCodeKey, Ans);
  }

  setIsNextBtn(false);
    
    // Check if this is the last question
  if (currentQuestionIndex == questions.length - 1) {
    navigate('/Subject-Roadmap', { replace: true });
  } else {
    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIndex);
    setHasUserInteracted(false); // Reset interaction state for next question

    const nextQuestionKey = getUserCodeKey(questions[nextIndex].Qn_name);
    const savedCode = sessionStorage.getItem(nextQuestionKey);

    setStatus(questions[nextIndex].status);

    if (savedCode !== null) {
      setEnteredAns(savedCode);
      setAns(savedCode);
    } else {
      setEnteredAns(questions[nextIndex].entered_ans);
      setAns(questions[nextIndex].entered_ans || '');
    }

      // Process test cases to handle mixed format
      const processedTestCases = processTestCases(questions[nextIndex].TestCases || []);
      setTestCases(processedTestCases);

      // Reset UI state for next question
    setRunResponseTestCases([]);
    setSuccessMessage("");
    setAdditionalMessage("");
    setOutput('');
    setIsSubmitted(false);
    setSelectedTestCaseIndex(null);
    setActiveSection('output');
  }
};

  // ===== SUBMIT LOGIC =====
  
  /**
   * Check if submit button should be enabled
   * Enables after any code execution attempt (success or error)
   */
  const canSubmitCode = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion?.Qn_name) {
      return false; // No current question
    }
    
    // Check for stored response using the correct key pattern
    const questionKey = `coding_${currentQuestion.Qn_name}`;
    const storedResponse = getStoredFastApiResponse(questionKey);
    if (!storedResponse) {
      return false; // No run response for this question
    }
    
    // Allow submission regardless of success/error - student attempted the question
    // This enables learning from mistakes and proper assessment
    
    const lastRunCodeForQuestion = lastRunCode[questionKey];
    if (!lastRunCodeForQuestion) {
      return false; // No code was run for this question
    }
    
    const currentCode = Ans.trim().replace(/\n/g, " ").replace(/;$/, "");
    const lastRunCodeTrimmed = lastRunCodeForQuestion.trim().replace(/\n/g, " ").replace(/;$/, "");
    
    return currentCode === lastRunCodeTrimmed;
  };

  /**
   * Submits the final answer to the backend
   * Marks the question as completed and saves progress
   */
const handleSubmit = async () => {
  setIsSubmitted(true);
    setProcessing(true);
  const url = `${process.env.REACT_APP_BACKEND_URL}api/student/coding/`;

  try {
    // Get course_id from session storage
    const encryptedCourseId = sessionStorage.getItem('CourseId');
    const courseId = encryptedCourseId ? CryptoJS.AES.decrypt(encryptedCourseId, secretKey).toString(CryptoJS.enc.Utf8) : "course19";

    // Transform test case results to the required format
    let submissionTestCases: Array<{[key: string]: string}> = [];

    if (runResponseTestCases.length > 0) {
      // Transform the complex test case objects to simple format
      submissionTestCases = runResponseTestCases.map((testCase, index) => {
        if (testCase.id === "Result") {
          // Final result should be "True" or "False"
          return { "Result": testCase.passed ? "True" : "False" };
        } else {
          // Individual test cases should be "Passed" or "Failed"
          return { [`TestCase${index + 1}`]: testCase.passed ? "Passed" : "Failed" };
        }
      });
    } else {
      // If no test cases were run (due to errors), create failed test cases based on the current question's test cases
      // This ensures that even error cases get proper test case results for submission
      const currentQuestion = questions[currentQuestionIndex];
      if (currentQuestion && currentQuestion.TestCases && currentQuestion.TestCases.length > 0) {
        const failedTestCases = currentQuestion.TestCases.map((_, index) => ({
          [`TestCase${index + 1}`]: "Failed"
        }));
        const finalResult = { "Result": "False" };
        submissionTestCases = [...failedTestCases, finalResult];
      }
    }

    const postData = {
      student_id: studentId,
      week_number: weekNumber,
      day_number: dayNumber,
      subject: subject,
      subject_id: subjectId,
      Qn: questions[currentQuestionIndex].Qn_name,
      Ans: Ans,
      CallFunction: "",
      Result: submissionTestCases,
      Attempt: 0,
      final_score: "0/0",
      course_id: courseId,
      batch_id: decryptData(sessionStorage.getItem("BatchId") || "")
    };

    const response = await getApiClient().put(url, postData);
    const responseData = response.data;

      // Update question status to completed
    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestionIndex].status = true;
    setQuestions(updatedQuestions);
    setStatus(true);

      // Save code to session storage
    const codeKey = getUserCodeKey(questions[currentQuestionIndex].Qn_name);
    sessionStorage.setItem(codeKey, Ans);

      // Save submission status
    const submitStatusKey = `submitStatus_${studentId}_${subject}_${weekNumber}_${dayNumber}_${questions[currentQuestionIndex].Qn_name}`;
    sessionStorage.setItem(submitStatusKey, encryptData("true"));

    setIsNextBtn(true);
  } catch (innerError: any) {
    setSuccessMessage("Error");
      setAdditionalMessage("There was an error submitting the code.");
      console.error("Error fetching python code submit data:", innerError);
  } finally {
    setProcessing(false);
  }
};

  // ===== UTILITY FUNCTIONS =====
  
  /**
   * Store FastAPI response per question
   */
  const storeFastApiResponse = (questionKey: string, response: any) => {
    setQuestionResponses(prev => ({
      ...prev,
      [questionKey]: response
    }));
  };

  /**
   * Get stored FastAPI response for a question
   */
  const getStoredFastApiResponse = (questionKey: string) => {
    return questionResponses[questionKey] || null;
  };

  // ===== RENDERING =====

  // Show loading skeleton while data is being fetched
  if (loading) {
    return (
      <div className="container-fluid p-0" style={{ height: "100vh", maxWidth: "100%", overflowX: "hidden", backgroundColor: "#f2eeee" }}>
        <div className="p-0 my-0 me-2" style={{ backgroundColor: "#F2EEEE"}}>
          <SkeletonCode />
        </div>
      </div>
    );
  }

  /**
   * Main render method
   * Displays the complete Python coding environment with:
   * - Question navigation buttons
   * - Problem statement panel
   * - Code editor
   * - Output and results panel
   */
  return (
    <div className="container-fluid p-0" style={{ height: 'calc(100vh - 70px)', overflowX: "hidden", overflowY: "hidden", backgroundColor: "#f2eeee" }}>
      <div className="p-0 my-0" style={{ backgroundColor: "#F2EEEE", marginRight: '10px' }}>
        <div className="container-fluid p-0 pt-2" style={{ maxWidth: "100%", overflowX: "hidden", overflowY: "auto", backgroundColor: "#f2eeee" }}>
          <div className="row g-2">
            <div className="col-12">
              <div className="" style={{ height: "100vh", overflow: "hidden", padding: '0px 0px 65px 0px' }}>
                <div className="d-flex" style={{ height: '100%', width: '100%' }}>
                  
                  {/* ===== QUESTION NAVIGATION PANEL ===== */}
                  <div className="col-1 lg-8 pb-3" style={{ width: "70px", display: "flex", flexDirection: "column", paddingRight: "15px",overflow:"auto" }}>
                    {questions.map((_, index) => (
                      <button
                        key={index}
                        className="btn rounded-2 mb-2 px-1 mx-auto"
                        style={{
                          width: "50px",
                          height: "50px",
                          backgroundColor: currentQuestionIndex === index ? "#42FF58" : "#FFFFFF",
                          color: "#000",
                          cursor: "pointer",
                          boxShadow: "#888 1px 2px 5px 0px"
                        }}
                        onClick={() => handleQuestionChange(index)}
                      >
                        Q{index + 1}
                      </button>
                    ))}
                  </div>

                  {/* ===== PROBLEM STATEMENT PANEL ===== */}
                  <div className="col-5 lg-8 bg-white" style={{ height: "100%", display: "flex", flexDirection: "column", marginLeft: "-10px", marginRight: "10px" }}>
                    <div className="bg-white" style={{ height: "100%", backgroundColor: "#E5E5E533",overflow:"auto" }}>
                      <div className="p-3 flex-grow-1 overflow-auto">
                        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{questions[currentQuestionIndex]?.Qn}</pre>
                        
                        {/* ===== MANDATORY KEYWORDS SECTION ===== */}
                        {(() => {
                          const currentQuestion = questions[currentQuestionIndex];
                          const mandatoryKeywords = extractMandatoryKeywords(currentQuestion?.TestCases || []);
                          
                          if (mandatoryKeywords.length > 0) {
                            return (
                              <div className="mt-4">
                                <h6 style={{ color: "#333", fontWeight: "bold", marginBottom: "10px" }}>Must-Use Keywords and Variables in your code :</h6>
                                <div className="mb-3 p-3" style={{ 
                                  backgroundColor: "#f8f9fa", 
                                  border: "1px solid #dee2e6", 
                                  borderRadius: "8px",
                                  fontSize: "13px"
                                }}>
                                  <span style={{ color: "#212529" }}>
                                    {mandatoryKeywords.join(', ')}
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        
                        {/* ===== EXAMPLES SECTION ===== */}
                        {questions[currentQuestionIndex]?.Examples && questions[currentQuestionIndex].Examples.length > 0 && (
                          <div className="mt-4">
                            <h6 style={{ color: "#333", fontWeight: "bold", marginBottom: "10px" }}>Examples:</h6>
                            {questions[currentQuestionIndex].Examples.map((example, index) => (
                              <div key={index} className="mb-3 p-3" style={{ 
                                backgroundColor: "#f8f9fa", 
                                border: "1px solid #dee2e6", 
                                borderRadius: "8px",
                                fontSize: "13px"
                              }}>
                                <div className="mb-2">
                                  <strong style={{ color: "#495057" }}>Example {index + 1}:</strong>
                      </div>
                                
                                {/* Input */}
                                {example.Example.Inputs && example.Example.Inputs.length > 0 && (
                                  <div className="mb-2">
                                    <span style={{ color: "#6c757d", fontWeight: "500" }}>Input: </span>
                                    <span style={{ color: "#212529" }}>
                                      {example.Example.Inputs.join(", ")}
                                    </span>
                    </div>
                                )}
                                
                                {/* Output */}
                                {example.Example.Output && (
                                  <div className="mb-2">
                                    <span style={{ color: "#6c757d", fontWeight: "500" }}>Output: </span>
                                    <span style={{ color: "#212529" }}>
                                      {example.Example.Output}
                                    </span>
                  </div>
                                )}
                                
                                {/* Explanation */}
                                {example.Example.Explanation && (
                                  <div>
                                    <span style={{ color: "#6c757d", fontWeight: "500" }}>Explanation: </span>
                                    <span style={{ color: "#212529" }}>
                                      {example.Example.Explanation}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ===== CODE EDITOR AND CONTROLS PANEL ===== */}
                  <div className="col-6 lg-8" style={{ height: "100%", display: "flex", flexDirection: "column", width: '55.1%' }}>
                    
                    {/* ===== CODE EDITOR ===== */}
                    <div className="bg-white me-3" style={{ height: "45%", backgroundColor: "#E5E5E533" }}>
                      <AceEditor
                        mode="python"
                        theme="dreamweaver"
                        onChange={handleCodeChange}
                        value={generateEditorValue()}
                        fontSize={14}
                        showPrintMargin={false}
                        wrapEnabled={true}
                        className="pe-3"
                        style={{ width: "95%", height: "calc(100% - 60px)", marginTop: "20px", margin: '15px' }}
                        placeholder={questions[currentQuestionIndex]?.Template || questions[currentQuestionIndex]?.FunctionCall ? "" : `Instructions :
1. Don't use input() function. 
2. It is mandatory to use the exact variable names provided in the question or example [variable names are case-sensitive ]


Write your Code here.`}
                      />
                    </div>

                    {/* ===== PROCESSING STATUS AND ACTION BUTTONS ===== */}
                    <div style={{ height: "6%", marginRight: '37px', backgroundColor: "#E5E5E533" }} className="d-flex flex-column justify-content-center processingDiv">
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
                        <div className="d-flex justify-content-end align-items-center">
                          {/* Run Code Button (With test cases) */}
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
                            onClick={handleRunCode}
                            disabled={processing || !Ans.trim()}
                            // disabled={processing || !Ans.trim() || !backendHealthy}
                          >
                            {/* Health Status Indicator */}
                            {/* <div 
                              style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                backgroundColor: backendHealthy ? "#10B981" : "#EF4444",
                                border: `1px solid ${backendHealthy ? "#059669" : "#DC2626"}`,
                                boxShadow: backendHealthy 
                                  ? "0 0 4px rgba(16, 185, 129, 0.6)" 
                                  : "0 0 4px rgba(239, 68, 68, 0.6)",
                                animation: backendHealthy ? "pulse-green-small 2s ease-in-out infinite" : "pulse-red-small 2s ease-in-out infinite",
                                flexShrink: 0
                              }}
                              title={backendHealthy ? "Backend Connected" : "Backend Disconnected"}
                            /> */}
                            RUN CODE
                            
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
                            disabled={isSubmitted || processing || status || !canSubmitCode()}
                          >
                            {(isSubmitted || status) ? "SUBMITTED" : "SUBMIT CODE"}
                          </button>
                          
                          {/* Next Button (only shown when question is completed) */}
                          {(isSubmitted || status) &&
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
                              onClick={handleNext}
                            >
                              NEXT
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

                        {/* ===== CODE EXECUTION OUTPUT ===== */}
                        {activeSection === 'output' && (
                          <div style={{ flex: 1, maxHeight: "90%", overflow: "auto" }}>
                          {output && (
                            <>
                                {/* <h6 style={{ 
                                color: "#333", 
                                fontWeight: "bold", 
                                marginBottom: "10px", 
                                fontSize: "14px",
                                position: "sticky",
                                top: "0",
                                zIndex: 1,
                                backgroundColor: "#fff",
                                padding: "5px 0"
                                }}>Output:</h6> */}
                              <pre
                                className="m-0 "
                                id="output"
                                ref={outputRef}
                                tabIndex={0}
                                onKeyDown={handleKeyPress}
                                style={{
                                  fontSize: "12px",
                                  fontFamily: "monospace",
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                  backgroundColor: "#f8f9fa",
                                  padding: "10px",
                                  borderRadius: "4px",
                                  border: "1px solid #e9ecef",
                                  margin: "0",
                                  overflow: "auto"
                                }}
                              >
                                {output}
                              </pre>
                            </>
                          )}
                        </div>
                        )}
                        
                        {/* ===== TEST CASE RESULTS ===== */}
                        {activeSection === 'testcases' && runResponseTestCases && runResponseTestCases.length > 0 && (
                          <div style={{ flex: 1, maxHeight: "90%", overflow: "auto" }}>
                            {/* <h6 style={{ 
                              color: "#333", 
                              fontWeight: "bold", 
                              marginBottom: "10px", 
                              fontSize: "14px",
                              position: "sticky",
                              top: "0",
                              zIndex: 1,
                              backgroundColor: "#fff",
                              padding: "5px 0"
                            }}>Test Cases:</h6> */}
                            
                            {/* Two-column layout for test cases */}
                            <div className="d-flex" style={{ height: "calc(100%)" }}>
                                                             {/* Left Column - Test Case List (20%) */}
                               <div className="border-end" style={{ 
                                 width: "20%", 
                                 overflowY: "auto", 
                                 padding: "1px 10px 1px 10px",
                                 scrollbarWidth: "thin",
                                 scrollbarColor: "#c1c1c1 #f1f1f1"
                               }}>
                              {runResponseTestCases.map((testCase, index) => (
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
                                        backgroundColor: selectedTestCaseIndex === index ? '#f2f2f0' : '#f8f9fa'  ,
                                        border: '1px solid #dee2e6',
                                        color: selectedTestCaseIndex === index ? '#007bff' : '#212529'
                                      }}
                                     onClick={() => setSelectedTestCaseIndex(index)}
                                   >
                                     <span>{testCase.id}</span>
                                    {testCase.passed ? (
                                      <span className="text-success">✓</span>
                                    ) : (
                                      <span className="text-danger">✗</span>
                                    )}
                                  </div>
                                 ))}
                                  </div>
                              
                              {/* Right Column - Test Case Details (70%) */}
                              <div className="px-5 pt-1 pb-3" style={{ width: "80%", overflowY: "auto" }}>
                                                                 {selectedTestCaseIndex !== null && runResponseTestCases[selectedTestCaseIndex] && (
                                   <div>
                                     {/* Test Case Status */}
                                    <div className="mb-3">
                                      <strong>Status: </strong>
                                      <span className={runResponseTestCases[selectedTestCaseIndex].passed ? "text-success" : "text-danger"}>
                                        {runResponseTestCases[selectedTestCaseIndex].passed ? "Passed" : "Failed"}
                                      </span>
                                </div>
                                    
                                    {/* For first test case (keyword validation) - show only status and actual output */}
                                    {selectedTestCaseIndex === 0 ? (
                                      <>
                                        <div className="mb-3">
                                          <strong>Type: </strong>
                                          <span className="text-info">Keyword Validation</span>
                            </div>
                                        
                                        {/* Actual Output for keyword validation */}
                                        <div className="mb-3">
                                          {/* <strong>Actual Output:</strong> */}
                                          <div className="mt-1 p-2 bg-light rounded" style={{ fontSize: "11px", fontFamily: "monospace" }}>
                                            {(() => {
                                              const response = getStoredFastApiResponse(`coding_${questions[currentQuestionIndex]?.Qn_name}`);
                                              if (response?.result?.parsed_results?.[selectedTestCaseIndex]) {
                                                const value = response.result.parsed_results[selectedTestCaseIndex].result || "No output";
                                                if (Array.isArray(value)) {
                                                  // Handle array of values (each on new line)
                                                  return value.map((item: any, index: number) => {
                                                    const itemString = String(item);
                                                    // Replace literal '\n' strings with actual line breaks
                                                    if (itemString.includes('\\n')) {
                                                      return itemString.split('\\n').map((line: string, lineIndex: number) => (
                                                        <React.Fragment key={`${index}-${lineIndex}`}>
                                                          {line}
                                                          {lineIndex < itemString.split('\\n').length - 1 && <br />}
                                                        </React.Fragment>
                                                      ));
                                                    } else if (itemString.includes('\n')) {
                                                      return itemString.split('\n').map((line: string, lineIndex: number) => (
                                                        <React.Fragment key={`${index}-${lineIndex}`}>
                                                          {line}
                                                          {lineIndex < itemString.split('\n').length - 1 && <br />}
                                                        </React.Fragment>
                                                      ));
                                                    }
                                                    return (
                                                      <React.Fragment key={index}>
                                                        {itemString}
                                                        {index < value.length - 1 && <br />}
                                                      </React.Fragment>
                                                    );
                                                  });
                                                } else {
                                                  // Handle single value with potential newlines
                                                  const stringValue = String(value);
                                                  // Replace literal '\n' strings with actual line breaks
                                                  if (stringValue.includes('\\n')) {
                                                    return stringValue.split('\\n').map((line: string, index: number) => (
                                                      <React.Fragment key={index}>
                                                        {line}
                                                        {index < stringValue.split('\\n').length - 1 && <br />}
                                                      </React.Fragment>
                                                    ));
                                                  } else if (stringValue.includes('\n')) {
                                                    return stringValue.split('\n').map((line: string, index: number) => (
                                                      <React.Fragment key={index}>
                                                        {line}
                                                        {index < stringValue.split('\n').length - 1 && <br />}
                                                      </React.Fragment>
                                                    ));
                                                  }
                                                  return stringValue;
                                                }
                                              }
                                              return "No output";
                                            })()}
                                          </div>
                                        </div>
                                      </>
                                    ) : selectedTestCaseIndex > 0 && runResponseTestCases[selectedTestCaseIndex]?.id !== "Result" ? (
                                      <>
                                                                                                                        {/* Input */}
                                        <div className="mb-3">
                                          <strong>Input:</strong>
                                          <div className="mt-1 p-2 bg-light rounded" style={{ fontSize: "11px", fontFamily: "monospace" }}>
                                            {(() => {
                                              const currentQuestion = questions[currentQuestionIndex];
                                              const testCaseData = currentQuestion?.TestCases?.[selectedTestCaseIndex];
                                              if (testCaseData?.Testcase && typeof testCaseData.Testcase === 'object' && 'Value' in testCaseData.Testcase) {
                                                const value = testCaseData.Testcase.Value;
                                                if (Array.isArray(value)) {
                                                  // Handle array of values (each on new line)
                                                  return value.map((item: any, index: number) => {
                                                    const itemString = String(item);
                                                    // Replace literal '\n' strings with actual line breaks
                                                    if (itemString.includes('\\n')) {
                                                      return itemString.split('\\n').map((line: string, lineIndex: number) => (
                                                        <React.Fragment key={`${index}-${lineIndex}`}>
                                                          {line}
                                                          {lineIndex < itemString.split('\\n').length - 1 && <br />}
                                                        </React.Fragment>
                                                      ));
                                                    } else if (itemString.includes('\n')) {
                                                      return itemString.split('\n').map((line: string, lineIndex: number) => (
                                                        <React.Fragment key={`${index}-${lineIndex}`}>
                                                          {line}
                                                          {lineIndex < itemString.split('\n').length - 1 && <br />}
                                                        </React.Fragment>
                                                      ));
                                                    }
                                                    return (
                                                      <React.Fragment key={index}>
                                                        {itemString}
                                                        {index < value.length - 1 && <br />}
                                                      </React.Fragment>
                                                    );
                                                  });
                                                } else {
                                                  // Handle single value with potential newlines
                                                  const stringValue = String(value);
                                                  // Replace literal '\n' strings with actual line breaks
                                                  if (stringValue.includes('\\n')) {
                                                    return stringValue.split('\\n').map((line: string, index: number) => (
                                                      <React.Fragment key={index}>
                                                        {line}
                                                        {index < stringValue.split('\\n').length - 1 && <br />}
                                                      </React.Fragment>
                                                    ));
                                                  } else if (stringValue.includes('\n')) {
                                                    return stringValue.split('\n').map((line: string, index: number) => (
                                                      <React.Fragment key={index}>
                                                        {line}
                                                        {index < stringValue.split('\n').length - 1 && <br />}
                                                      </React.Fragment>
                                                    ));
                                                  }
                                                  return stringValue;
                                                }
                                              }
                                              return "No input data";
                                            })()}
                                          </div>
                                        </div>
                                        
                                        {/* Expected Output */}
                                        <div className="mb-3">
                                          <strong>Expected Output:</strong>
                                          <div className="mt-1 p-2 bg-light rounded" style={{ fontSize: "11px", fontFamily: "monospace" }}>
                                            {(() => {
                                              const currentQuestion = questions[currentQuestionIndex];
                                              const testCaseData = currentQuestion?.TestCases?.[selectedTestCaseIndex];
                                              if (testCaseData?.Testcase && typeof testCaseData.Testcase === 'object' && 'Output' in testCaseData.Testcase) {
                                                const value = testCaseData.Testcase.Output;
                                                if (Array.isArray(value)) {
                                                  // Handle array of values (each on new line)
                                                  return value.map((item: any, index: number) => {
                                                    const itemString = String(item);
                                                    // Replace literal '\n' strings with actual line breaks
                                                    if (itemString.includes('\\n')) {
                                                      return itemString.split('\\n').map((line: string, lineIndex: number) => (
                                                        <React.Fragment key={`${index}-${lineIndex}`}>
                                                          {line}
                                                          {lineIndex < itemString.split('\\n').length - 1 && <br />}
                                                        </React.Fragment>
                                                      ));
                                                    } else if (itemString.includes('\n')) {
                                                      return itemString.split('\n').map((line: string, lineIndex: number) => (
                                                        <React.Fragment key={`${index}-${lineIndex}`}>
                                                          {line}
                                                          {lineIndex < itemString.split('\n').length - 1 && <br />}
                                                        </React.Fragment>
                                                      ));
                                                    }
                                                    return (
                                                      <React.Fragment key={index}>
                                                        {itemString}
                                                        {index < value.length - 1 && <br />}
                                                      </React.Fragment>
                                                    );
                                                  });
                                                } else {
                                                  // Handle single value with potential newlines
                                                  const stringValue = String(value);
                                                  // Replace literal '\n' strings with actual line breaks
                                                  if (stringValue.includes('\\n')) {
                                                    return stringValue.split('\\n').map((line: string, index: number) => (
                                                      <React.Fragment key={index}>
                                                        {line}
                                                        {index < stringValue.split('\n').length - 1 && <br />}
                                                      </React.Fragment>
                                                    ));
                                                  } else if (stringValue.includes('\n')) {
                                                    return stringValue.split('\n').map((line: string, index: number) => (
                                                      <React.Fragment key={index}>
                                                        {line}
                                                        {index < stringValue.split('\n').length - 1 && <br />}
                                                      </React.Fragment>
                                                    ));
                                                  }
                                                  return stringValue;
                                                }
                                              }
                                              return "No expected output";
                                            })()}
                                          </div>
                                        </div>
                                        
                                        {/* Actual Output */}
                                        <div className="mb-3">
                                          <strong>Actual Output:</strong>
                                          <div className="mt-1 p-2 bg-light rounded" style={{ fontSize: "11px", fontFamily: "monospace" }}>
                                            {(() => {
                                              const response = getStoredFastApiResponse(`coding_${questions[currentQuestionIndex]?.Qn_name}`);
                                              if (response?.result?.parsed_results?.[selectedTestCaseIndex]) {
                                                const value = response.result.parsed_results[selectedTestCaseIndex].result || "No output";
                                                if (Array.isArray(value)) {
                                                  // Handle array of values (each on new line)
                                                  return value.map((item: any, index: number) => {
                                                    const itemString = String(item);
                                                    // Replace literal '\n' strings with actual line breaks
                                                    if (itemString.includes('\\n')) {
                                                      return itemString.split('\\n').map((line: string, lineIndex: number) => (
                                                        <React.Fragment key={`${index}-${lineIndex}`}>
                                                          {line}
                                                          {lineIndex < itemString.split('\\n').length - 1 && <br />}
                                                        </React.Fragment>
                                                      ));
                                                    } else if (itemString.includes('\n')) {
                                                      return itemString.split('\n').map((line: string, lineIndex: number) => (
                                                        <React.Fragment key={`${index}-${lineIndex}`}>
                                                          {line}
                                                          {lineIndex < itemString.split('\n').length - 1 && <br />}
                                                        </React.Fragment>
                                                      ));
                                                    }
                                                    return (
                                                      <React.Fragment key={index}>
                                                        {itemString}
                                                        {index < value.length - 1 && <br />}
                                                      </React.Fragment>
                                                    );
                                                  });
                                                } else {
                                                  // Handle single value with potential newlines
                                                  const stringValue = String(value);
                                                  // Replace literal '\n' strings with actual line breaks
                                                  if (stringValue.includes('\\n')) {
                                                    return stringValue.split('\\n').map((line: string, index: number) => (
                                                      <React.Fragment key={index}>
                                                        {line}
                                                        {index < stringValue.split('\n').length - 1 && <br />}
                                                      </React.Fragment>
                                                    ));
                                                  } else if (stringValue.includes('\n')) {
                                                    return stringValue.split('\n').map((line: string, index: number) => (
                                                      <React.Fragment key={index}>
                                                        {line}
                                                        {index < stringValue.split('\n').length - 1 && <br />}
                                                      </React.Fragment>
                                                    ));
                                                  }
                                                  return stringValue;
                                                }
                                              }
                                              return "No output";
                                            })()}
                                          </div>
                                        </div>
                                      </>
                                    ) : null}
                                    
                                    {/* Execution Time - only show for non-Result and non-first test cases */}
                                    {runResponseTestCases[selectedTestCaseIndex]?.id !== "Result" && selectedTestCaseIndex !== 0 && (
                                      <div className="mt-3">
                                        <strong>Execution Time: </strong>
                                        <span className="text-muted">
                                          {(() => {
                                            const response = getStoredFastApiResponse(`coding_${questions[currentQuestionIndex]?.Qn_name}`);
                                            if (response?.result?.parsed_results?.[selectedTestCaseIndex]) {
                                              return `${(response.result.parsed_results[selectedTestCaseIndex].execution_time * 1000).toFixed(3)}ms`;
                                            }
                                            return "N/A";
                                          })()}
                                        </span>
                          </div>
                        )}
                      </div>
                                )}
                                
                                {/* Default message when no test case is selected */}
                                {selectedTestCaseIndex === null && (
                                  <div className="text-center text-muted" style={{ marginTop: "50px" }}>
                                    Click on a test case to view details
                    </div>
                                )}
                              </div>
                            </div>
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
      
      {/* ===== CSS ANIMATIONS FOR HEALTH INDICATOR ===== */}
      {/* <style>
        {`
          @keyframes pulse-green-small {
            0% {
              transform: scale(1);
              opacity: 1;
              box-shadow: 0 0 4px rgba(16, 185, 129, 0.6);
            }
            50% {
              transform: scale(1.2);
              opacity: 0.8;
              box-shadow: 0 0 6px rgba(16, 185, 129, 0.8);
            }
            100% {
              transform: scale(1);
              opacity: 1;
              box-shadow: 0 0 4px rgba(16, 185, 129, 0.6);
            }
          }
          
          @keyframes pulse-red-small {
            0% {
              transform: scale(1);
              opacity: 1;
              box-shadow: 0 0 4px rgba(239, 68, 68, 0.6);
            }
            50% {
              transform: scale(1.2);
              opacity: 0.8;
              box-shadow: 0 0 6px rgba(239, 68, 68, 0.8);
            }
            100% {
              transform: scale(1);
              opacity: 1;
              box-shadow: 0 0 4px rgba(239, 68, 68, 0.6);
            }
          }
        `}
      </style> */}
      
      {/* ===== PLACEHOLDER STYLING ===== */}
      <style>
        {`
            .ace_comment.ace_placeholder {
            margin: 0px 0px 0px 5px !important;
            padding: 0 !important;
          }
        `}
      </style>
    </div>
  );
};

export default PyEditor;