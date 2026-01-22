import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faHourglass, faChevronDown, faCheckCircle, faChevronUp, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { runValidation, getValidationStatus, getValidationResults } from "./utils/validationApi";
// import { ValidationWebSocketClient } from "./utils/validationWebSocket";
import { getApiClient } from "./utils/apiAuth";
import { getProjectId } from "./utils/projectStorageUtils";
import CryptoJS from "crypto-js";
import { secretKey } from "./constants";
import ConfirmationModal from "./Modals/ConfirmationModal";

function ProjectCodingEditor({ containerStatus = null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const questionData = location.state?.questionData;
  const [vscodeUrl, setVscodeUrl] = useState(null);
  const [vscodeLoading, setVscodeLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  
  // Validation state - always run all tasks from JSON files
  const [isRunning, setIsRunning] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [validationOutput, setValidationOutput] = useState<any[]>([]);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [selectedTestCase, setSelectedTestCase] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const outputRef = useRef(null);
  const isMountedRef = useRef(true);
  const iframeRef = useRef(null);
  const readinessPollingRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    const iframe = iframeRef.current;
    return () => {
      isMountedRef.current = false;
      // Cleanup polling intervals
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (readinessPollingRef.current) {
        clearTimeout(readinessPollingRef.current);
        readinessPollingRef.current = null;
      }
      if (iframe) {
        try {
          (iframe as HTMLIFrameElement).src = 'about:blank';
        } catch {
          // Ignore errors during cleanup
        }
      }
    };
  }, []);

  // Auto-scroll validation output
  useEffect(() => {
    if (outputRef.current) {
      (outputRef.current as HTMLDivElement).scrollTop = (outputRef.current as HTMLDivElement).scrollHeight;
    }
  }, [validationOutput]);


  // Poll container readiness and load VS Code only when pod is Ready
  useEffect(() => {
    if ((containerStatus as any)?.success && (containerStatus as any).containerUrl) {
      const containerUrl = (containerStatus as any).containerUrl;
      const containerName = (containerStatus as any).containerName;
      
      // Get student_id from sessionStorage to poll status
      const encryptedStudentId = sessionStorage.getItem("StudentId") || "";
      if (!encryptedStudentId || !containerName) {
        setVscodeUrl(null);
        setVscodeLoading(false);
        return;
      }
      
      const studentId = CryptoJS.AES.decrypt(encryptedStudentId, secretKey).toString(CryptoJS.enc.Utf8);
      
      setVscodeLoading(true);
      setVscodeUrl(null); // Clear URL initially
      setIsPolling(true); // Start polling indicator
      
      // Check container status - stop polling when pod is Running or has IP
      const checkReadiness = async (): Promise<boolean> => {
        // Return true if polling should stop, false if it should continue
        try {
          const apiClient = getApiClient();
          const response = await apiClient.get(
            `${process.env.REACT_APP_BACKEND_URL}api/student/vscode/status/${studentId}`
          );
          
          const data = response.data;
          if (!data) return false; // Continue polling if no data
          
          const shouldLoad = 
            data.is_ready === true ||
            data.pod_status === "Running" ||
            (data.pod_ip && data.pod_ip.trim() !== "");
          
          if (shouldLoad) {
            // Add 5 second delay to allow VS Code server to fully initialize
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            if (isMountedRef.current) {
              setVscodeUrl(containerUrl);
              setIsPolling(false);
            }
            return true;
          }
          
          // Handle error states
          if (data.pod_status === "Failed" || data.pod_status === "Error") {
            setVscodeLoading(false);
            setIsPolling(false);
            console.error("Container failed to start:", data.pod_status);
            return true;
          }
          
          // Pod is still Pending - continue polling
          if (data.pod_status === "Pending") {
          }
          
          return false;
        } catch (error: any) {
          return false;
        }
      };
      
      // Check immediately, then poll with exponential backoff (3s, 5s, 8s intervals)
      let pollCount = 0;
      const scheduleNextPoll = async () => {
        if (!isMountedRef.current) return;
        
        const shouldStop = await checkReadiness();
        if (shouldStop) {
          readinessPollingRef.current = null;
          if (isMountedRef.current) {
            setIsPolling(false); // Stop polling indicator
          }
          return;
        }
        
        pollCount++;
        // Use exponential backoff: 3s, 5s, 8s, then 8s intervals
        const delay = pollCount <= 1 ? 3000 : pollCount <= 2 ? 5000 : 8000;
        readinessPollingRef.current = setTimeout(() => {
          scheduleNextPoll();
        }, delay);
      };
      
      // Start polling
      scheduleNextPoll();
      
      // Timeout after 120 seconds (2 minutes) - give up and try loading anyway
      const timeoutTimer = setTimeout(() => {
        if (isMountedRef.current && !vscodeUrl) {
          console.warn("Container readiness timeout - loading VS Code anyway");
          setVscodeUrl(containerUrl);
          setIsPolling(false); // Stop polling indicator
        }
        if (readinessPollingRef.current) {
          clearTimeout(readinessPollingRef.current);
          readinessPollingRef.current = null;
        }
      }, 120000); // 2 minutes timeout
      
      return () => {
        if (readinessPollingRef.current) {
          clearTimeout(readinessPollingRef.current);
          readinessPollingRef.current = null;
        }
        clearTimeout(timeoutTimer);
      };
    } else {
      setVscodeUrl(null);
      setVscodeLoading(false);
      setIsPolling(false); // Stop polling indicator
      if (readinessPollingRef.current) {
        clearTimeout(readinessPollingRef.current);
        readinessPollingRef.current = null;
      }
    }
  }, [containerStatus]);

  const handleIframeLoad = () => {
    setVscodeLoading(false);
  };

  const addValidationOutput = (message: string, type = 'info') => {
    setValidationOutput(prev => [...prev, { message, type, timestamp: new Date() }]);
  };

  const clearValidationOutput = () => {
    setValidationOutput([]);
    setTestCases([]);
    setSelectedTestCase(null);
    // Stop polling if active
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const handleCollapse = () => {
    setShowTerminal(!showTerminal);
  };


  // Process validation results and extract test cases
  const processValidationResults = (results: any) => {
    
    // Display all test cases from results
    const existingTestIds = new Set(testCases.map(t => t.id || t.name));
    const allTests: any[] = [...testCases]; // Start with existing tests
    
      // Check if this is "all tasks" structure (has tasks array)
      if (results.tasks && Array.isArray(results.tasks)) {
        // Process each task's results
        results.tasks.forEach((taskResult: any, taskIndex: number) => {
          const taskPrefix = taskResult.taskName || taskResult.taskId || `Task ${taskIndex + 1}`;
          
          // Log task structure for debugging
          const taskTestCounts = {
            tests: taskResult.tests?.length || 0,
            pytest: taskResult.pytest?.tests?.length || 0,
            dynamic: taskResult.dynamic?.tests?.length || 0,
            static: taskResult.static?.tests?.length || 0,
            schema: taskResult.schema?.tests?.length || 0
          };
          const totalTaskTests = Object.values(taskTestCounts).reduce((a: number, b: number) => a + b, 0);
          console.log(`Task ${taskIndex + 1} (${taskPrefix}): ${totalTaskTests} test case(s)`, taskTestCounts);
          
          let taskHasTests = false;
        
        // Check for tests array directly in taskResult (flattened structure)
        // This is the aggregated array from ValidationOrchestrator that contains all tests
        if (taskResult.tests && Array.isArray(taskResult.tests) && taskResult.tests.length > 0) {
          taskHasTests = true;
          taskResult.tests.forEach((test: any) => {
            const testId = `${taskPrefix}-${test.id || test.name || ''}`;
            // Only add if not already present (incremental update)
            if (!existingTestIds.has(testId)) {
              allTests.push({
                name: `${test.name}`,
                description: test.description || '',
                passed: test.passed !== undefined ? test.passed : (test.state === 'passed'),
                message: test.message || '',
                error: test.error || test.details || ''
              });
              existingTestIds.add(testId);
            } else {
              // Update existing test if results changed
              const existingIndex = allTests.findIndex(t => t.id === testId);
              if (existingIndex >= 0) {
                allTests[existingIndex] = {
                  ...allTests[existingIndex],
                  passed: test.passed !== undefined ? test.passed : (test.state === 'passed'),
                  message: test.message || allTests[existingIndex].message,
                  error: test.error || test.details || allTests[existingIndex].error
                };
              }
            }
          });
        } else {
          // Only process section-specific arrays if tests array doesn't exist
          // (for backward compatibility with old result format)
          
          // Schema tests
          if (taskResult.schema && taskResult.schema.tests && Array.isArray(taskResult.schema.tests) && taskResult.schema.tests.length > 0) {
            taskHasTests = true;
            taskResult.schema.tests.forEach((test: any) => {
              const testId = `${taskPrefix}-schema-${test.id || test.name || ''}`;
              if (!existingTestIds.has(testId)) {
                allTests.push({
                  name: `${taskPrefix} - ${test.name || 'Schema Test'}`,
                  description: test.description || '',
                  passed: test.passed !== undefined ? test.passed : (test.state === 'passed'),
                  message: test.message || '',
                  error: test.error || test.details || ''
                });
                existingTestIds.add(testId);
              }
            });
          }
          
          // Static tests
          if (taskResult.static && taskResult.static.tests && Array.isArray(taskResult.static.tests) && taskResult.static.tests.length > 0) {
            taskHasTests = true;
            taskResult.static.tests.forEach((test: any) => {
              const testId = `${taskPrefix}-static-${test.id || test.name || ''}`;
              if (!existingTestIds.has(testId)) {
                allTests.push({
                  name: `${test.name}`,
                  description: test.description || '',
                  passed: test.passed !== undefined ? test.passed : (test.state === 'passed'),
                  message: test.message || '',
                  error: test.error || ''
                });
                existingTestIds.add(testId);
              }
            });
          }
          
          // Pytest tests
          if (taskResult.pytest && taskResult.pytest.tests && Array.isArray(taskResult.pytest.tests) && taskResult.pytest.tests.length > 0) {
            taskHasTests = true;
            taskResult.pytest.tests.forEach((test: any) => {
              const testId = `${taskPrefix}-pytest-${test.id || test.name || ''}`;
              if (!existingTestIds.has(testId)) {
                allTests.push({
                  name: `${test.name}`,
                  description: test.description || '',
                  passed: test.passed !== undefined ? test.passed : (test.state === 'passed'),
                  message: test.message || '',
                  error: test.error || ''
                });
                existingTestIds.add(testId);
              } else {
                // Update existing test
                const existingIndex = allTests.findIndex(t => t.id === testId);
                if (existingIndex >= 0) {
                  allTests[existingIndex] = {
                    ...allTests[existingIndex],
                    passed: test.passed !== undefined ? test.passed : (test.state === 'passed'),
                    message: test.message || allTests[existingIndex].message,
                    error: test.error || allTests[existingIndex].error
                  };
                }
              }
            });
          }
          
          // Dynamic/Playwright tests
          if (taskResult.dynamic && taskResult.dynamic.tests && Array.isArray(taskResult.dynamic.tests) && taskResult.dynamic.tests.length > 0) {
            taskHasTests = true;
            taskResult.dynamic.tests.forEach((test: any) => {
              const testId = `${taskPrefix}-dynamic-${test.id || test.name || ''}`;
              if (!existingTestIds.has(testId)) {
                allTests.push({
                  name: `${test.name}`,
                  description: test.description || '',
                  passed: test.passed !== undefined ? test.passed : (test.state === 'passed'),
                  message: test.message || '',
                  error: test.error || ''
                });
                existingTestIds.add(testId);
              } else {
                // Update existing test
                const existingIndex = allTests.findIndex(t => t.id === testId);
                if (existingIndex >= 0) {
                  allTests[existingIndex] = {
                    ...allTests[existingIndex],
                    passed: test.passed !== undefined ? test.passed : (test.state === 'passed'),
                    message: test.message || allTests[existingIndex].message,
                    error: test.error || allTests[existingIndex].error
                  };
                }
              }
            });
          }
        }
        
        // If task has no tests but has errors, create a test case entry for the error
        if (!taskHasTests && taskResult.errors && Array.isArray(taskResult.errors) && taskResult.errors.length > 0) {
          taskResult.errors.forEach((errorMsg: string, errorIndex: number) => {
            allTests.push({
              name: `Validation Error ${errorIndex + 1 > 1 ? `(${errorIndex + 1})` : ''}`,
              description: '',
              passed: false,
              message: '',
              error: errorMsg || 'Validation failed'
            });
          });
        } else if (!taskHasTests && !taskResult.passed) {
          // Task failed but no specific errors - create a generic error entry
          allTests.push({
            name: `Validation Failed`,
            description: '',
            passed: false,
            message: '',
            error: 'Task validation failed. Check validation output for details.'
          });
        }
      });
      
      // If tasks array is empty but there are errors in the root results, show them
      if (results.tasks.length === 0 && results.errors && Array.isArray(results.errors) && results.errors.length > 0) {
        results.errors.forEach((errorMsg: string, errorIndex: number) => {
          allTests.push({
            name: `Validation Error ${errorIndex + 1}`,
            description: '',
            passed: false,
            message: '',
            error: errorMsg || 'Validation failed'
          });
        });
      }
    } else {
      // Single task structure (original format)
      // Check for tests array directly in results (aggregated array from ValidationOrchestrator)
      if (results.tests && Array.isArray(results.tests) && results.tests.length > 0) {
        results.tests.forEach((test: any) => {
          const testId = test.id || test.name || '';
          if (!existingTestIds.has(testId)) {
            allTests.push({
              name: `${test.name}`,
              description: test.description || '',
              passed: test.passed !== undefined ? test.passed : (test.state === 'passed'),
              message: test.message || '',
              error: test.error || test.details || ''
            });
            existingTestIds.add(testId);
          }
        });
      } else {
        // Only process section-specific arrays if tests array doesn't exist
        // (for backward compatibility with old result format)
        if (results.schema && results.schema.tests) {
          results.schema.tests.forEach((test: any) => {
            const testId = test.id || test.name || '';
            if (!existingTestIds.has(testId)) {
              allTests.push({
                name: `${test.name}`,
                description: test.description || '',
                passed: test.passed !== undefined ? test.passed : (test.state === 'passed'),
                message: test.message || '',
                error: test.error || test.details || ''
              });
              existingTestIds.add(testId);
            }
          });
        }
        if (results.static && results.static.tests) {
          results.static.tests.forEach((test: any) => {
            const testId = test.id || test.name || '';
            if (!existingTestIds.has(testId)) {
              allTests.push({
                name: `${test.name}`,
                description: test.description || '',
                passed: test.passed !== undefined ? test.passed : (test.state === 'passed'),
                message: test.message || '',
                error: test.error || ''
              });
              existingTestIds.add(testId);
            }
          });
        }
        if (results.pytest && results.pytest.tests) {
          results.pytest.tests.forEach((test: any) => {
            const testId = test.id || test.name || '';
            if (!existingTestIds.has(testId)) {
              allTests.push({
                name: `${test.name}`,
                description: test.description || '',
                passed: test.passed !== undefined ? test.passed : (test.state === 'passed'),
                message: test.message || '',
                error: test.error || ''
              });
              existingTestIds.add(testId);
            }
          });
        }
        if (results.dynamic && results.dynamic.tests) {
          results.dynamic.tests.forEach((test: any) => {
            const testId = test.id || test.name || '';
            if (!existingTestIds.has(testId)) {
              allTests.push({
                name: `${test.name}`,
                description: test.description || '',
                passed: test.passed !== undefined ? test.passed : (test.state === 'passed'),
                message: test.message || '',
                error: test.error || ''
              });
              existingTestIds.add(testId);
            }
          });
        }
      }
    }
        
    setTestCases(allTests as any[]);
    
    if (allTests.length > 0) {
      setSelectedTestCase(allTests[0]);
    }
  };

  // Polling-based validation status checking (HTTP polling instead of WebSocket)
  const startPollingValidationStatus = (jobId: string) => {
    // Clear any existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    let lastResultsHash: string | null = null; // Track if results changed to avoid unnecessary updates
    
    // Poll every 2 seconds
    pollingIntervalRef.current = setInterval(async () => {
      if (!isMountedRef.current || !jobId) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        return;
      }
      
      try {
        // Check status first
        const statusResponse = await getValidationStatus(jobId);
        
        if (statusResponse && statusResponse.success) {
          const status = statusResponse.status;
          
          // Always try to get results (even if still running) to get partial results
          try {
            const resultsResponse = await getValidationResults(jobId);
            if (resultsResponse && resultsResponse.success && resultsResponse.results) {
              // Create a hash of the results to detect changes
              const resultsHash = JSON.stringify(resultsResponse.results);
              
              // Only update if results changed (to avoid unnecessary re-renders)
              if (resultsHash !== lastResultsHash) {
                lastResultsHash = resultsHash;
                
                // Process results (this will update test cases incrementally)
                processValidationResults(resultsResponse.results);
              }
            }
          } catch (error: any) {
            // If results endpoint returns "still in progress", that's fine
            if (error.response?.status !== 400) {
              console.error('Error fetching validation results:', error);
            }
          }
          
          // If completed or failed, stop polling
          if (status === 'completed' || status === 'failed') {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            
            // Get final results one more time
            try {
              const resultsResponse = await getValidationResults(jobId);
              if (resultsResponse && resultsResponse.success && resultsResponse.results) {
                processValidationResults(resultsResponse.results);
              } else if (status === 'failed' && statusResponse.error) {
                addValidationOutput(`Validation failed: ${statusResponse.error}`, 'error');
              }
            } catch (error: any) {
              console.error('Error fetching final validation results:', error);
            }
            
            setIsRunning(false);
            setShowTerminal(true);
          }
        }
      } catch (error: any) {
        console.error('Error polling validation status:', error);
        // Don't stop polling on error, just log it
        // The job might still be running
      }
    }, 2000); // Poll every 2 seconds
  };

  const handleRunValidation = async () => {
    clearValidationOutput();
    setIsRunning(true);

    try {
      // Get container_id from containerStatus (provision response stores container_id as containerName)
      const containerId = (containerStatus as any)?.containerName || (containerStatus as any)?.containerId || null;
      
      // Always pass null to run all JSON files in testing_config
      const response = await runValidation(null, null, containerId);
      
      if (response && response.success && response.job_id) {
        // Use polling instead of websocket
        startPollingValidationStatus(response.job_id);
      } else {
        const errorMsg = response?.detail?.error || response?.error || 'Failed to start validation';
        throw new Error(errorMsg);
      }
    } catch (error) {
      const errorMsg = (error as any).message || 'Unknown error occurred';
      addValidationOutput(`Error: ${errorMsg}`, 'error');
      setIsRunning(false);
      // Stop polling on error
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;  
      }
    }
  };

  const handleTestCaseClick = (testCase: any) => {
    setSelectedTestCase(testCase);
  };

  const handleMarkAsComplete = async () => {
    try {
      setSubmitting(true);

      const encryptedStudentId = sessionStorage.getItem("StudentId") || "";
      if (!encryptedStudentId) throw new Error("Student ID not found");
      
      const studentId = CryptoJS.AES.decrypt(encryptedStudentId, secretKey).toString(CryptoJS.enc.Utf8);
      
      const encryptedBatchId = sessionStorage.getItem("BatchId") || "";
      if (!encryptedBatchId) throw new Error("Batch ID not found");
      const batchId = CryptoJS.AES.decrypt(encryptedBatchId, secretKey).toString(CryptoJS.enc.Utf8);

      const projectId = getProjectId("projectId") || "";
      const phaseId = getProjectId("phaseId") || "";
      const partId = getProjectId("partId") || "";
      const taskId = getProjectId("taskId") || "";

      if (!projectId || !phaseId || !partId || !taskId) {
        throw new Error("Missing required project IDs");
      }

      let questionId = "";

      // First try to get from direct sessionStorage key
      questionId = sessionStorage.getItem('projectCoding_questionId') || "";

      // If not found, try to get from cached question data
      if (!questionId) {
        const cachedQuestionData = sessionStorage.getItem('projectCoding_questionData');
        if (cachedQuestionData) {
          try {
            const parsedData = JSON.parse(cachedQuestionData);
            if (parsedData.questions?.length) {
              const firstQuestion = parsedData.questions[0];
              questionId = firstQuestion.Qn_name || firstQuestion.question_id || "";
            }
          } catch (e) {
            console.warn("Failed to parse cached question data:", e);
          }
        }
      }

      // Get score from JSON
      const score = questionData?.score || questionData?.questions?.[0]?.score || 0;

      if (!questionId) {
        throw new Error("Question ID not found. Please ensure you have selected a task/subtask.");
      }

      // Format test cases into result_data format
      const resultData = testCases.map((testCase: any, index: number) => ({
        [`TestCase${index + 1}`]: testCase.passed ? "Passed" : "Failed"
      }));
      
      // Add overall result
        const allPassed = testCases.length > 0 && testCases.every((tc: any) => tc.passed);
        resultData.push({ Result: allPassed ? "True" : "False" });

      const payload = {
        student_id: studentId,
        question_id: questionId,
        answer: "",
        batch_id: batchId,
        result_data: resultData,
        project_id: projectId,
        final_score: score,
        phase_id: phaseId,
        part_id: partId,
        task_id: taskId
      };

      // Submit the project coding results
      const response = await getApiClient().put(
        `${process.env.REACT_APP_BACKEND_URL}api/student/project/project_coding/submit/`,
        payload
      );

      // commit and push workspace changes
      const commitPayload = {
        student_id: studentId,
        project_id: projectId,
        question_id: questionId,
        commit_type: "manual",
      };

      await getApiClient().post(
        `${process.env.REACT_APP_BACKEND_URL}api/student/project/workspace/commit/`,
        commitPayload
      );

      setShowCompleteModal(false);
      
      // Check if submission was successful
      if (response.data?.status === true) {
        setIsCompleted(true);
        addValidationOutput("Question marked as complete successfully!", "success");
        // Navigate to project-tasks after a short delay
        setTimeout(() => {
          navigate("/project-tasks", { replace: true });
        }, 1500);
      } else {
        addValidationOutput("Question marked as complete successfully!", "success");
      }
    } catch (error: any) {
      console.error("Error marking question as complete:", error);
      addValidationOutput(`Error: ${error.response?.data?.detail || error.message || "Failed to mark question as complete"}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const getOutputLineClass = (type: string) => {
    switch (type) {
      case 'error': return 'text-danger';
      case 'success': return 'text-success';
      case 'warning': return 'text-warning';
      default: return 'text-info';
    }
  };

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.2);
          }
        }
      `}</style>
      <div className="d-flex flex-column w-100 h-100" style={{ height: '100vh', minHeight: 0, overflow: 'hidden' }}>
      {/* VSCode Container */}
      <div className="position-relative" style={{ flex: '1 1 auto', minHeight: 0, height: showTerminal ? 'calc(50% - 60px)' : 'calc(100% - 60px)' }}>
        {!vscodeUrl ? (
          // Placeholder when container is not created
          <div className="d-flex flex-column justify-content-center align-items-center h-100 bg-light">
            <div className="text-center p-5">
              <div className="mb-4">
                <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
              </div>
              <h4 className="text-muted mb-3">VS Code Editor</h4>
            </div>
          </div>
        ) : (
          <>
            {vscodeLoading && (
              <div className="d-flex flex-column justify-content-center align-items-center h-100 position-absolute top-0 start-0 w-100 bg-white" style={{ zIndex: 10 }}>
                <div className="d-flex align-items-center justify-content-center mb-3">
                  <div className="spinner-grow text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  {isPolling && (
                    <div 
                      className="ms-3"
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: '#0d6efd',
                        animation: 'pulse 1.5s ease-in-out infinite'
                      }}
                    />
                  )}
                </div>
                <div className="text-center">
                  <h5 className="text-muted mb-2">Loading VS Code Editor...</h5>
                  <p className="text-muted small mb-0">
                    {isPolling ? 'Verifying container status...' : 'Please wait while the server initializes'}
                  </p>
                </div>
              </div>
            )}
            {vscodeUrl && (
              <iframe
                ref={iframeRef}
                src={vscodeUrl}
                frameBorder="0"
                className={`w-100 h-100 border-0 ${vscodeLoading ? "d-none" : "d-block"}`}
                onLoad={handleIframeLoad}
                title="VS Code Editor"
              ></iframe>
            )}
          </>
        )}
      </div>

      {/* Run and Submit Buttons */}
      <div className="d-flex justify-content-between gap-2 p-2 border-top bg-light" style={{ flexShrink: 0 }}>
        <button
          className="btn btn-outline-secondary btn-sm"
          style={{ minWidth: '100px' }}
          onClick={handleCollapse}
        >
          <FontAwesomeIcon icon={showTerminal ? faChevronDown : faChevronUp} style={{ marginRight: '4px' }} />
          {showTerminal ? 'Collapse' : 'Expand'}
        </button>
        <div className="d-flex gap-2">
          <button
            id="run-validation-btn"
            className="btn btn-primary btn-sm"
            style={{ minWidth: '100px' }}
            onClick={handleRunValidation}
            disabled={isRunning}
          >
            <FontAwesomeIcon icon={isRunning ? faHourglass : faPlay} style={{ marginRight: '4px' }} />
            {isRunning ? 'Running...' : 'Run'}
          </button>
          <button
            id="mark-complete-btn"
            className="btn btn-success btn-sm"
            style={{ minWidth: '150px' }}
            onClick={() => setShowCompleteModal(true)}
            disabled={submitting || isCompleted}
          >
            <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '4px' }} />
            {isCompleted ? 'Completed' : 'Mark as Complete'}
          </button>
        </div>
      </div>

      {/* Terminal Panel - Below VSCode */}
      {showTerminal && (
        <section 
          className="border-top bg-white d-flex flex-column"
          style={{ 
            height: '50%',
            flexShrink: 0,
            overflow: 'hidden',
            minHeight: 0
          }}
        >
          {/* Show spinner overlay when validation is running */}
          {isRunning ? (
            <div className="d-flex flex-column justify-content-center align-items-center h-100">
              <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted mb-0">Validating...</p>
            </div>
          ) : (
            <>
              {/* Test Cases Sidebar and Main Output Area */}
              <div className="d-flex" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {/* Sidebar: Test Cases List */}
                <div className="border-end bg-light" style={{ width: '250px', overflowY: 'auto' }}>
                  <div className="p-2 border-bottom bg-white">
                    <strong className="small">Test Cases</strong>
                  </div>
                  <div className="list-group list-group-flush">
                    {testCases.map((testCase: any, index: number) => (
                      <button
                        key={index}
                        type="button"
                        className={`list-group-item list-group-item-action text-start border-0 ${selectedTestCase === testCase ? 'active' : ''} ${testCase.passed ? 'list-group-item-success' : 'list-group-item-danger'}` as any}
                        onClick={() => handleTestCaseClick(testCase as any)}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="small">Testcase {index + 1}</span>
                          <span className={`badge ${testCase.passed ? 'bg-success' : 'bg-danger'}` as any}>
                            {testCase.passed ? (
                              <FontAwesomeIcon icon={faCheck} />
                            ) : (
                              <FontAwesomeIcon icon={faXmark} />
                            )}
                          </span>
                        </div>
                      </button>
                    ))}
                    {testCases.length === 0 && (
                      <div className="p-2 text-muted small text-center">
                        <div>No test cases yet</div>
                        <div className="mt-2" style={{ fontSize: '0.75rem' }}>Run validation to look for testcases</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Main Area: Test Case Details */}
                <div className="flex-grow-1 d-flex flex-column" style={{ overflowY: 'auto' }}>
                  <div className="d-flex justify-content-between align-items-center p-2 border-bottom bg-light">
                    <strong className="small">Test Case Details</strong>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={clearValidationOutput}
                    >
                      Clear
                    </button>
                  </div>
                  <div
                    ref={outputRef}
                    className="flex-grow-1 p-3"
                    style={{ fontFamily: 'monospace', fontSize: '0.875rem', overflowY: 'auto' }}
                  >
                    {selectedTestCase ? (
                      <div>
                        <div className="mb-3">
                          <h6 className="fw-bold">{(selectedTestCase as any).name as string}</h6>
                          {(selectedTestCase as any).id && (
                            <div className="mb-2">
                              <strong>ID:</strong> <code>{(selectedTestCase as any).id}</code>
                            </div>
                          )}
                          <div className="mb-2">
                            <span className={`badge ${((selectedTestCase as any).passed) ? 'bg-success' : 'bg-danger'}` as any}>
                              {(selectedTestCase as any).passed ? 'Passed' : 'Failed'}
                            </span>
                            <span className="badge bg-secondary ms-2">{(selectedTestCase as any).type as string}</span>
                          </div>
                          {(selectedTestCase as any).description && (
                            <div className="mb-2">
                              <strong>Description:</strong> {(selectedTestCase as any).description as string}
                            </div>
                          )}
                        </div>
                        {(selectedTestCase as any).passed && (selectedTestCase as any).message && (
                          <div className="alert alert-success">
                            <strong>Success:</strong> {(selectedTestCase as any).message as string}
                          </div>
                        )}
                        {!((selectedTestCase as any).passed) && (selectedTestCase as any).error && (
                          <div className="alert alert-danger">
                            <strong>Error:</strong>
                            <pre className="mb-0 mt-2" style={{ whiteSpace: 'pre-wrap' }}>{(selectedTestCase as any).error as string}</pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        {validationOutput.map((output: any, index: number) => (
                          <div key={index} className={`mb-2 ${getOutputLineClass(output.type as string as any)}`}>
                            {output.message as string}
                          </div>
                        ))}
                        {validationOutput.length === 0 && (
                          <div className="text-muted">No output yet. Click Validate to start validation.</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* Mark as Complete Confirmation Modal */}
      <ConfirmationModal
        show={showCompleteModal}
        onHide={() => setShowCompleteModal(false)}
        onConfirm={handleMarkAsComplete}
        title="Confirm Mark as Complete"
        message="Are you sure you want to mark this question as complete? This action cannot be undone."
        confirmText="Yes"
        cancelText="No"
        confirmVariant="success"
        disabled={submitting}
        loading={submitting}
        loadingText="Submitting..."
        centered={true}
        size="lg"
      />
    </div>
    </>
  );
}

export default ProjectCodingEditor;