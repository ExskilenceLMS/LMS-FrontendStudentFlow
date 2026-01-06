import React, { useState, useEffect, useRef } from "react";
import AceEditor from "react-ace";
import { getApiClient } from "../utils/apiAuth";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/theme-dreamweaver";
import { secretKey } from "../constants";
import { SUBJECT_ROADMAP } from "../constants/constants";
import CryptoJS from "crypto-js";
import { autoSaveCode, autoSaveAfterSubmission, getAutoSavedCode } from "../utils/autoSaveUtils";
import { getProjectId } from "../utils/projectStorageUtils";

interface Example {
  Example: {
    Inputs: string[];
    Output: string;
    Explanation: string;
  };
}

interface TestCase {
  Testcase: {
    Value: string[];
    Output: string;
  } | string[];
}

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
  topic_id?: string;
  subject_id?: string;
  currentFile?: string;
  subtopic_id?: string;
  Last_Updated_by?: string;
  level?: string;
  Query?: string;
  question_id?: string;
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

interface PythonEditorComponentProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  onNext: () => void;
  onQuestionChange: (index: number) => void;
}

const PythonEditorComponent: React.FC<PythonEditorComponentProps> = ({
  question,
  questionIndex,
  totalQuestions,
  onNext,
  onQuestionChange,
}) => {
  // Get student ID
  const encryptedStudentId = sessionStorage.getItem('StudentId');
  const decryptedStudentId = CryptoJS.AES.decrypt(encryptedStudentId!, secretKey).toString(CryptoJS.enc.Utf8);
  const studentId = decryptedStudentId;

  // Check if we're in project context
  const projectId = getProjectId("projectId");
  const isProjectContext = !!projectId && window.location.pathname.includes('/coding-challenges-editor/');
  const isTestingContext = window.location.pathname.includes('/testing/coding/');

  // Get subject data (for non-project context)
  const encryptedSubjectId = sessionStorage.getItem('SubjectId');
  const decryptedSubjectId = encryptedSubjectId ? CryptoJS.AES.decrypt(encryptedSubjectId, secretKey).toString(CryptoJS.enc.Utf8) : "";
  const subjectId = decryptedSubjectId;

  const encryptedSubject = sessionStorage.getItem('Subject');
  const decryptedSubject = encryptedSubject ? CryptoJS.AES.decrypt(encryptedSubject, secretKey).toString(CryptoJS.enc.Utf8) : "";
  const subject = decryptedSubject;

  const encryptedWeekNumber = sessionStorage.getItem('WeekNumber');
  const decryptedWeekNumber = encryptedWeekNumber ? CryptoJS.AES.decrypt(encryptedWeekNumber, secretKey).toString(CryptoJS.enc.Utf8) : "";
  const weekNumber = decryptedWeekNumber;

  const encryptedDayNumber = sessionStorage.getItem('DayNumber');
  const decryptedDayNumber = encryptedDayNumber ? CryptoJS.AES.decrypt(encryptedDayNumber, secretKey).toString(CryptoJS.enc.Utf8) : "";
  const dayNumber = decryptedDayNumber;

  // UI state management
  const [Ans, setAns] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [isWaitingForInput, setIsWaitingForInput] = useState<boolean>(false);
  const [currentInput, setCurrentInput] = useState<string>("");
  const inputResolver = useRef<((value: string) => void) | null>(null);
  const outputRef = useRef<HTMLPreElement>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState<boolean>(false);

  // Test case and validation state
  const [runResponseTestCases, setRunResponseTestCases] = useState<any[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [additionalMessage, setAdditionalMessage] = useState<string>("");
  const [processing, setProcessing] = useState<boolean>(false);
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<'output' | 'testcases'>('output');

  // Question state
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [status, setStatus] = useState<boolean>(false);
  const [enteredAns, setEnteredAns] = useState<string>("");
  const [isNextBtn, setIsNextBtn] = useState<boolean>(false);
  const [testCases, setTestCases] = useState<TestCase[]>([]);

  // FastAPI state
  const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(null);
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'submitting' | 'executing' | 'completed' | 'error'>('idle');
  const [questionResponses, setQuestionResponses] = useState<{[key: string]: any}>({});
  const [lastRunCode, setLastRunCode] = useState<{[key: string]: string}>({});

  const encryptData = (data: string) => {
    return CryptoJS.AES.encrypt(data, secretKey).toString();
  };

  const decryptData = (encryptedData: string) => {
    const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  };

  const getUserCodeKey = (qnName: string) => {
    if (isProjectContext) {
      return `project_userCode_${qnName}`;
    }
    return `userCode_${subject}_${weekNumber}_${dayNumber}_${qnName}`;
  };

  const processTestCases = (testCases: TestCase[]) => {
    return testCases.map(testCase => testCase);
  };

  const extractMandatoryKeywords = (testCases: TestCase[]) => {
    if (!testCases || testCases.length === 0) return [];
    const firstTestCase = testCases[0];
    if (!firstTestCase || !firstTestCase.Testcase) return [];
    const testCaseValue = Array.isArray(firstTestCase.Testcase) 
      ? firstTestCase.Testcase 
      : firstTestCase.Testcase.Value;
    if (!Array.isArray(testCaseValue)) return [];
    return testCaseValue.filter(keyword => !keyword.includes('def'));
  };

  // Initialize question data when question changes
  useEffect(() => {
    if (question) {
      // Reset UI state first (before any early returns)
      setRunResponseTestCases([]);
      setSuccessMessage("");
      setAdditionalMessage("");
      setSelectedTestCaseIndex(null);
      setActiveSection('output');
      setOutput('');
      setHasUserInteracted(false);
      setIsNextBtn(false);
      setProcessing(false);
      setExecutionStatus('idle');

      const processedTestCases = processTestCases(question.TestCases || []);
      setTestCases(processedTestCases);
      setStatus(question.status || false);

      // Check submission status
      const submitStatusKey = isProjectContext
        ? `project_submitStatus_${question.Qn_name}`
        : `submitStatus_${studentId}_${subject}_${weekNumber}_${dayNumber}_${question.Qn_name}`;
      const encryptedSubmitStatus = sessionStorage.getItem(submitStatusKey);
      const isSubmittedStatus = encryptedSubmitStatus ? decryptData(encryptedSubmitStatus) === 'true' : false;
      setIsSubmitted(isSubmittedStatus || question.status);

      // Load saved code
      const questionKey = getUserCodeKey(question.Qn_name);
      const savedCode = sessionStorage.getItem(questionKey);
     if(isTestingContext) {
      const codeToSet = question.FunctionCall 
        ? question.Ans + "\n\n" + question.FunctionCall 
        : question.Ans || '';
      setEnteredAns(codeToSet);
      setAns(codeToSet);
      return;
     }
      if (savedCode !== null) {
        setEnteredAns(savedCode);
        setAns(savedCode);
      } else if (!question.status && !isTestingContext) {
        // Try to get auto-saved code from backend (only for non-project context and non-testing mode)
        if (!isProjectContext) {
          getAutoSavedCode(question.Qn_name, studentId, SUBJECT_ROADMAP.PRACTICE, process.env.REACT_APP_BACKEND_URL!)
            .then(autoSavedCode => {
              if (autoSavedCode) {
                setEnteredAns(autoSavedCode);
                setAns(autoSavedCode);
                sessionStorage.setItem(questionKey, autoSavedCode);
              } else {
                // In practice mode, use entered_ans or Template as fallback
                let codeToSet = question.entered_ans || question.Template || '';
                if (question.FunctionCall && codeToSet) {
                  codeToSet = codeToSet + "\n\n" + question.FunctionCall;
                }
                setEnteredAns(codeToSet);
                setAns(codeToSet);
              }
            })
            .catch(() => {
              // In practice mode, use entered_ans or Template as fallback
              let codeToSet = question.entered_ans || question.Template || '';
              if (question.FunctionCall && codeToSet) {
                codeToSet = codeToSet + "\n\n" + question.FunctionCall;
              }
              setEnteredAns(codeToSet);
              setAns(codeToSet);
            });
        }
      } else {
          let codeToSet = question.entered_ans || question.Template || '';
          if (question.FunctionCall && codeToSet) {
            codeToSet = codeToSet + "\n\n" + question.FunctionCall;
          }
          setEnteredAns(codeToSet);
          setAns(codeToSet);
      }
    }
  }, [question.Qn_name, question?.question_id, questionIndex]);

  const generateEditorValue = () => {
    const template = question?.Template || "";
    const functionCall = question?.FunctionCall || "";
    
    if (Ans && Ans.trim() !== "") {
      return Ans;
    }
    
    if (hasUserInteracted && Ans === "") {
      return "";
    }
    
    if (template) {
      if (functionCall) {
        return template + '\n\n\n\n\n' + functionCall;
      }
      return template;
    }
    
    return "";
  };

  const submitCodeToBackend = async (code: string, testCases: any[], timeout: number = 15, questionId: string = "q123", testId: string = "practice"): Promise<string> => {
    const transformedTestCases = testCases.map((testCase, index) => {
      if (index === 0 && Array.isArray(testCase.Testcase)) {
        return { Testcase: testCase.Testcase };
      } else if (testCase.Testcase && testCase.Testcase.Value) {
        return {
          Testcase: {
            Value: testCase.Testcase.Value,
            Output: testCase.Testcase.Output
          }
        };
      } else if (Array.isArray(testCase.Testcase)) {
        return {
          Testcase: {
            Value: testCase.Testcase,
            Output: "validation_check"
          }
        };
      } else {
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
      FunctionCall: question.FunctionCall || '',
      language: "python",
      timeout: timeout,
      memory_limit: timeout === 10 ? "100m" : "200m",
      user_id: studentId,
      question_id: questionId,
      test_id: testId
    };

    const response = await getApiClient().post(`${process.env.REACT_APP_PYEXE_BASE_URL}api/v1/submit`, payload);
    const data: FastAPISubmitResponse = response.data;
    return data.submission_id;
  };

  const pollExecutionStatus = async (submissionId: string, maxWaitTime: number = 30): Promise<FastAPIStatusResponse> => {
    const startTime = Date.now();
    const pollInterval = 1000;

    while (Date.now() - startTime < maxWaitTime * 1000) {
      try {
        const response = await getApiClient().post(`${process.env.REACT_APP_PYEXE_BASE_URL}api/v1/execute/${submissionId}`, {});
        const data: FastAPIStatusResponse = response.data;
        
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

  const handleCodeChange = (newCode: string) => {
    setAns(newCode);
    setHasUserInteracted(true);
    
    if (question?.Qn_name) {
      const codeKey = getUserCodeKey(question.Qn_name);
      sessionStorage.setItem(codeKey, newCode);
    }
  };

  const editorRef = useRef<any>(null);

  const onEditorLoad = (editor: any) => {
    editorRef.current = editor;
    
    const session = editor.getSession();
    
    // Create a completely new undo manager to ensure no history from previous questions
    const UndoManager = (window as any).ace.require("ace/undomanager").UndoManager;
    const newUndoManager = new UndoManager();
    
    // Set merge delay to 0 for character-by-character undo
    if (typeof newUndoManager.setMergeDelay === 'function') {
      newUndoManager.setMergeDelay(0);
    }
    
    // Set merge interval property if available
    if ('mergeInterval' in newUndoManager) {
      newUndoManager.mergeInterval = 0;
    }
    
    // Replace the session's undo manager with the new one
    session.setUndoManager(newUndoManager);
  };

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
      const submissionId = await submitCodeToBackend(Ans, testCases, 10, question.Qn_name, "practice");
      setCurrentSubmissionId(submissionId);
      setExecutionStatus('executing');

      const result = await pollExecutionStatus(submissionId, 15);
      
      // Auto-save on run (only in practice mode, not in testing or project context)
      if (!status) {
        if (isProjectContext) {
          // For project context, save to session storage only
          const codeKey = getUserCodeKey(question.Qn_name);
          sessionStorage.setItem(codeKey, Ans);
        } else if (!isTestingContext) {
          // Auto-save in practice mode when code runs and not submitted
          autoSaveCode(Ans, question.Qn_name, studentId, SUBJECT_ROADMAP.PRACTICE, process.env.REACT_APP_BACKEND_URL!)
        }
      }

      if (result.result.success) {
        setOutput(result.result.actual_output);
        
        const questionKey = `coding_${question.Qn_name}`;
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
        const errorMessage = result.result.error;
        setOutput(`Error: ${errorMessage}`);
        setSuccessMessage('Execution failed');
        
        let errorTestCases: any[] = [];
        if (question && question.TestCases && question.TestCases.length > 0) {
          errorTestCases = question.TestCases.map((_, index) => ({
            id: `TestCase${index + 1}`,
            passed: false,
            output: "Error occurred during execution"
          }));
          
          errorTestCases.push({
            id: "Result",
            passed: false,
            output: "Failed due to execution error"
          });
        }
        
        setRunResponseTestCases(errorTestCases);
        
        const questionKey = `coding_${question.Qn_name}`;
        const errorResponseData = {
          ...result,
          runResponseTestCases: errorTestCases,
          output: `Error: ${errorMessage}`,
          successMessage: "Execution failed",
          additionalMessage: "Code has compilation or runtime errors"
        };
        
        storeFastApiResponse(questionKey, errorResponseData);
        
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
      
      let errorTestCases: any[] = [];
      if (question && question.TestCases && question.TestCases.length > 0) {
        errorTestCases = question.TestCases.map((_, index) => ({
          id: `TestCase${index + 1}`,
          passed: false,
          output: "Error occurred during execution"
        }));
        
        errorTestCases.push({
          id: "Result",
          passed: false,
          output: "Failed due to execution error"
        });
      }
      
      setRunResponseTestCases(errorTestCases);
      
      const questionKey = `coding_${question.Qn_name}`;
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
      
      setLastRunCode(prev => ({
        ...prev,
        [questionKey]: Ans
      }));
    } finally {
      setProcessing(false);
    }
  };

  const canSubmitCode = () => {
    if (!question?.Qn_name) {
      return false;
    }
    
    const questionKey = `coding_${question.Qn_name}`;
    const storedResponse = getStoredFastApiResponse(questionKey);
    if (!storedResponse) {
      return false;
    }
    
    const lastRunCodeForQuestion = lastRunCode[questionKey];
    if (!lastRunCodeForQuestion) {
      return false;
    }
    
    const currentCode = Ans.trim().replace(/\n/g, " ").replace(/;$/, "");
    const lastRunCodeTrimmed = lastRunCodeForQuestion.trim().replace(/\n/g, " ").replace(/;$/, "");
    
    return currentCode === lastRunCodeTrimmed;
  };

  const handleSubmit = async () => {
    setIsSubmitted(true);
    setProcessing(true);

    try {
      let submissionTestCases: Array<{[key: string]: string}> = [];

      if (runResponseTestCases.length > 0) {
        submissionTestCases = runResponseTestCases.map((testCase, index) => {
          if (testCase.id === "Result") {
            return { "Result": testCase.passed ? "True" : "False" };
          } else {
            return { [`TestCase${index + 1}`]: testCase.passed ? "Passed" : "Failed" };
          }
        });
      } else {
        if (question && question.TestCases && question.TestCases.length > 0) {
          const failedTestCases = question.TestCases.map((_, index) => ({
            [`TestCase${index + 1}`]: "Failed"
          }));
          const finalResult = { "Result": "False" };
          submissionTestCases = [...failedTestCases, finalResult];
        }
      }

      if (isProjectContext) {
        // Project-specific submission
        const url = `${process.env.REACT_APP_BACKEND_URL}api/student/project/coding/`;
        const projectId = getProjectId("projectId");
        const phaseId = getProjectId("phaseId");
        const partId = getProjectId("partId");
        const taskId = getProjectId("taskId");
        
        const postData = {
          student_id: studentId,
          question_id: question.Qn_name,
          answer: Ans,
          batch_id: decryptData(sessionStorage.getItem("BatchId") || ""),
          result_data: submissionTestCases,
          project_id: projectId,
          final_score: "0/0",
          phase_id: phaseId,
          part_id: partId,
          task_id: taskId
        };

        const response = await getApiClient().put(url, postData);
        const responseData = response.data;

        setStatus(true);

        const codeKey = getUserCodeKey(question.Qn_name);
        sessionStorage.setItem(codeKey, Ans);

        const submitStatusKey = `project_submitStatus_${question.Qn_name}`;
        sessionStorage.setItem(submitStatusKey, encryptData("true"));
      } else {
        // Practice coding submission
        const url = `${process.env.REACT_APP_BACKEND_URL}api/student/coding/`;
        const courseId = sessionStorage.getItem('CourseId') ? CryptoJS.AES.decrypt(sessionStorage.getItem('CourseId')!, secretKey).toString(CryptoJS.enc.Utf8) : "";
        
        const postData = {
          student_id: studentId,
          week_number: weekNumber,
          day_number: dayNumber,
          subject: subject,
          subject_id: subjectId,
          Qn: question.Qn_name,
          Ans: Ans,
          CallFunction: question.FunctionCall || "",
          Result: submissionTestCases,
          Attempt: 0,
          final_score: "0/0",
          course_id: courseId,
          batch_id: decryptData(sessionStorage.getItem("BatchId") || "")
        };

        const response = await getApiClient().put(url, postData);
        const responseData = response.data;

        setStatus(true);

        const codeKey = getUserCodeKey(question.Qn_name);
        sessionStorage.setItem(codeKey, Ans);

        const submitStatusKey = `submitStatus_${studentId}_${subject}_${weekNumber}_${dayNumber}_${question.Qn_name}`;
        sessionStorage.setItem(submitStatusKey, encryptData("true"));

        // Trigger auto-save after successful submission
        if (!isProjectContext && !isTestingContext) {
          autoSaveAfterSubmission(Ans, question.Qn_name, studentId, SUBJECT_ROADMAP.PRACTICE, process.env.REACT_APP_BACKEND_URL!);
        }
      }

      setIsNextBtn(true);
    } catch (innerError: any) {
      setSuccessMessage("Error");
      setAdditionalMessage("There was an error submitting the code.");
      console.error("Error submitting code:", innerError);
    } finally {
      setProcessing(false);
    }
  };

  const storeFastApiResponse = (questionKey: string, response: any) => {
    setQuestionResponses(prev => ({
      ...prev,
      [questionKey]: response
    }));
  };

  const getStoredFastApiResponse = (questionKey: string) => {
    return questionResponses[questionKey] || null;
  };

  const mandatoryKeywords = extractMandatoryKeywords(question?.TestCases || []);

  return (
    <div className="d-flex" style={{ height: '100%', width: '100%', gap: '0' }}>
      {/* Problem Statement Panel */}
      <div className="bg-white" style={{ width: "40%", flexShrink: 0, height: "100%", display: "flex", flexDirection: "column", marginRight: "10px" }}>
        <div className="bg-white" style={{ height: "100%", backgroundColor: "#E5E5E533", overflow: "auto" }}>
          <div className="p-3 flex-grow-1 overflow-auto">
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{question?.Qn}</pre>
            
            {/* Mandatory Keywords Section */}
            {mandatoryKeywords.length > 0 && (
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
            )}
            
            {/* Examples Section */}
            {question?.Examples && question.Examples.length > 0 && (
              <div className="mt-4">
                <h6 style={{ color: "#333", fontWeight: "bold", marginBottom: "10px" }}>Examples:</h6>
                {question.Examples.map((example, index) => (
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

      {/* Code Editor and Controls Panel */}
      <div style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Code Editor */}
        <div className="bg-white" style={{ height: "45%", backgroundColor: "#E5E5E533" }}>
          <AceEditor
            key={`editor-${questionIndex}-${question?.Qn_name}`}
            mode="python"
            theme="dreamweaver"
            onChange={handleCodeChange}
            onLoad={onEditorLoad}
            value={generateEditorValue()}
            fontSize={14}
            showPrintMargin={false}
            wrapEnabled={true}
            className="pe-3"
            style={{ width: "95%", height: "calc(100% - 20px)", marginTop: "20px", margin: '15px' }}
            editorProps={{ $blockScrolling: true }}
            setOptions={{
              enableBasicAutocompletion: false,
              enableLiveAutocompletion: false,
              enableSnippets: false,
            }}
            placeholder={question?.Template || question?.FunctionCall ? "" : `Instructions :
1. Don't use input() function. 
2. It is mandatory to use the exact variable names provided in the question or example [variable names are case-sensitive ]


Write your Code here.`}
          />
        </div>

        {/* Processing Status and Action Buttons */}
        <div style={{ height: "6%", backgroundColor: "#E5E5E533" }} className="d-flex flex-column justify-content-center processingDiv">
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
              <button
                className="btn btn-sm btn-light me-2 processingDivButton"
                style={{
                  whiteSpace: "nowrap",
                  fontSize: "12px",
                  minWidth: "70px",
                  boxShadow: "#888 1px 2px 5px 0px",
                  height: "30px",
                }}
                onClick={handleRunCode}
                disabled={processing || !Ans.trim()}
              >
                RUN CODE
              </button>
              
              {!isTestingContext && (
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
              )}
              
              {!isTestingContext && (isSubmitted || status) &&
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
                  NEXT
                </button>
              }
            </div>
          </div>
        </div>

        {/* Output and Test Results Panel */}
        <div className="bg-white" style={{ height: "48%", backgroundColor: "#E5E5E533", position: "relative" }}>
          <div className="p-3" style={{ height: "calc(100% - 10px)", display: "flex", flexDirection: "column" }}>
            {/* Section Tabs */}
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

            {/* Code Execution Output */}
            {activeSection === 'output' && (
              <div style={{ flex: 1, maxHeight: "90%", overflow: "auto" }}>
                {output && (
                  <pre
                    className="m-0"
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
                )}
              </div>
            )}
            
            {/* Test Case Results */}
            {activeSection === 'testcases' && runResponseTestCases && runResponseTestCases.length > 0 && (
              (() => {
                const questionKey = `coding_${question.Qn_name}`;
                const fastApiResponse = getStoredFastApiResponse(questionKey);

                if (fastApiResponse?.result?.success === true) {
                  return (
                    <div style={{ flex: 1, maxHeight: "90%", overflow: "auto" }}>
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
                                backgroundColor: selectedTestCaseIndex === index ? '#f2f2f0' : '#f8f9fa',
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
                        
                        {/* Right Column - Test Case Details (80%) */}
                        <div className="px-5 pt-1 pb-3" style={{ width: "80%", overflowY: "auto" }}>
                          {selectedTestCaseIndex !== null && runResponseTestCases[selectedTestCaseIndex] && (
                            <div>
                              <div className="mb-3">
                                <strong>Status: </strong>
                                <span className={runResponseTestCases[selectedTestCaseIndex].passed ? "text-success" : "text-danger"}>
                                  {runResponseTestCases[selectedTestCaseIndex].passed ? "Passed" : "Failed"}
                                </span>
                              </div>
                              
                              {selectedTestCaseIndex === 0 ? (
                                <>
                                  <div className="mb-3">
                                    <strong>Type: </strong>
                                    <span className="text-info">Keyword Validation</span>
                                  </div>
                                  
                                  <div className="mb-3">
                                    <div className="mt-1 p-2 bg-light rounded" style={{ fontSize: "11px", fontFamily: "monospace" }}>
                                      {(() => {
                                        const response = getStoredFastApiResponse(`coding_${question.Qn_name}`);
                                        if (response?.result?.parsed_results?.[selectedTestCaseIndex] && response.result.parsed_results[selectedTestCaseIndex].result !== undefined && response.result.parsed_results[selectedTestCaseIndex].result !== null) {
                                          const value = response.result.parsed_results[selectedTestCaseIndex].result;
                                          if (Array.isArray(value)) {
                                            return `[${value.join(', ')}]`;
                                          } else {
                                            const stringValue = String(value);
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
                                  <div className="mb-3">
                                    <strong>Input:</strong>
                                    <div className="mt-1 p-2 bg-light rounded" style={{ fontSize: "11px", fontFamily: "monospace" }}>
                                      {(() => {
                                        const testCaseData = question?.TestCases?.[selectedTestCaseIndex];
                                        if (testCaseData?.Testcase && typeof testCaseData.Testcase === 'object' && 'Value' in testCaseData.Testcase && testCaseData.Testcase.Value !== undefined && testCaseData.Testcase.Value !== null) {
                                          const value = testCaseData.Testcase.Value;
                                          if (Array.isArray(value)) {
                                            return value.map((item: any, index: number) => {
                                              const itemString = String(item);
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
                                            const stringValue = String(value);
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
                                  
                                  <div className="mb-3">
                                    <strong>Expected Output:</strong>
                                    <div className="mt-1 p-2 bg-light rounded" style={{ fontSize: "11px", fontFamily: "monospace" }}>
                                      {(() => {
                                        const testCaseData = question?.TestCases?.[selectedTestCaseIndex];
                                        if (testCaseData?.Testcase && typeof testCaseData.Testcase === 'object' && 'Output' in testCaseData.Testcase && testCaseData.Testcase.Output !== undefined && testCaseData.Testcase.Output !== null) {
                                          const value = testCaseData.Testcase.Output;
                                          if (Array.isArray(value)) {
                                            return value.map((item: any, index: number) => {
                                              const itemString = String(item);
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
                                            const stringValue = String(value);
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
                                        return "No expected output";
                                      })()}
                                    </div>
                                  </div>
                                  
                                  <div className="mb-3">
                                    <strong>Actual Output:</strong>
                                    <div className="mt-1 p-2 bg-light rounded" style={{ fontSize: "11px", fontFamily: "monospace" }}>
                                      {(() => {
                                        const response = getStoredFastApiResponse(`coding_${question.Qn_name}`);
                                        if (response?.result?.parsed_results?.[selectedTestCaseIndex] && response.result.parsed_results[selectedTestCaseIndex].result !== undefined && response.result.parsed_results[selectedTestCaseIndex].result !== null) {
                                          const value = response.result.parsed_results[selectedTestCaseIndex].result;
                                          if (Array.isArray(value)) {
                                            return `[${value.join(', ')}]`;
                                          } else {
                                            const stringValue = String(value);
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
                              ) : null}
                              
                              {runResponseTestCases[selectedTestCaseIndex]?.id !== "Result" && selectedTestCaseIndex !== 0 && (
                                <div className="mt-3">
                                  <strong>Execution Time: </strong>
                                  <span className="text-muted">
                                    {(() => {
                                      const response = getStoredFastApiResponse(`coding_${question.Qn_name}`);
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
                          
                          {selectedTestCaseIndex === null && (
                            <div className="text-center text-muted" style={{ marginTop: "50px" }}>
                              Click on a test case to view details
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PythonEditorComponent;

