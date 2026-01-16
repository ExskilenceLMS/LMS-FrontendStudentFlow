import React, { useState, useEffect, useRef } from "react";
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
  const [vscodeUrl, setVscodeUrl] = useState(null);
  const [vscodeLoading, setVscodeLoading] = useState(false);
  
  // Validation state - always run all tasks from JSON files
  // const [wsClient, setWsClient] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [validationOutput, setValidationOutput] = useState<any[]>([]);
  const [validationProgress, setValidationProgress] = useState({ message: 'Ready to validate', percentage: 0 });
  const [testCases, setTestCases] = useState<any[]>([]);
  const [selectedTestCase, setSelectedTestCase] = useState(null);
  const [pingActive, setPingActive] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const outputRef = useRef(null);
  const isMountedRef = useRef(true);
  const iframeRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    const iframe = iframeRef.current;
    return () => {
      isMountedRef.current = false;
      // Cleanup polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      // if (wsClient) {
      //   (wsClient as ValidationWebSocketClient).disconnect();
      // }
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


  // Update VSCode URL when container is ready
  useEffect(() => {
    if ((containerStatus as any)?.success && (containerStatus as any).containerUrl) {
      setVscodeUrl((containerStatus as any).containerUrl);
      setVscodeLoading(true);
    } else {
      setVscodeUrl(null);
      setVscodeLoading(false);
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
    setValidationProgress({ message: 'Ready to validate', percentage: 0 });
    setPingActive(false);
    // Stop polling if active
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setPollingJobId(null);
  };

  const handleCollapse = () => {
    setShowTerminal(!showTerminal);
  };

  const updateTestCasesList = (testName: string, passed: boolean) => {
    setTestCases((prev: any[]) => {
      const existing = prev.find(t => t.name === testName);
      if (existing) {
        return prev.map(t => t.name === testName ? { ...t, passed } : t);
      }
      return [...prev, { name: testName, passed, type: 'test' }];
    });
  };

  // Process validation results and extract test cases
  const processValidationResults = (results: any) => {
    // Display all test cases from results
    // Handle both single task and "all tasks" structures
    // Merge with existing tests to show incremental updates
    const existingTestIds = new Set(testCases.map(t => t.id || t.name));
    const allTests: any[] = [...testCases]; // Start with existing tests
    
    // Check if this is "all tasks" structure (has tasks array)
    if (results.tasks && Array.isArray(results.tasks)) {
      // Process each task's results
      results.tasks.forEach((taskResult: any, taskIndex: number) => {
        const taskPrefix = taskResult.taskName || taskResult.taskId || `Task ${taskIndex + 1}`;
        
        let taskHasTests = false;
        
        // Check for tests array directly in taskResult (flattened structure)
        if (taskResult.tests && Array.isArray(taskResult.tests) && taskResult.tests.length > 0) {
          taskHasTests = true;
          taskResult.tests.forEach((test: any) => {
            const testId = `${taskPrefix}-${test.id || test.name || ''}`;
            // Only add if not already present (incremental update)
            if (!existingTestIds.has(testId)) {
              allTests.push({
                name: `${taskPrefix} - ${test.name || 'Test'}`,
                id: testId,
                description: test.description || '',
                passed: test.passed !== undefined ? test.passed : (test.state === 'passed'),
                type: test.type || 'unknown',
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
        }
        
        // Schema tests
        if (taskResult.schema && taskResult.schema.tests && Array.isArray(taskResult.schema.tests) && taskResult.schema.tests.length > 0) {
          taskHasTests = true;
          taskResult.schema.tests.forEach((test: any) => {
            const testId = `${taskPrefix}-schema-${test.id || test.name || ''}`;
            if (!existingTestIds.has(testId)) {
              allTests.push({
                name: `${taskPrefix} - ${test.name || 'Schema Test'}`,
                id: testId,
                description: test.description || '',
                passed: test.passed || false,
                type: 'schema',
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
                name: `${taskPrefix} - ${test.name || 'Static Test'}`,
                id: testId,
                description: test.description || '',
                passed: test.passed || false,
                type: 'static',
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
                name: `${taskPrefix} - ${test.name || 'Pytest Test'}`,
                id: testId,
                description: test.description || '',
                passed: test.passed || false,
                type: 'pytest',
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
                  passed: test.passed || false,
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
                name: `${taskPrefix} - ${test.name || 'Playwright Test'}`,
                id: testId,
                description: test.description || '',
                passed: test.passed || false,
                type: 'dynamic',
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
                  passed: test.passed || false,
                  message: test.message || allTests[existingIndex].message,
                  error: test.error || allTests[existingIndex].error
                };
              }
            }
          });
        }
        
        // If task has no tests but has errors, create a test case entry for the error
        if (!taskHasTests && taskResult.errors && Array.isArray(taskResult.errors) && taskResult.errors.length > 0) {
          taskResult.errors.forEach((errorMsg: string, errorIndex: number) => {
            allTests.push({
              name: `${taskPrefix} - Validation Error ${errorIndex + 1 > 1 ? `(${errorIndex + 1})` : ''}`,
              id: taskResult.taskId || '',
              description: '',
              passed: false,
              type: 'error',
              message: '',
              error: errorMsg || 'Validation failed'
            });
          });
        } else if (!taskHasTests && !taskResult.passed) {
          // Task failed but no specific errors - create a generic error entry
          allTests.push({
            name: `${taskPrefix} - Validation Failed`,
            id: taskResult.taskId || '',
            description: '',
            passed: false,
            type: 'error',
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
            id: '',
            description: '',
            passed: false,
            type: 'error',
            message: '',
            error: errorMsg || 'Validation failed'
          });
        });
      }
    } else {
      // Single task structure (original format)
      // Check for tests array directly in results
      if (results.tests && Array.isArray(results.tests)) {
        results.tests.forEach((test: any) => {
          allTests.push({
            name: test.name || 'Test',
            id: test.id || test.name || '',
            description: test.description || '',
            passed: test.passed !== undefined ? test.passed : (test.state === 'passed'),
            type: test.type || 'unknown',
            message: test.message || '',
            error: test.error || test.details || ''
          });
        });
      }
      
      if (results.schema && results.schema.tests) {
        results.schema.tests.forEach((test: any) => {
          allTests.push({
            name: test.name || 'Schema Test',
            id: test.id || test.name || '',
            description: test.description || '',
            passed: test.passed || false,
            type: 'schema',
            message: test.message || '',
            error: test.error || test.details || ''
          });
        });
      }
      if (results.static && results.static.tests) {
        results.static.tests.forEach((test: any) => {
          allTests.push({
            name: test.name || 'Static Test',
            id: test.id || test.name || '',
            description: test.description || '',
            passed: test.passed || false,
            type: 'static',
            message: test.message || '',
            error: test.error || ''
          });
        });
      }
      if (results.pytest && results.pytest.tests) {
        results.pytest.tests.forEach((test: any) => {
          allTests.push({
            name: test.name || 'Pytest Test',
            id: test.id || test.name || '',
            description: test.description || '',
            passed: test.passed || false,
            type: 'pytest',
            message: test.message || '',
            error: test.error || ''
          });
        });
      }
      if (results.dynamic && results.dynamic.tests) {
        results.dynamic.tests.forEach((test: any) => {
          allTests.push({
            name: test.name || 'Playwright Test',
            id: test.id || test.name || '',
            description: test.description || '',
            passed: test.passed || false,
            type: 'dynamic',
            message: test.message || '',
            error: test.error || ''
          });
        });
      }
    }
    
    setTestCases(allTests as any[]);
    
    if (allTests.length > 0) {
      addValidationOutput(`Found ${allTests.length} test case(s)`, 'info');
    } else {
      // Provide more detailed error message
      let errorDetails = 'No test cases found in results.';
      if (results.errors && Array.isArray(results.errors) && results.errors.length > 0) {
        errorDetails += ` Errors: ${results.errors.join('; ')}`;
      }
      if (results.tasks && Array.isArray(results.tasks) && results.tasks.length === 0) {
        errorDetails += ' Tasks array is empty.';
      }
      addValidationOutput(errorDetails, 'warning');
    }
  };

  // const connectValidationWebSocket = (jobId: string) => {
  //   // Disconnect existing connection
  //   if (wsClient) {
  //     (wsClient as ValidationWebSocketClient).disconnect();
  //   }

  //   const newWsClient: ValidationWebSocketClient = new ValidationWebSocketClient(jobId, {
  //     onOpen: () => {
  //       addValidationOutput('Connected to validation server', 'success');
  //       setPingActive(true);
  //     },
  //     onPing: () => {
  //       // Trigger ping animation only when validation is running
  //       if (isRunning) {
  //         setPingActive(true);
  //         setTimeout(() => setPingActive(false), 200);
  //       }
  //     },
  //     onStarted: (data: any) => {
  //       const taskName = data.task_name || data.task_id || 'Task';
  //       addValidationOutput(`Validating: ${taskName}`, 'info');
  //     },
  //     onProgress: (message: string, percentage: number) => {
  //       setValidationProgress({ message, percentage });
  //       addValidationOutput(message, 'info');
  //     },
  //     onStage: (stage: string, percentage: number) => {
  //       setValidationProgress({ message: `Stage: ${stage}`, percentage });
  //       addValidationOutput(`Stage: ${stage}`, 'info');
  //     },
  //     onTest: (testName: string, passed: boolean, stage: string) => {
  //       const status = passed ? 'Passed' : 'Failed';
  //       addValidationOutput(`Test: ${testName} - ${status}`, passed ? 'success' : 'error');
  //       updateTestCasesList(testName, passed);
  //     },
  //     onPartial: (results: any) => {
  //       // Handle partial/incremental results - update UI in real-time
  //       const taskCount = results.tasks?.length || 0;
  //       const totalTasks = results.taskName?.match(/\d+/)?.[0] || taskCount;
  //       addValidationOutput(`Task ${taskCount}/${totalTasks} completed - updating results...`, 'info');
  //       processValidationResults(results);
  //       // Note: testCases will be updated by processValidationResults via setTestCases
  //       // We'll show the count in the next render cycle
  //     },
  //     onCompleted: (results: any) => {
  //       addValidationOutput('Validation completed!', 'success');
  //       processValidationResults(results);
  //       setIsRunning(false);
  //       // Stop ping interval and disconnect when validation completes
  //       newWsClient.stopPingInterval();
  //       setPingActive(false);
  //       // Disconnect WebSocket after a short delay to allow final messages
  //       setTimeout(() => {
  //         newWsClient.disconnect();
  //       }, 1000);
  //     },
  //     onError: (error: any) => {
  //       const errorMsg = error.message || error || 'Unknown error';
  //       addValidationOutput(`Error: ${errorMsg}`, 'error');
  //       setIsRunning(false);
  //       // Stop ping interval and disconnect on error
  //       newWsClient.stopPingInterval();
  //       setPingActive(false);
  //       // Disconnect WebSocket on error
  //       setTimeout(() => {
  //         newWsClient.disconnect();
  //       }, 1000);
  //     },
  //     onClose: () => {
  //       setPingActive(false);
  //       addValidationOutput('Connection closed', 'warning');
  //       // Stop ping interval when connection closes
  //       newWsClient.stopPingInterval();
  //     }
  //   });

  //   setWsClient(newWsClient as any);
  //   newWsClient.connect();
  // };

  // Polling-based validation status checking (HTTP polling instead of WebSocket)
  const startPollingValidationStatus = (jobId: string) => {
    setPollingJobId(jobId);
    addValidationOutput('Polling validation status...', 'info');
    
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
        // Animate ping indicator to show polling activity
        setPingActive(true);
        setTimeout(() => setPingActive(false), 200);
        
        // Check status first
        const statusResponse = await getValidationStatus(jobId);
        
        if (statusResponse && statusResponse.success) {
          const status = statusResponse.status;
          const progress = statusResponse.progress || '';
          const progressPercentage = statusResponse.progress_percentage || 0;
          
          // Update progress
          if (progress) {
            setValidationProgress({ message: progress, percentage: progressPercentage });
          }
          
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
                
                // If this is a "run-all" job with tasks array, show progress for each task
                if (resultsResponse.results.taskId === 'all' && resultsResponse.results.tasks) {
                  const completedTasks = resultsResponse.results.tasks.filter((t: any) => 
                    t.pytest || t.dynamic || t.static || t.errors
                  ).length;
                  const totalTasks = resultsResponse.results.tasks.length;
                  
                  if (completedTasks > 0 && completedTasks < totalTasks) {
                    addValidationOutput(
                      `Task ${completedTasks}/${totalTasks} completed - updating results...`, 
                      'info'
                    );
                  }
                }
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
                addValidationOutput('Validation completed!', 'success');
                processValidationResults(resultsResponse.results);
              } else if (status === 'failed' && statusResponse.error) {
                addValidationOutput(`Validation failed: ${statusResponse.error}`, 'error');
              }
            } catch (error: any) {
              console.error('Error fetching final validation results:', error);
              addValidationOutput('Validation completed, but could not fetch final results', 'warning');
            }
            
            setIsRunning(false);
            setPollingJobId(null);
            setPingActive(false);
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
    // Show terminal first so user can see any errors
    setShowTerminal(true);
    clearValidationOutput();

    setIsRunning(true);
    addValidationOutput('Triggering validation for all JSON files in testing_config...', 'info');

    try {
      // Get container_id from containerStatus (provision response stores container_id as containerName)
      const containerId = (containerStatus as any)?.containerName || (containerStatus as any)?.containerId || null;
      
      // Always pass null to run all JSON files in testing_config
      const response = await runValidation(null, null, containerId);
      
      if (response && response.success && response.job_id) {
        // connectValidationWebSocket(response.job_id);
        // Use polling instead of websocket
        startPollingValidationStatus(response.job_id);
        addValidationOutput(`Validation job started: ${response.job_id}`, 'info');
        if (response.tasks_found) {
          addValidationOutput(`Found ${response.tasks_found} task file(s) in testing_config`, 'info');
        }
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
      setPollingJobId(null);
      setPingActive(false);
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

      const cachedQuestionData = sessionStorage.getItem('projectCoding_questionData');
      if (!cachedQuestionData) {
        throw new Error("Question data not found");
      }

      const parsedData = JSON.parse(cachedQuestionData);
      if (!parsedData.questions?.length) {
        throw new Error("No questions found");
      }

      const firstQuestion = parsedData.questions[0];
      const questionId = firstQuestion.Qn_name || firstQuestion.question_id || "";

      if (!questionId) {
        throw new Error("Question ID not found");
      }

      const payload = {
        student_id: studentId,
        question_id: questionId,
        answer: "",
        batch_id: batchId,
        result_data: [],
        project_id: projectId,
        final_score: "0/0",
        phase_id: phaseId,
        part_id: partId,
        task_id: taskId
      };

      const response = await getApiClient().post(
        `${process.env.REACT_APP_BACKEND_URL}api/student/project/project_coding/submit/`,
        payload
      );

      setShowCompleteModal(false);
      addValidationOutput("Question marked as complete successfully!", "success");
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
              <div className="d-flex justify-content-center align-items-center h-100 position-absolute top-0 start-0 w-100 bg-white" style={{ zIndex: 10 }}>
                <div className="spinner-grow text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={vscodeUrl}
              frameBorder="0"
              className={`w-100 h-100 border-0 ${vscodeLoading ? "d-none" : "d-block"}`}
              onLoad={handleIframeLoad}
              title="VS Code Editor"
            ></iframe>
          </>
        )}
      </div>

      {/* Run and Submit Buttons */}
      <div className="d-flex justify-content-between gap-2 p-2 border-top bg-light" style={{ flexShrink: 0 }}>
        <button
          className="btn btn-outline-secondary"
          style={{ minWidth: '100px' }}
          onClick={handleCollapse}
        >
          <FontAwesomeIcon icon={showTerminal ? faChevronDown : faChevronUp} style={{ marginRight: '4px' }} />
          {showTerminal ? 'Collapse' : 'Expand'}
        </button>
        <div className="d-flex gap-2">
          <button
            id="run-validation-btn"
            className="btn btn-primary"
            style={{ minWidth: '100px' }}
            onClick={handleRunValidation}
            disabled={isRunning}
          >
            <FontAwesomeIcon icon={isRunning ? faHourglass : faPlay} style={{ marginRight: '4px' }} />
            {isRunning ? 'Validating...' : 'Validate'}
          </button>
          <button
            id="mark-complete-btn"
            className="btn btn-success"
            style={{ minWidth: '150px' }}
            onClick={() => setShowCompleteModal(true)}
            disabled={submitting}
          >
            <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '4px' }} />
            Mark as Complete
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
          {/* Progress Bar */}
          <div className="p-2 border-bottom bg-light">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small">{validationProgress.message}</span>
              {isRunning && (
                <span className="d-flex align-items-center">
                  <span 
                    className={`badge rounded-pill ${pingActive ? 'bg-success' : 'bg-secondary'}`}
                    style={{
                      width: '8px',
                      height: '8px',
                      padding: 0,
                      marginRight: '4px',
                      transition: 'background-color 0.2s ease',
                      animation: pingActive ? 'pulse 0.5s ease-in-out' : 'none'
                    }}
                  ></span>
                  <span className="small text-muted">Connected</span>
                </span>
              )}
            </div>
            <div className="progress" style={{ height: '8px' }}>
              <div
                className="progress-bar"
                role="progressbar"
                style={{ width: `${validationProgress.percentage}%` }}
                aria-valuenow={validationProgress.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>

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