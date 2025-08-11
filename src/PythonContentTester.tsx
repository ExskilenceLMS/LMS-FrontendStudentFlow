import React, { useState, useEffect } from "react";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/theme-dreamweaver";
import { Spinner } from "react-bootstrap";

/**
 * Interface for Example data structure
 */
interface Example {
  Example: {
    Inputs: string[];
    Output: string;
    Explanation: string;
  };
}

/**
 * Interface for TestCase data structure
 */
interface TestCase {
  Testcase: {
    Value: string[];
    Output: string;
  } | string[];
}

/**
 * Interface for Question data structure
 */
interface Question {
  Qn_name: string;
  entered_ans: string;
  score: string;
  status: boolean;
  Qn: string;
  Ans: string;
  Name: string;
  QNty: string;
  QnTe: string;
  QnTy: string;
  Tags: string[];
  test: any[];
  Hints: any[];
  Level: string;
  Table: string;
  Examples: Example[];
  Template: string;
  ConceptID: string;
  CreatedBy: string;
  CreatedON: string;
  TestCases: TestCase[];
  LastUpdated: string;
  MultiSelect: string;
  Explanations: any[];
  FunctionCall: string;
  QuestionType: string;
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

/**
 * Python Content Tester Component
 * Standalone page for testing Python coding questions without login
 */
const PythonContentTester: React.FC = () => {
  // ===== STATE MANAGEMENT =====
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [pythonCode, setPythonCode] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [processing, setProcessing] = useState<boolean>(false);
  const [runResponseTestCases, setRunResponseTestCases] = useState<any[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [additionalMessage, setAdditionalMessage] = useState<string>("");
  const [backendHealthy, setBackendHealthy] = useState<boolean>(false);
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'submitting' | 'executing' | 'completed' | 'error'>('idle');
  const [hasUserInteracted, setHasUserInteracted] = useState<boolean>(false);  // Track user interaction

  // ===== API CONFIGURATION =====
  
  // Use the new unauthenticated API endpoint
  const API_BASE_URL = `${process.env.REACT_APP_BACKEND_URL}api/student/python-coding/`;

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
      setBackendHealthy(false);
    }
  };

  /**
   * Starts periodic health checks every 10 seconds
   */
  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Submits code to FastAPI backend for execution
   */
  const submitCodeToBackend = async (code: string, testCases: any[], timeout: number = 15, questionId: string = "q123", testId: string ="practice"): Promise<string> => {
    // Transform test cases to match the expected API format
    const transformedTestCases = testCases.map(testCase => {
      if (Array.isArray(testCase.Testcase)) {
        // If Testcase is already an array, keep it as is (for keyword validation)
        return {
          Testcase: testCase.Testcase
        };
      } else if (testCase.Testcase && testCase.Testcase.Value) {
        // If Testcase is an object with Value property, use it directly
        return {
          Testcase: {
            Value: testCase.Testcase.Value,
            Output: testCase.Testcase.Output
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
      FunctionCall: "",
      language: "python",
      timeout: timeout,
      memory_limit: timeout === 10 ? "100m" : "200m",
      user_id: "25SABCXIS019", // Updated to match the expected format
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

  /**
   * Processes test cases to handle mixed format (array and object formats)
   */
  const processTestCases = (testCases: TestCase[]) => {
    return testCases.map(testCase => {
      if (Array.isArray(testCase.Testcase)) {
        // If Testcase is already an array, return as is
        return testCase;
      } else if (testCase.Testcase && testCase.Testcase.Value) {
        // If Testcase is an object with Value property, return as is
        return testCase;
      } else {
        // If Testcase is an object, convert to array format
        return {
          Testcase: testCase.Testcase.Value || []
        };
      }
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
    if (pythonCode && pythonCode.trim() !== "") {
      return pythonCode;
    }
    
    // If user has interacted and cleared the editor, return empty
    if (hasUserInteracted && pythonCode === "") {
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
   */
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(API_BASE_URL);
        const data = await response.json();
        
        // Process the questions and handle mixed test case formats
        const questionsWithProcessedTestCases = data.questions.map((q: Question) => {
          const processedTestCases = processTestCases(q.TestCases);
          return { ...q, TestCases: processedTestCases };
        });
        
        setQuestions(questionsWithProcessedTestCases);
        
        // Set initial question with empty editor
        if (questionsWithProcessedTestCases.length > 0) {
          setPythonCode('');
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching questions:", error);
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  // ===== CODE EDITOR HANDLERS =====
  
  /**
   * Handles code changes in the AceEditor
   */
  const handleCodeChange = (newCode: string) => {
    setPythonCode(newCode);
    setHasUserInteracted(true); // Mark user interaction
  };

  /**
   * Handles switching between different questions
   */
  const handleQuestionChange = (index: number) => {
    setCurrentQuestionIndex(index);
    setPythonCode(''); // Start with empty editor for testing
    setOutput('');
    setRunResponseTestCases([]);
    setSuccessMessage('');
    setAdditionalMessage('');
    setHasUserInteracted(false); // Reset interaction state for new question
  };

  // ===== FASTAPI CODE EXECUTION =====
  
  /**
   * Code execution with test cases (RUN CODE button)
   */
  const handleRunCode = async () => {
    if (!pythonCode.trim()) {
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

      const submissionId = await submitCodeToBackend(pythonCode, testCases, 10, currentQuestion.Qn_name, "practice");
      setExecutionStatus('executing');

      const result = await pollExecutionStatus(submissionId, 15);
      
      if (result.result.success) {
        setOutput(result.result.actual_output);
        
        if (Array.isArray(result.result.parsed_results)) {
          const testCaseResults = result.result.parsed_results.map((testCase, index) => ({
            [`TestCase${index + 1}`]: testCase.passed ? "Passed" : "Failed"
          }));
          
          const allPassed = result.result.parsed_results.every((testCase: any) => testCase.passed);
          const finalResult = { Result: allPassed ? "Passed" : "Failed" };
          
          setRunResponseTestCases([...testCaseResults, finalResult]);
          
          if (allPassed) {
            setSuccessMessage("✅ All Test Cases Passed!");
            setAdditionalMessage("The code is working correctly for this question.");
          } else {
            setSuccessMessage("❌ Some Test Cases Failed");
            setAdditionalMessage("The code needs to be fixed to pass all test cases.");
          }
        }
      } else {
        const parsedResults = result.result.parsed_results;
        const errorMessage = Array.isArray(parsedResults) 
          ? 'Unknown error' 
          : parsedResults?.error || 'Unknown error';
        setOutput(`Error: ${errorMessage}`);
        setSuccessMessage('❌ Execution Failed');
      }
      
      setExecutionStatus('completed');
    } catch (error) {
      console.error('Code execution with tests failed:', error);
      setOutput(`Error: ${error instanceof Error ? error.message : 'Execution failed'}`);
      setSuccessMessage('❌ Execution Failed');
      setExecutionStatus('error');
    } finally {
      setProcessing(false);
    }
  };

  // ===== RENDERING =====

  if (loading) {
    return (
      <div className="container-fluid d-flex justify-content-center align-items-center" style={{ height: "100vh", backgroundColor: "#f2eeee" }}>
        <div className="text-center">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3">Loading Python questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0" style={{ height: '100vh', overflowX: "hidden", backgroundColor: "#f2eeee" }}>
      <div className="p-0 my-0" style={{ backgroundColor: "#F2EEEE", marginRight: '10px' }}>
        <div className="container-fluid p-0 pt-2" style={{ maxWidth: "100%", overflowX: "hidden", overflowY: "auto", backgroundColor: "#f2eeee" }}>
          <div className="row g-2">
            <div className="col-12">
              <div className="" style={{ height: "100vh", overflow: "hidden", padding: '0px 0px 65px 0px' }}>
                <div className="d-flex" style={{ height: '100%', width: '100%' }}>
                  
                  {/* ===== QUESTION NAVIGATION PANEL ===== */}
                  <div className="col-1 lg-8 pb-3" style={{ width: "70px", display: "flex", flexDirection: "column", paddingRight: "15px", overflow: "auto" }}>
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
                    <div className="bg-white" style={{ height: "100%", backgroundColor: "#E5E5E533", overflow: "auto" }}>
                      <div className="p-3 flex-grow-1 overflow-auto">
                        <h6 className="mb-3" style={{ color: "#333", fontWeight: "bold" }}>
                          Question {currentQuestionIndex + 1} of {questions.length}
                          <span style={{ color: "#666", fontSize: "14px", fontWeight: "normal", marginLeft: "10px" }}>
                            (ID: {questions[currentQuestionIndex]?.Qn_name})
                          </span>
                        </h6>
                        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{questions[currentQuestionIndex]?.Qn}</pre>
                        
                        {/* ===== MANDATORY KEYWORDS SECTION ===== */}
                        {(() => {
                          const currentQuestion = questions[currentQuestionIndex];
                          const mandatoryKeywords = extractMandatoryKeywords(currentQuestion?.TestCases || []);
                          
                          if (mandatoryKeywords.length > 0) {
                            return (
                              <div className="mt-4">
                                <h6 style={{ color: "#333", fontWeight: "bold", marginBottom: "10px" }}>Use keywords:</h6>
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
                                
                                {example.Example.Inputs && example.Example.Inputs.length > 0 && (
                                  <div className="mb-2">
                                    <span style={{ color: "#6c757d", fontWeight: "500" }}>Input: </span>
                                    <span style={{ color: "#212529" }}>
                                      {example.Example.Inputs.join(", ")}
                                    </span>
                                  </div>
                                )}
                                
                                {example.Example.Output && (
                                  <div className="mb-2">
                                    <span style={{ color: "#6c757d", fontWeight: "500" }}>Output: </span>
                                    <span style={{ color: "#212529" }}>
                                      {example.Example.Output}
                                    </span>
                                  </div>
                                )}
                                
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
                        placeholder={questions[currentQuestionIndex]?.Template || questions[currentQuestionIndex]?.FunctionCall ? "" : `Write your Code here.

Instructions :
1. Don't use input() function. 
2. It is mandatory to use the exact variable names provided in the question or example [variable names are case-sensitive ]

`}
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
                            onClick={handleRunCode}
                            disabled={processing || !pythonCode.trim() || !backendHealthy}
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
                        </div>
                      </div>
                    </div>

                    {/* ===== OUTPUT AND TEST RESULTS PANEL ===== */}
                    <div className="bg-white me-3" style={{ height: "48%", backgroundColor: "#E5E5E533", position: "relative" }}>
                      <div className="p-3 overflow-auto" style={{ height: "calc(100% - 10px)" }}>
                        {/* ===== CODE EXECUTION OUTPUT ===== */}
                        <div style={{ maxHeight: "70%", overflow: "auto" }}>
                          {output && (
                            <>
                              <h6 style={{ 
                                color: "#333", 
                                fontWeight: "bold", 
                                marginBottom: "10px", 
                                fontSize: "14px",
                                position: "sticky",
                                top: "0",
                                zIndex: 1,
                                backgroundColor: "#fff",
                                padding: "5px 0"
                              }}>Output:</h6>
                              <pre
                                className="m-0"
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
                                  maxHeight: "calc(70% - 40px)",
                                  overflow: "auto"
                                }}
                              >
                                {output}
                              </pre>
                            </>
                          )}
                        </div>
                        
                        {/* ===== TEST CASE RESULTS ===== */}
                        {runResponseTestCases && runResponseTestCases.length > 0 && (
                          <div className="mt-3">
                            <h6 style={{ 
                              color: "#333", 
                              fontWeight: "bold", 
                              marginBottom: "10px", 
                              fontSize: "14px",
                              position: "sticky",
                              top: "0",
                              zIndex: 1,
                              backgroundColor: "#fff",
                              padding: "5px 0"
                            }}>Test Cases:</h6>
                            <div className="d-flex flex-wrap" style={{ gap: "20px" }}>
                              {runResponseTestCases.map((testCase, index) => (
                                <div
                                  key={index}
                                  className="d-flex align-items-center border border-light shadow bg-white p-2 rounded-2"
                                  style={{ 
                                    fontSize: "12px",
                                    minWidth: "fit-content",
                                    flex: "0 0 auto"
                                  }}
                                >
                                  <div className="d-flex align-items-center me-2">
                                    <span className="me-1">{Object.keys(testCase)[0]}:</span>
                                    <span style={{ color: Object.values(testCase)[0] === "Passed" ? "blue" : Object.values(testCase)[0] === "True" ? "blue" : "red" }}>
                                      {Object.values(testCase)[0] === "Passed" ? "✓" : "✗"}
                                    </span>
                                  </div>
                                </div>
                              ))}
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
      
      {/* ===== PLACEHOLDER STYLING ===== */}
      <style>
        {`
          .ace_comment.ace_placeholder {
            margin: 0 !important;
            padding: 0 !important;
          }
        `}
      </style>
    </div>
  );
};

export default PythonContentTester; 