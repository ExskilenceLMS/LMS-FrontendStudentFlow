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
interface FastAPIHealthResponse {
  status: string;
  timestamp: string;
  version: string;
  redis_connected: boolean;
  docker_available: boolean;
  queue_length: number;
}

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
  
  // Test case and validation state
  const [runResponseTestCases, setRunResponseTestCases] = useState<any[]>([]);  // Test case results
  const [successMessage, setSuccessMessage] = useState<string>("");   // Success/error messages
  const [additionalMessage, setAdditionalMessage] = useState<string>("");  // Additional info messages
  const [processing, setProcessing] = useState<boolean>(false);       // Processing state during execution
  
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
  
  const [backendHealthy, setBackendHealthy] = useState<boolean>(false);  // Backend health status
  const [healthCheckInterval, setHealthCheckInterval] = useState<NodeJS.Timeout | null>(null);  // Health check interval
  const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(null);  // Current submission ID
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'submitting' | 'executing' | 'completed' | 'error'>('idle');  // Execution status
  
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
  const checkBackendHealth = async () => {
    try {
      const response = await fetch('http://localhost:8002/health');
      const data: FastAPIHealthResponse = await response.json();
      setBackendHealthy(data.status === 'healthy');
    } catch (error) {
      console.error('Backend health check failed:', error);
      setBackendHealthy(false);
    }
  };

  /**
   * Starts periodic health checks every 10 seconds
   */
  useEffect(() => {
    // Initial health check
    checkBackendHealth();
    
    // Set up periodic health checks every 10 seconds
    const interval = setInterval(checkBackendHealth, 10000);
    setHealthCheckInterval(interval);
    
    // Cleanup on unmount
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  /**
   * Submits code to FastAPI backend for execution
   * @param code - The Python code to execute
   * @param testCases - Optional test cases to validate against
   * @param timeout - Execution timeout in seconds
   * @param questionId - Question identifier
   * @param testId - Test identifier
   * @returns Submission ID from the backend
   */
  const submitCodeToBackend = async (code: string, testCases?: any[], timeout: number = 15, questionId: string = "q123", testId: string ="pc123"): Promise<string> => {
    const payload = {
      code: code,
      question_id: questionId,
      test_id: testId,
      test_cases: testCases || [],
      language: "python",
      timeout: timeout,
      memory_limit: timeout === 10 ? "100m" : "200m",
      user_id: timeout === 10 ? "test_user_123" : "test_user_456" // HARDCODED: Will be replaced with real user ID later
    };

    const response = await fetch('http://localhost:8002/api/v1/submit', {
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
        const response = await fetch(`http://localhost:8002/api/v1/status/${submissionId}`);
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
    return testCases.map((testCase, index) => {
      if (Array.isArray(testCase.Testcase)) {
        // Convert array format (validation test) to object format for consistency
        return {
          Testcase: {
            Value: testCase.Testcase,
            Output: "validation_check"
          }
        };
      }
      return testCase; // Already in correct object format
    });
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
   * Simple code execution without test cases (RUN button)
   * Executes code and shows output only
   */
  const handleRunSimple = async () => {
    if (!Ans.trim()) {
      return;
    }

    setProcessing(true);
    setExecutionStatus('submitting');
    setOutput('');
    setSuccessMessage('');
    setAdditionalMessage('');
    setRunResponseTestCases([]);

    try {
      // HARDCODED: Simple execution payload - will be replaced with real data later
      const testCases = [
        {
          type: "output_check",
          code: "",
          expected: "Hello, World!"
        }
      ];

      const submissionId = await submitCodeToBackend(Ans, testCases, 10, "q123", "pc123");
      setCurrentSubmissionId(submissionId);
      setExecutionStatus('executing');

      // Poll for completion
      const result = await pollExecutionStatus(submissionId, 10);
      
             if (result.result.success) {
         setOutput(result.result.actual_output);
         setSuccessMessage('Code executed successfully');
       } else {
         // Handle error from parsed_results
         const parsedResults = result.result.parsed_results;
         const errorMessage = Array.isArray(parsedResults) 
           ? 'Unknown error' 
           : parsedResults?.error || 'Unknown error';
         setOutput(`Error: ${errorMessage}`);
         setSuccessMessage('Execution failed');
       }
      
      setExecutionStatus('completed');
    } catch (error) {
      console.error('Simple execution failed:', error);
      setOutput(`Error: ${error instanceof Error ? error.message : 'Execution failed'}`);
      setSuccessMessage('Execution failed');
      setExecutionStatus('error');
    } finally {
      setProcessing(false);
    }
  };

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

    try {
      // HARDCODED: Test cases payload - will be replaced with real data later
      const testCases = [
        {
          type: "function_call",
          code: "calculate_factorial(5)",
          expected: 120,
          description: "Test factorial of 5"
        },
        {
          type: "function_call",
          code: "calculate_factorial(0)",
          expected: 1,
          description: "Test factorial of 0"
        }
        // ,
        // {
        //   type: "output_check",
        //   code: "",
        //   expected: "Factorial of 5 is: 120"
        // }
      ];

      const submissionId = await submitCodeToBackend(Ans, testCases, 15, "q123", "pc123");
      setCurrentSubmissionId(submissionId);
      setExecutionStatus('executing');

      // Poll for completion
      const result = await pollExecutionStatus(submissionId, 15);
      
      if (result.result.success) {
        setOutput(result.result.actual_output);
        
        // Process test case results
        if (Array.isArray(result.result.parsed_results)) {
          const testCaseResults = result.result.parsed_results.map((testCase, index) => ({
            [`TestCase${index + 1}`]: testCase.passed ? "Passed" : "Failed"
          }));
          
          const allPassed = result.result.parsed_results.every((testCase: any) => testCase.passed);
          const finalResult = { Result: allPassed ? "Passed" : "Failed" };
          
          setRunResponseTestCases([...testCaseResults, finalResult]);
          
          if (allPassed) {
            setSuccessMessage("Congratulations!");
            setAdditionalMessage("You have passed all the test cases. Click the submit code button.");
          } else {
            setSuccessMessage("Wrong Answer");
            setAdditionalMessage("You have not passed all the test cases.");
          }
        }
             } else {
         // Handle error from parsed_results
         const parsedResults = result.result.parsed_results;
         const errorMessage = Array.isArray(parsedResults) 
           ? 'Unknown error' 
           : parsedResults?.error || 'Unknown error';
         setOutput(`Error: ${errorMessage}`);
         setSuccessMessage('Execution failed');
       }
      
      setExecutionStatus('completed');
    } catch (error) {
      console.error('Code execution with tests failed:', error);
      setOutput(`Error: ${error instanceof Error ? error.message : 'Execution failed'}`);
      setSuccessMessage('Execution failed');
      setExecutionStatus('error');
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
    navigate('/subject-roadmap');
  } else {
    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIndex);

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
    setIsSubmitted(false);
  }
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

    const postData = {
      student_id: studentId,
      week_number: weekNumber,
      day_number: dayNumber,
      subject: subject,
      subject_id: subjectId,
      Qn: questions[currentQuestionIndex].Qn_name,
      Ans: Ans,
      CallFunction: "",
      Result: runResponseTestCases,
      Attempt: 0,
      final_score: "0/0",
      course_id: courseId
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
                  <div className="col-1 lg-8" style={{ width: "70px", display: "flex", flexDirection: "column", paddingRight: "15px" }}>
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
                    <div className="bg-white" style={{ height: "100%", backgroundColor: "#E5E5E533" }}>
                      <div className="p-3 flex-grow-1 overflow-auto">
                        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{questions[currentQuestionIndex]?.Qn}</pre>
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
                        value={Ans || enteredAns}
                        fontSize={14}
                        showPrintMargin={false}
                        wrapEnabled={true}
                        className="pe-3"
                        style={{ width: "95%", height: "calc(100% - 60px)", marginTop: "20px", margin: '15px' }}
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
                          {/* Run Button (Simple execution) */}
                          <button
                            className="btn btn-sm btn-light me-2 processingDivButton"
                            style={{
                              whiteSpace: "nowrap",
                              fontSize: "12px",
                              minWidth: "70px",
                              boxShadow: "#888 1px 2px 5px 0px",
                              height: "30px"
                            }}
                            onClick={handleRunSimple}
                            disabled={processing || !Ans.trim() || !backendHealthy}
                          >
                            RUN
                          </button>
                          
                          {/* Run Code Button (With test cases) */}
                          <button
                            className="btn btn-sm btn-light me-2 processingDivButton"
                            style={{
                              whiteSpace: "nowrap",
                              fontSize: "12px",
                              minWidth: "70px",
                              boxShadow: "#888 1px 2px 5px 0px",
                              height: "30px"
                            }}
                            onClick={handleRunCode}
                            disabled={processing || !Ans.trim() || !backendHealthy}
                          >
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
                            disabled={isSubmitted || processing || status }
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
                      {/* ===== HEALTH STATUS INDICATOR ===== */}
                      <div 
                        style={{
                          position: "absolute",
                          top: "10px",
                          right: "10px",
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          backgroundColor: backendHealthy ? "#42FF58" : "#FF4242",
                          animation: backendHealthy ? "blink-green 2s infinite" : "blink-red 2s infinite",
                          zIndex: 1000
                        }}
                      />
                      
                      <div className="p-3 overflow-auto" style={{ height: "calc(100% - 10px)" }}>
                        {/* ===== CODE EXECUTION OUTPUT ===== */}
                        {output ? (
                          <pre
                            className="m-0 "
                            id="output"
                            ref={outputRef}
                            tabIndex={0}
                            onKeyDown={handleKeyPress}
                            style={{ 
                              outline: 'none',
                              width: '100%',
                              color: 'black',
                              border: '1px solid white',
                              boxShadow: 'rgba(0, 0, 0, 0.25) 0px 4px 4px',
                              padding: '10px',
                              whiteSpace: 'pre-wrap',
                              overflowWrap: 'break-word',
                              backgroundColor: 'rgb(255, 255, 255)',
                              minHeight: '1em',
                             }}
                          >
                            {output}
                          </pre>
                        ): (
                          <p style={{ fontSize: "12px" }}></p>
                        )}
                        
                        {/* ===== TEST CASE RESULTS ===== */}
                        {runResponseTestCases && (
                          <div className="col mt-3">
                            {runResponseTestCases.map((testCase, index) => (
                              <div
                                key={index}
                                className="d-flex align-items-center mb-2 border border-ligth shadow bg-white p-2 rounded-2"
                                style={{ width: "fit-content", fontSize: "12px" }}
                              >
                                <span className="me-2">{Object.keys(testCase)[0]}:</span>
                                <span style={{ color: Object.values(testCase)[0] === "Passed" ? "blue" : Object.values(testCase)[0] === "True" ? "blue" : "red" }}>
                                  {Object.values(testCase)[0] as React.ReactNode}
                                </span>
                              </div>
                            ))}
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
      <style>
        {`
          @keyframes blink-green {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0.3; }
          }
          @keyframes blink-red {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0.3; }
          }
        `}
      </style>
    </div>
  );
};

export default PyEditor;