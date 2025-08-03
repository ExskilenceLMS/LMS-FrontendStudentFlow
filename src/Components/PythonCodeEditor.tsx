import React, { useState, useEffect, useRef } from "react";
import AceEditor from "react-ace";
import { getApiClient } from "../utils/apiAuth";
import { useLocation, useNavigate } from "react-router-dom";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/theme-dreamweaver";
import { secretKey } from "../constants";
import CryptoJS from "crypto-js";
import { updateIndexParameter } from '../utils/urlUtils';
import '../SQLEditor.css';

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

interface PythonCodeEditorProps {
  questionData: any;
  currentQuestionIndex: number;
  onQuestionChange: (subject: 'py' | 'sq') => void;
  onNext: () => void;
  showNextButton: boolean;
  nextButtonText: string;
  onQuestionSubmitted: (questionName: string) => void;
}

const PythonCodeEditor: React.FC<PythonCodeEditorProps> = ({
  questionData,
  currentQuestionIndex,
  onQuestionChange,
  onNext,
  showNextButton,
  nextButtonText,
  onQuestionSubmitted
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  // ===== STATE MANAGEMENT =====
  
  // Questions and navigation state
  const [questions, setQuestions] = useState<Question[]>([]);
  // Remove local currentQuestionIndex state since it's now passed as prop
  
  // UI state management
  const [loading, setLoading] = useState<boolean>(true);
  const [output, setOutput] = useState<string>("");
  const [isWaitingForInput, setIsWaitingForInput] = useState<boolean>(false);
  const [currentInput, setCurrentInput] = useState<string>("");
  const inputResolver = useRef<((value: string) => void) | null>(null);
  const outputRef = useRef<HTMLPreElement>(null);
  
  // Test case and validation state
  const [runResponseTestCases, setRunResponseTestCases] = useState<any[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [additionalMessage, setAdditionalMessage] = useState<string>("");
  const [processing, setProcessing] = useState<boolean>(false);
  
  // Question navigation and progress state
  const [functionCall, setFunctionCall] = useState<string>("");
  const [template, setTemplate] = useState<string>();
  const [status, setStatus] = useState<boolean>(false);
  const [enteredAns, setEnteredAns] = useState<string>("");
  const [isNextBtn, setIsNextBtn] = useState<boolean>(false);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [Ans, setAns] = useState<string>("");
  
  // ===== FASTAPI BACKEND STATE =====
  
  const [backendHealthy, setBackendHealthy] = useState<boolean>(false);
  const [healthCheckInterval, setHealthCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(null);
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'submitting' | 'executing' | 'completed' | 'error'>('idle');
  
  // ===== SESSION STORAGE DATA EXTRACTION =====
  
  // Decrypt student data from session storage
  const getSessionData = (key: string): string => {
    const encryptedValue = sessionStorage.getItem(key);
    if (!encryptedValue) {
      console.error(`Missing session storage data: ${key}`);
      return '';
    }
    try {
      return CryptoJS.AES.decrypt(encryptedValue, secretKey).toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error(`Error decrypting session storage data for ${key}:`, error);
      return '';
    }
  };

  const studentId = getSessionData('StudentId');
  const testId = getSessionData('TestId');
  
  // ===== FASTAPI RESPONSE STORAGE (Same as TestSQLCoding) =====
  
  const [questionResponses, setQuestionResponses] = useState<{[key: string]: any}>({});
  const [lastRunCode, setLastRunCode] = useState<{[key: string]: string}>({});
  
  // ===== UTILITY FUNCTIONS =====
  
  /**
   * Encrypts data using AES encryption for secure storage
   */
  const encryptData = (data: string) => {
    return CryptoJS.AES.encrypt(data, secretKey).toString();
  };

  /**
   * Decrypts data using AES decryption
   */
  const decryptData = (encryptedData: string) => {
    const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  };

  /**
   * Generates a unique key for storing user code in session storage
   * Uses same pattern as TestSQLCoding
   */
  const getUserCodeKey = (qnName: string) => {
    return `userCode_${qnName}`;
  };

  /**
   * Store both code and question data together (encrypted like TestSQLCoding)
   */
  const storeQuestionData = (qnName: string, code: string, questionData: any) => {
    const key = getUserCodeKey(qnName);
    const data = {
      code: code,
      entered_ans: code,
      status: questionData.status || false,
      score: questionData.score || ""
    };
    const encryptedData = encryptData(JSON.stringify(data));
    sessionStorage.setItem(key, encryptedData);
    console.log("PythonCodeEditor: Stored data for", qnName, "Key:", key, "Data:", data);
  };

  /**
   * Load question data from code storage (decrypted like TestSQLCoding)
   */
  const loadQuestionData = (qnName: string) => {
    const key = getUserCodeKey(qnName);
    const encryptedData = sessionStorage.getItem(key);
    console.log("PythonCodeEditor: Loading data for", qnName, "Key:", key, "Has data:", !!encryptedData);
    
    if (!encryptedData) {
      console.log("PythonCodeEditor: No saved data found for", qnName);
      return {
        code: "",
        entered_ans: "",
        status: false,
        score: ""
      };
    }
    try {
      const decryptedData = decryptData(encryptedData);
      const parsedData = JSON.parse(decryptedData);
      console.log("PythonCodeEditor: Successfully loaded data for", qnName, ":", parsedData);
      return parsedData;
    } catch (error) {
      console.error("Error decrypting question data:", error);
      return {
        code: "",
        entered_ans: "",
        status: false,
        score: ""
      };
    }
  };

  /**
   * Store FastAPI response per question (same as TestSQLCoding)
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

  /**
   * Get question status from session storage (same as TestSQLCoding)
   */
  const getQuestionStatusFromSession = () => {
    const sessionKey = `${testId}_questionStatus`;
    const sessionStatus = sessionStorage.getItem(sessionKey);
    
    if (sessionStatus) {
      try {
        const decryptedStatuses = CryptoJS.AES.decrypt(sessionStatus, secretKey).toString(CryptoJS.enc.Utf8);
        return JSON.parse(decryptedStatuses);
      } catch (error) {
        console.error("Error decrypting session status:", error);
        return {};
      }
    }
    return {};
  };

  /**
   * Processes test cases to handle mixed format (array and object formats)
   */
  const processTestCases = (testCases: TestCase[]) => {
    return testCases.map((testCase, index) => {
      if (Array.isArray(testCase.Testcase)) {
        return {
          Testcase: {
            Value: testCase.Testcase,
            Output: "validation_check"
          }
        };
      }
      return testCase;
    });
  };

  /**
   * Transform TestSection data to PyEditor format
   */
  const transformTestSectionData = (testSectionQuestion: any) => {
    const qnName = testSectionQuestion.Qn_name;
    console.log("PythonCodeEditor: Transforming question:", qnName);
    
    // Handle nested question_data structure like SQL editor
    const questionData = testSectionQuestion.question_data || testSectionQuestion;
    console.log("PythonCodeEditor: Question data structure:", questionData);
    
    return {
      Qn_name: testSectionQuestion.Qn_name,
      Qn: questionData.Qn || testSectionQuestion.Qn,
      Ans: questionData.Ans || "",
      Examples: questionData.Examples || [],
      TestCases: questionData.TestCases || [],
      entered_ans: testSectionQuestion.entered_ans || "",  // Use original entered_ans, not saved code
      status: false,  // Will be updated later from session storage
      score: "",
      Name: questionData.Name || "",
      QNty: questionData.QNty || questionData.Qnty || "",
      QnTe: questionData.QnTe || questionData.Qnte || "",
      QnTy: questionData.QnTy || "",
      Tags: questionData.Tags || [],
      test: questionData.test || [],
      Hints: questionData.Hints || [],
      Level: questionData.Level || "",
      Table: questionData.Table || "",
      Template: questionData.Template || "",
      ConceptID: questionData.ConceptID || "",
      CreatedBy: questionData.CreatedBy || "",
      CreatedON: questionData.CreatedON || questionData.CreatedOn || "",
      LastUpdated: questionData.LastUpdated || "",
      MultiSelect: questionData.MultiSelect || "",
      Explanations: questionData.Explanations || questionData.Expl || [],
      FunctionCall: questionData.FunctionCall || "",
      QuestionType: questionData.QuestionType || ""
    };
  };

  /**
   * Generate result array from FastAPI response
   */
  const generateResultArray = (fastApiResponse: any) => {
    const result = [];
    
    // Extract parsed_results from FastAPI response
    const parsedResults = fastApiResponse.result.parsed_results;
    
    // Generate TestCase entries
    parsedResults.forEach((testCase: any, index: number) => {
      result.push({
        [`TestCase${index + 1}`]: testCase.passed ? "Passed" : "Failed"
      });
    });
    
    // Add final Result entry
    const allPassed = parsedResults.every((testCase: any) => testCase.passed);
    result.push({
      "Result": allPassed ? "True" : "False"
    });
    
    return result;
  };

  // ===== FASTAPI BACKEND INTEGRATION =====
  
  /**
   * Checks the health status of the FastAPI backend
   */
  const checkBackendHealth = async () => {
    try {
      const response = await fetch('https://pyexe.exskilence.com/health');
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
    checkBackendHealth();
    
    const interval = setInterval(checkBackendHealth, 10000);
    setHealthCheckInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  /**
   * Submits code to FastAPI backend for execution
   */
  const submitCodeToBackend = async (code: string, testCases: any[], timeout: number = 15, questionId: string = "q123", testId: string ="practice"): Promise<string> => {
    const payload = {
      code: code,
      TestCases: testCases,
      FunctionCall: "",
      language: "python",
      timeout: timeout,
      memory_limit: timeout === 10 ? "100m" : "200m",
      user_id: studentId,
      question_id: questionId,
      test_id: testId
    };

    const response = await fetch('https://pyexe.exskilence.com/api/v1/submit', {
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
   */
  const pollExecutionStatus = async (submissionId: string, maxWaitTime: number = 30): Promise<FastAPIStatusResponse> => {
    const startTime = Date.now();
    const pollInterval = 1000;

    while (Date.now() - startTime < maxWaitTime * 1000) {
      try {
        const response = await fetch(`https://pyexe.exskilence.com/api/v1/status/${submissionId}`);
        const data: FastAPIStatusResponse = await response.json();
        
        if (data.status === 'completed') {
          return data;
        }
        
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        console.error('Error polling execution status:', error);
        throw error;
      }
    }
    
    throw new Error(`Execution timeout after ${maxWaitTime} seconds`);
  };

  // ===== DATA INITIALIZATION =====
  
  useEffect(() => {
    if (questionData && questionData.qns_data && questionData.qns_data.coding) {
      try {
        // Transform TestSection data to PyEditor format
        console.log("PythonCodeEditor: Processing coding questions:", questionData.qns_data.coding.length);
        const transformedQuestions = questionData.qns_data.coding.map((q: any) => {
          const transformed = transformTestSectionData(q);
          console.log("PythonCodeEditor: Transformed question:", transformed.Qn_name, "Subject:", transformed.Qn_name.substring(1, 3));
          return transformed;
        });
        
        // Load question statuses from session storage
        const statuses = getQuestionStatusFromSession();
        
        // Update question statuses based on session storage
        const updatedQuestions = transformedQuestions.map((q: any) => {
          const statusKey = `coding_${q.Qn_name}`;
          const sessionStatus = statuses[statusKey];
          return {
            ...q,
            status: sessionStatus === "Submitted" || q.status
          };
        });
        
        setQuestions(updatedQuestions);

        // Set initial question index from session storage or default to 0
        const savedIndex = sessionStorage.getItem("codingCurrentQuestionIndex");
        const initialIndex = savedIndex ? parseInt(savedIndex, 10) : 0;
        
        // Load initial question data
        const initialQuestion = updatedQuestions[initialIndex];
        setStatus(initialQuestion.status);
        
        // Load saved code for initial question (same logic as question changes)
        const savedData = loadQuestionData(initialQuestion.Qn_name);
        const savedCode = savedData.code || initialQuestion.entered_ans || '';
        
        setEnteredAns(savedCode);
        setFunctionCall(initialQuestion.FunctionCall || '');
        setAns(savedCode);
        
        // Process test cases
        const processedTestCases = processTestCases(initialQuestion.TestCases || []);
        setTestCases(processedTestCases);
        
        setLoading(false);
        setRunResponseTestCases([]);

      } catch (error) {
        console.error("Error processing coding questions:", error);
        setLoading(false);
      }
    }
  }, [questionData]);

  // ===== HANDLE QUESTION INDEX CHANGES =====
  
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex >= 0 && currentQuestionIndex < questions.length) {
      const currentQuestion = questions[currentQuestionIndex];
      console.log("PythonCodeEditor: Question index changed to:", currentQuestionIndex, "Question:", currentQuestion.Qn_name);
      
      if (currentQuestion) {
        setStatus(currentQuestion.status);
        
        // Load saved code for new question (same logic as TestSQLCoding)
        const savedData = loadQuestionData(currentQuestion.Qn_name);
        const savedCode = savedData.code || currentQuestion.entered_ans || '';
        
        setEnteredAns(savedCode);
        setAns(savedCode);
        setFunctionCall(currentQuestion.FunctionCall || '');
        
        console.log("PythonCodeEditor: Loaded code for question:", currentQuestion.Qn_name, "Code:", savedCode);
        
        // Process test cases for the new question
        const processedTestCases = processTestCases(currentQuestion.TestCases || []);
        setTestCases(processedTestCases);
        
        // Restore previous run response if available (like SQL editor)
        const questionKey = `coding_${currentQuestion.Qn_name}`;
        const storedResponse = getStoredFastApiResponse(questionKey);
        console.log("PythonCodeEditor: Stored response for", questionKey, ":", storedResponse);
        
        if (storedResponse) {
          setRunResponseTestCases(storedResponse.runResponseTestCases || []);
          setOutput(storedResponse.output || '');
          setSuccessMessage(storedResponse.successMessage || '');
          setAdditionalMessage(storedResponse.additionalMessage || '');
        } else {
          // Clear previous results if no stored response
          setRunResponseTestCases([]);
          setOutput('');
          setSuccessMessage('');
          setAdditionalMessage('');
        }
        

      }
    }
  }, [currentQuestionIndex, questions]);

  // ===== SAVE CURRENT CODE WHEN IT CHANGES =====
  
  useEffect(() => {
    // Save current code to session storage when Ans changes
    if (questions[currentQuestionIndex]?.Qn_name && Ans) {
      const questionData = {
        status: questions[currentQuestionIndex].status,
        score: questions[currentQuestionIndex].score
      };
      console.log("PythonCodeEditor: Auto-saving code for question:", questions[currentQuestionIndex].Qn_name);
      storeQuestionData(questions[currentQuestionIndex].Qn_name, Ans, questionData);
    } else if (questions[currentQuestionIndex]?.Qn_name && Ans === "") {
      // Explicitly clear session storage if Ans becomes empty for a question
      const key = getUserCodeKey(questions[currentQuestionIndex].Qn_name);
      sessionStorage.removeItem(key);
      console.log("PythonCodeEditor: Cleared session storage for empty code:", questions[currentQuestionIndex].Qn_name);
    }
  }, [Ans]); // Only depend on Ans, not currentQuestionIndex

  // ===== CODE EDITOR HANDLERS =====
  
  /**
   * Handles code changes in the AceEditor
   */
  const handleCodeChange = (newCode: string) => {
    setAns(newCode);
    
    // Save code to session storage for current question
    if (questions[currentQuestionIndex]?.Qn_name) {
      const questionData = {
        status: questions[currentQuestionIndex].status,
        score: questions[currentQuestionIndex].score
      };
      if (newCode) {
        console.log("PythonCodeEditor: Saving code for question:", questions[currentQuestionIndex].Qn_name);
        storeQuestionData(questions[currentQuestionIndex].Qn_name, newCode, questionData);
      } else {
        // If newCode is empty, remove from session storage
        const key = getUserCodeKey(questions[currentQuestionIndex].Qn_name);
        sessionStorage.removeItem(key);
        console.log("PythonCodeEditor: Cleared session storage for empty code:", questions[currentQuestionIndex].Qn_name);
      }
    }
  };

  /**
   * Handles keyboard input for interactive Python programs
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
      const currentQuestion = questions[currentQuestionIndex];
      const testCases = currentQuestion?.TestCases || [];

      const submissionId = await submitCodeToBackend(Ans, testCases, 10, "q790", "practice");
      setCurrentSubmissionId(submissionId);
      setExecutionStatus('executing');

      const result = await pollExecutionStatus(submissionId, 15);
      
      if (result.result.success) {
        setOutput(result.result.actual_output);
        
        // Store FastAPI response for this question (like SQL editor)
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
            [`TestCase${index + 1}`]: testCase.passed ? "Passed" : "Failed"
          }));
          
          const allPassed = result.result.parsed_results.every((testCase: any) => testCase.passed);
          const finalResult = { Result: allPassed ? "Passed" : "Failed" };
          
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
            [`TestCase${index + 1}`]: testCase.passed ? "Passed" : "Failed"
          }));
          
          const allPassed = result.result.parsed_results.every((testCase: any) => testCase.passed);
          const finalResult = { Result: allPassed ? "Passed" : "Failed" };
          
          setRunResponseTestCases(responseData.runResponseTestCases);
          setSuccessMessage(responseData.successMessage);
          setAdditionalMessage(responseData.additionalMessage);
        }
      } else {
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

  // ===== SUBMIT LOGIC =====
  
  /**
   * Check if submit button should be enabled
   */
  const canSubmitCode = () => {
    const currentQuestionKey = questions[currentQuestionIndex]?.Qn_name;
    if (!currentQuestionKey) {
      return false; // No current question
    }
    
    // Check for stored response using the correct key pattern
    const questionKey = `coding_${currentQuestionKey}`;
    const storedResponse = getStoredFastApiResponse(questionKey);
    if (!storedResponse) {
      return false; // No run response for this question
    }
    
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
   */
  const handleTestSectionPage = () => {
    sessionStorage.setItem("codingCurrentQuestionIndex", currentQuestionIndex.toString());
    
    // Get test data from session storage or location state
    let sectionData = (location.state as any)?.sectionData;
    if (!sectionData) {
      const encryptedTestData = sessionStorage.getItem('testSectionData');
      if (encryptedTestData) {
        try {
          sectionData = JSON.parse(CryptoJS.AES.decrypt(encryptedTestData, secretKey).toString(CryptoJS.enc.Utf8));
        } catch (error) {
          console.error("Error decrypting test data for navigation:", error);
        }
      }
    }
    
    // Navigate back to test section with the same data
    navigate('/test-section', { 
      state: { 
        sectionData: sectionData 
      } 
    });
  };

  const handleSubmit = async () => {
    const currentQuestion = questions[currentQuestionIndex];
    const questionKey = `coding_${currentQuestion.Qn_name}`;
    const fastApiResponse = getStoredFastApiResponse(questionKey);
    
    if (!fastApiResponse) {
      setSuccessMessage("Error");
      setAdditionalMessage("Please run your code before submitting.");
      return;
    }
    
    setProcessing(true);
    
    try {
      // Get course_id from session storage
      const encryptedCourseId = sessionStorage.getItem('CourseId');
      const courseId = encryptedCourseId ? CryptoJS.AES.decrypt(encryptedCourseId, secretKey).toString(CryptoJS.enc.Utf8) : "course19";
      
      // Generate result from FastAPI response
      const result = generateResultArray(fastApiResponse);
      
      const url = `${process.env.REACT_APP_BACKEND_URL}api/student/test/questions/submit/coding/`;
      
      const payload = {
        student_id: studentId,
        test_id: testId,
        question_id: currentQuestion.Qn_name,
        answer: Ans,
        subject_id: decryptData(sessionStorage.getItem("TestSubjectId") || ""),
        TestCases: currentQuestion.TestCases,
        subject: sessionStorage.getItem("TestSubject") || "",
        final_score: "0/0", // Hardcoded
        course_id: courseId,
        result: result,
        batch_id: decryptData(sessionStorage.getItem("BatchId") || "")
      };

      const response = await getApiClient().put(url, payload);
      const responseData = response.data;
      
      if(responseData.message == "Test Already Completed"){
        // Handle test completion
        return;
      }
      
      // Update question status in session storage (same as TestSQLCoding)
      const sessionKey = `${testId}_questionStatus`;
      const sessionStatus = sessionStorage.getItem(sessionKey);
      
      if (sessionStatus) {
        try {
          const decryptedStatuses = CryptoJS.AES.decrypt(sessionStatus, secretKey).toString(CryptoJS.enc.Utf8);
          const statuses = JSON.parse(decryptedStatuses);
          
          // Update the status for this question to "Submitted"
          statuses[`coding_${currentQuestion.Qn_name}`] = "Submitted";
          
          // Re-encrypt and store updated statuses
          const encryptedStatuses = CryptoJS.AES.encrypt(JSON.stringify(statuses), secretKey).toString();
          sessionStorage.setItem(sessionKey, encryptedStatuses);
          
        } catch (error) {
          console.error("Error updating session status:", error);
        }
      }
      
      // Save code to session storage
      const questionData = {
        status: true,
        score: "0/0"
      };
      storeQuestionData(currentQuestion.Qn_name, Ans, questionData);
      
      // Update local question status
      const updatedQuestions = [...questions];
      updatedQuestions[currentQuestionIndex].status = true;
      setQuestions(updatedQuestions);
      
      setIsNextBtn(true);
      onQuestionSubmitted(currentQuestion.Qn_name);
    } catch (error) {
      setSuccessMessage("Error");
      setAdditionalMessage("There was an error submitting the code.");
      console.error("Error submitting code:", error);
    } finally {
      setProcessing(false);
    }
  };

  // ===== RENDERING =====

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "100%" }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex" style={{ height: '100%', width: '100%', maxHeight: '100%' }}>
      
      {/* ===== PROBLEM STATEMENT PANEL ===== */}
      <div className="col-5 lg-8 bg-white" style={{ height: "100%", display: "flex", flexDirection: "column", marginLeft: "-10px", marginRight: "10px", maxHeight: '100%' }}>
        <div className="bg-white" style={{ height: "100%", backgroundColor: "#E5E5E533", overflow: "hidden" }}>
          <div className="p-3" style={{ height: "100%", overflowY: "auto", overflowX: "hidden" }}>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{questions[currentQuestionIndex]?.Qn}</pre>
            
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
      <div className="col-6 lg-8" style={{ height: "100%", display: "flex", flexDirection: "column", width: '55.1%', maxHeight: '100%' }}>
        
        {/* ===== CODE EDITOR ===== */}
        <div className="bg-white me-3" style={{ height: "45%", backgroundColor: "#E5E5E533", padding: "10px" }}>
          <AceEditor
            mode="python"
            theme="dreamweaver"
            onChange={handleCodeChange}
            value={Ans || enteredAns}
            fontSize={14}
            showPrintMargin={false}
            wrapEnabled={true}
            style={{ width: "100%", height: "100%", margin: '0px' }}
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
                disabled={processing || !Ans.trim() || !backendHealthy}
              >
                {/* Health Status Indicator */}
                <div 
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
                />
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
                 disabled={processing || questions[currentQuestionIndex]?.status || !canSubmitCode()}
              >
                 {questions[currentQuestionIndex]?.status ? "SUBMITTED" : "SUBMIT CODE"}
              </button>
              
               {/* Next Button */}
               {showNextButton && (
                <button
                  className="btn btn-sm btn-light processingDivButton"
                  style={{
                    whiteSpace: "nowrap",
                    fontSize: "12px",
                    minWidth: "70px",
                    boxShadow: "#888 1px 2px 5px 0px",
                    height: "30px"
                  }}
                   onClick={nextButtonText === "Test Section" ? handleTestSectionPage : onNext}
                  disabled={processing}
                >
                   {nextButtonText}
                </button>
               )}
            </div>
          </div>
        </div>

        {/* ===== OUTPUT AND TEST RESULTS PANEL ===== */}
        <div className="bg-white me-3" style={{ height: "49%", backgroundColor: "#E5E5E533", position: "relative" }}>
          <div className="p-3" style={{ height: "100%", overflowY: "auto", overflowX: "hidden" }}>
            {/* ===== CODE EXECUTION OUTPUT ===== */}
            {output ? (
              <pre
                className="m-0"
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
      
      {/* ===== CSS ANIMATIONS FOR HEALTH INDICATOR ===== */}
      <style>
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
      </style>
    </div>
  );
};

export default PythonCodeEditor; 