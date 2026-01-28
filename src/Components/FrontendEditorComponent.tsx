// Note: This is a simplified version. For full functionality, copy the complete logic from src/HTMLCSSEditor.tsx
// and adapt it to work with the question prop instead of fetching questions.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { getApiClient } from "../utils/apiAuth";
import CryptoJS from "crypto-js";
import { secretKey } from "../constants";
import { QUESTION_STATUS } from "../constants/constants";
import { getExpectedDescription } from "../utils/htmlCssValidationUtils";
import { useHtmlCssEditorState } from "../utils/useHtmlCssEditorState";
import { Modal, TabNavigation, ExpectedOutput, ExpectedOutputContent } from "../utils/htmlCssEditorComponents";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCompress } from '@fortawesome/free-solid-svg-icons';
import { getCodeMirrorExtensions, getCodeMirrorBasicSetup, getCodeMirrorStyle } from "../utils/codeMirrorConfig";
import { getFileType, updateFileContent, handleTabClick, saveCodeToSession } from "../utils/htmlCssFileUtils";
import { 
  QuestionData, 
  decryptSessionValue, 
  encryptSessionValue,
  loadAutoSavedCode,
  validateCodeWithStructure,
  calculateSuccessRate,
  setValidationMessages,
  createTabClickWithClear,
  autoSaveCode,
  generateOutputCode,
  cleanupAfterSubmission,
  isSuccessMessage,
  getMessageClass
} from "../utils/htmlCssEditorUtils";
import { useConsoleTab, ConsoleTabContent } from "../utils/consoleTabUtils";
import { getProjectId } from "../utils/projectStorageUtils";

interface FrontendEditorComponentProps {
  question: QuestionData;
  questionIndex: number;
  totalQuestions: number;
  onNext: () => void;
  onQuestionChange: (index: number) => void;
}

const FrontendEditorComponent: React.FC<FrontendEditorComponentProps> = ({
  question,
  questionIndex,
  totalQuestions,
  onNext,
  onQuestionChange,
}) => {
  const studentId = decryptSessionValue('StudentId');
  const subjectId = decryptSessionValue('SubjectId');
  const subject = decryptSessionValue('Subject');
  const weekNumber = decryptSessionValue('WeekNumber');
  const dayNumber = decryptSessionValue('DayNumber');
  
  const projectId = getProjectId("projectId");
  const isProjectContext = !!projectId && window.location.pathname.includes('/coding-challenges-editor');
  const isTestingContext = window.location.pathname.includes('/testing/coding/');
  const isTestFlowContext = window.location.pathname.includes('/test/coding');

  // Use custom hook for editor state
  const {
    fileContents,
    setFileContents,
    activeTab,
    setActiveTab,
    editorInstances,
    setEditorInstances,
    isMaximized,
    setIsMaximized,
    showRequirement,
    setShowRequirement,
    activeSection,
    setActiveSection,
    activeOutputTab,
    setActiveOutputTab,
    processing,
    setProcessing,
    hasRunCode,
    setHasRunCode,
    isSubmitted,
    setIsSubmitted,
    successMessage,
    setSuccessMessage,
    additionalMessage,
    setAdditionalMessage,
    structureErrorMessage,
    setStructureErrorMessage,
    testResults,
    setTestResults,
    structureResults,
    setStructureResults,
    selectedTestCaseIndex,
    setSelectedTestCaseIndex,
    showModal,
    setShowModal,
    modalContent,
    setModalContent,
    hasLoadedAutoSavedCode,
    getFileType,
    getCurrentFileContent,
    updateFileContent,
    handleTabClick,
    openModal,
    closeModal,
    resetMessages,
    resetTestResults,
    resetEditorState,
  } = useHtmlCssEditorState();

  // Handle question change (following HTMLCSSCodeEditor pattern exactly)
  const handleQuestionChange = useCallback(async (question: any) => {
    if (!question) return;
    
    // Reset output tab to image (default)
    setActiveOutputTab('image');
    
    // Clear editor instances for fresh start - exactly like HTMLCSSCodeEditor
    setEditorInstances({});
    
    // Reset additional states for fresh question
    setTestResults({});
    setStructureResults({});
    setSelectedTestCaseIndex(null);
    setSuccessMessage('');
    setAdditionalMessage('');
    setStructureErrorMessage('');
    setHasRunCode(false);
    setIsSubmitted(false);
    setActiveSection('output');
    setActiveOutputTab('image');
    
    // Check if question is submitted (either via question.status or session storage)
    const questionStatusKey = `coding_${question?.Qn_name}`;
    let isSubmittedStatus = false;
    let testId = "";
    
    if (isTestFlowContext) {
      const encryptedTestId = sessionStorage.getItem("TestId");
      testId = encryptedTestId ? CryptoJS.AES.decrypt(encryptedTestId, secretKey).toString(CryptoJS.enc.Utf8) : "";
      const statusSessionKey = `${testId}_questionStatus`;
      const sessionStatus = sessionStorage.getItem(statusSessionKey);
      
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
    } else {
      const submitStatusKey = isProjectContext
        ? `project_submitStatus_${question.Qn_name}`
        : `submitStatus_${studentId}_${subject}_${weekNumber}_${dayNumber}_${question.Qn_name}`;
      const encryptedSubmitStatus = sessionStorage.getItem(submitStatusKey);
      isSubmittedStatus = encryptedSubmitStatus ? 
        CryptoJS.AES.decrypt(encryptedSubmitStatus, secretKey).toString(CryptoJS.enc.Utf8) === 'true' : false;
    }
    
    const isSubmitted = question.status === true || isSubmittedStatus;
    
    // Load file contents using shared utility (like HTMLCSSCodeEditor)
    let fileContents: {[key: string]: string} = {};
    
    if (isTestFlowContext) {
      // For test flow: use loadAutoSavedCode utility (like HTMLCSSCodeEditor)
      const sessionKey = `userCode_${testId}_${question.Qn_name}`;
      fileContents = await loadAutoSavedCode(question, sessionKey, studentId, testId, isSubmitted);
    } else if (isTestingContext) {
      // In testing context, load Ans directly from Code_Validation
      Object.keys(question.Code_Validation).forEach(fileName => {
        const codeValidation = question.Code_Validation[fileName];
        if (codeValidation && codeValidation.Ans !== undefined) {
          fileContents[fileName] = codeValidation.Ans;
        } else {
          fileContents[fileName] = '';
        }
      });
    } else {
      // Normal flow: use entered_ans, template, or empty
      Object.keys(question.Code_Validation).forEach(fileName => {
        if (question.status === true && question.entered_ans && question.entered_ans[fileName]) {
          fileContents[fileName] = question.entered_ans[fileName];
        } else if (fileName === 'index.html') {
          const defaultTemplate = question.Template || question.defaulttemplate || '';
          fileContents[fileName] = defaultTemplate;
        } else {
          fileContents[fileName] = '';
        }
      });
      
      // Check session storage for saved code
      const sessionKey = isProjectContext
        ? `project_userCode_${question.Qn_name}`
        : `userCode_${subject}_${weekNumber}_${dayNumber}_${question.Qn_name}`;
      const encryptedSessionCode = sessionStorage.getItem(sessionKey);
      
      if (encryptedSessionCode && !question.status && !isSubmittedStatus) {
        try {
          const decryptedCode = CryptoJS.AES.decrypt(encryptedSessionCode, secretKey).toString(CryptoJS.enc.Utf8);
          const sessionCode = JSON.parse(decryptedCode);
          
          Object.keys(sessionCode).forEach(fileName => {
            if (fileContents.hasOwnProperty(fileName)) {
              fileContents[fileName] = sessionCode[fileName];
            }
          });
        } catch (error) {
          console.error('Error loading session storage code:', error);
        }
      } else if (!question.status && !isSubmittedStatus && !isProjectContext) {
        // Try to load auto-saved code from backend
        loadAutoSavedCode(question, sessionKey, studentId, QUESTION_STATUS.PRACTICE, false)
          .then(autoSavedCode => {
            Object.keys(autoSavedCode).forEach(fileName => {
              if (fileContents.hasOwnProperty(fileName)) {
                fileContents[fileName] = autoSavedCode[fileName];
              }
            });
            setFileContents(fileContents);
            
            // Set active tab to the first file after loading auto-saved code
            if (question.Tabs.length > 0) {
              setActiveTab(question.Tabs[0].name);
            }
          })
          .catch(error => {
            console.error('Error loading auto-saved code from backend:', error);
            setFileContents(fileContents);
            
            // Set active tab to the first file even on error
            if (question.Tabs.length > 0) {
              setActiveTab(question.Tabs[0].name);
            }
          });
        return;
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
  }, [studentId, subject, weekNumber, dayNumber, isTestingContext, isTestFlowContext, isProjectContext]);

  // Call handleQuestionChange when question changes
  useEffect(() => {
    if (question) {
      handleQuestionChange(question);
    }
  }, [question, handleQuestionChange]);

  const onChangeFileContent = useCallback((value: string, viewUpdate: any) => {
    updateFileContent(activeTab, value);
    
    if (question && !isSubmitted) {
      const codeToSave: {[key: string]: string} = {};
      
      Object.keys(fileContents).forEach(fileName => {
        codeToSave[fileName] = fileContents[fileName] || '';
      });
      
      codeToSave[activeTab] = value;
      
      let sessionKey: string;
      if (isProjectContext) {
        sessionKey = `project_userCode_${question.Qn_name}`;
      } else if (isTestFlowContext) {
        // Follow previous test flow pattern: userCode_${testId}_${question.Qn_name}
        const encryptedTestId = sessionStorage.getItem("TestId");
        const testId = encryptedTestId ? CryptoJS.AES.decrypt(encryptedTestId, secretKey).toString(CryptoJS.enc.Utf8) : "";
        sessionKey = `userCode_${testId}_${question.Qn_name}`;
      } else if (isTestingContext) {
        sessionKey = `testing_userCode_${question.Qn_name}`;
      } else {
        sessionKey = `userCode_${subject}_${weekNumber}_${dayNumber}_${question.Qn_name}`;
      }
      saveCodeToSession(codeToSave, sessionKey);
    }
  }, [activeTab, fileContents, question, isSubmitted, subject, weekNumber, dayNumber, isProjectContext, isTestingContext, isTestFlowContext]);

  const handleTabClickWithClear = createTabClickWithClear(
    handleTabClick,
    setSuccessMessage,
    setAdditionalMessage,
    setStructureErrorMessage
  );

  const handleCheckCode = async () => {
    setProcessing(true);
    try {
      if (isMaximized) {
        setIsMaximized(false);
      }
      setActiveSection('output');
      
      if (question && activeTab) {
        const currentCode = getCurrentFileContent();
        
        const { results } = await validateCodeWithStructure(
          currentCode,
          activeTab,
          question,
          setSuccessMessage,
          setAdditionalMessage,
          setStructureErrorMessage,
          setHasRunCode,
          setTestResults,
          setStructureResults,
          setSelectedTestCaseIndex,
          fileContents
        );
        
        if (results.length === 0) return;
        
        // Auto-save code when running (like HTMLCSSCodeEditor)
        if (isTestFlowContext) {
          const encryptedTestId = sessionStorage.getItem("TestId");
          const testId = encryptedTestId ? CryptoJS.AES.decrypt(encryptedTestId, secretKey).toString(CryptoJS.enc.Utf8) : "";
          await autoSaveCode(fileContents, question.Qn_name, studentId, testId, isSubmitted);
        } else if (!isTestingContext && !isProjectContext) {
          await autoSaveCode(fileContents, question.Qn_name, studentId, QUESTION_STATUS.PRACTICE, isSubmitted);
        }
        
        setSelectedTestCaseIndex(0);
        
        const successRate = calculateSuccessRate(results);
        setValidationMessages(successRate, setSuccessMessage, setAdditionalMessage);
      }
    } finally {
      setProcessing(false);
    }
  };

  const renderEditor = () => {
    const fileType = getFileType(activeTab);
    const currentContent = getCurrentFileContent();
    const extensions = getCodeMirrorExtensions(fileType, 'Write your code here');
    
    return (
      <CodeMirror
        key={`${activeTab}-${questionIndex}`}
        className="text-xl text-start custom-codemirror"
        value={currentContent}
        height="100%"
        extensions={extensions}
        onChange={onChangeFileContent}
        style={getCodeMirrorStyle()}
        basicSetup={getCodeMirrorBasicSetup()}
      />
    );
  };

  const srcCode = useMemo(() => {
    return generateOutputCode(fileContents, question?.image_urls);
  }, [fileContents, question?.image_urls]);

  const {
    consoleLogs,
    clearConsoleLogs,
    iframeKey,
    iframeRef,
    currentExecutionId
  } = useConsoleTab({
    activeSection,
    srcCode: srcCode || '',
    questionId: question?.Qn_name
  });

  const handleSubmit = async () => {
    setProcessing(true);
    
    try {
      const htmlFiles = Object.keys(fileContents).filter(fileName => 
        fileName.endsWith('.html')
      );
      const htmlCode: {[key: string]: string} = {};
      const htmlResult: {[key: string]: string} = {};
      
      htmlFiles.forEach(fileName => {
        htmlCode[fileName] = fileContents[fileName] || '';
        const testResultsForFile = testResults[fileName] || [];
        const passedTests = testResultsForFile.filter(result => result).length;
        const totalTests = testResultsForFile.length > 0 ? testResultsForFile.length : 
          (question?.Code_Validation[fileName]?.structure?.length || 0);
        htmlResult[fileName] = `${passedTests}/${totalTests}`;
      });
      
      const cssFiles = Object.keys(fileContents).filter(fileName => 
        fileName.endsWith('.css')
      );
      const cssCode: {[key: string]: string} = {};
      const cssResult: {[key: string]: string} = {};
      
      cssFiles.forEach(fileName => {
        cssCode[fileName] = fileContents[fileName] || '';
        const testResultsForFile = testResults[fileName] || [];
        const passedTests = testResultsForFile.filter(result => result).length;
        const totalTests = testResultsForFile.length > 0 ? testResultsForFile.length : 
          (question?.Code_Validation[fileName]?.structure?.length || 0);
        cssResult[fileName] = `${passedTests}/${totalTests}`;
      });
      
      const jsFiles = Object.keys(fileContents).filter(fileName => 
        fileName.endsWith('.js')
      );
      const jsCode: {[key: string]: string} = {};
      const jsResult: {[key: string]: string} = {};
      
      jsFiles.forEach(fileName => {
        jsCode[fileName] = fileContents[fileName] || '';
        const testResultsForFile = testResults[fileName] || [];
        
        if (testResultsForFile.length === 0) {
          const totalTests = question?.Code_Validation[fileName]?.structure?.length || 0;
          jsResult[fileName] = `0/${totalTests}`;
        } else {
          const passedTests = testResultsForFile.filter((result: any) => {
            if (typeof result === 'boolean') {
              return result;
            } else if (typeof result === 'object' && result !== null && 'passed' in result) {
              return result.passed;
            }
            return false;
          }).length;
          const totalTests = testResultsForFile.length;
          jsResult[fileName] = `${passedTests}/${totalTests}`;
        }
      });
      
      const encryptedBatchId = sessionStorage.getItem('BatchId');
      const decryptedBatchId = encryptedBatchId ? 
        CryptoJS.AES.decrypt(encryptedBatchId, secretKey).toString(CryptoJS.enc.Utf8) : 'batch4';

      if (isProjectContext) {
        // Project-specific submission
        const url = `${process.env.REACT_APP_BACKEND_URL}api/student/project/frontend/submit/`;
        const projectId = getProjectId("projectId");
        const phaseId = getProjectId("phaseId");
        const partId = getProjectId("partId");
        const taskId = getProjectId("taskId");
        
        const postData = {
          student_id: studentId,
          question_id: question.Qn_name,
          html_code: htmlCode,
          html_result: htmlResult,
          css_code: cssCode,
          css_result: cssResult,
          js_code: jsCode,
          js_result: jsResult,
          batch_id: decryptedBatchId,
          project_id: projectId,
          phase_id: phaseId,
          part_id: partId,
          task_id: taskId,
        };

        const response = await getApiClient().post(url, postData);
        const responseData = response.data;
        
        if (responseData.status === true) {
          setIsSubmitted(true);
          const submitStatusKey = `project_submitStatus_${question.Qn_name}`;
          const encryptedSubmitStatus = CryptoJS.AES.encrypt("true", secretKey).toString();
          sessionStorage.setItem(submitStatusKey, encryptedSubmitStatus);

          setSuccessMessage("Code submitted successfully!");
          setAdditionalMessage("");
        } else {
          setSuccessMessage("Submission failed");
          setAdditionalMessage("Could not submit your answer please try again");
        }
      } else if (isTestFlowContext) {
        // Test flow submission
        const encryptedTestId = sessionStorage.getItem("TestId");
        const testId = encryptedTestId ? CryptoJS.AES.decrypt(encryptedTestId, secretKey).toString(CryptoJS.enc.Utf8) : "";
        const encryptedCourseId = sessionStorage.getItem('CourseId');
        const decryptedCourseId = encryptedCourseId ? 
          CryptoJS.AES.decrypt(encryptedCourseId, secretKey).toString(CryptoJS.enc.Utf8) : 'course19';
        
        // Get max score from question data (e.g., "0/10" -> use 10 as max score)
        const questionScore = question?.score || "0/10";
        const maxScore = parseInt(questionScore.split('/')[1]);
        
        const url = `${process.env.REACT_APP_BACKEND_URL}api/student/test/questions/submit/frontend/`;
        
        const postData = {
          student_id: studentId,
          test_id: testId,
          question_id: question.Qn_name,
          question_done_at: testId,
          week_number: "0",
          day_number: "0",
          subject_id: decryptSessionValue("TestSubjectId"),
          subject: sessionStorage.getItem("TestSubject") || "",
          batch_id: decryptedBatchId,
          course_id: decryptedCourseId,
          score: maxScore,
          HTML_Code: htmlCode,
          HTML_Result: htmlResult,
          CSS_Code: cssCode,
          CSS_Result: cssResult,
          JS_Code: jsCode,
          JS_Result: jsResult
        };

        const response = await getApiClient().post(url, postData);
        const responseData = response.data;
        
        if (responseData.status === true || responseData.message !== "Test Already Completed") {
          setIsSubmitted(true);
          
          // Update question status in session storage and notify TestEditorFlow
          const questionKey = `coding_${question.Qn_name}`;
          const sessionKey = `${testId}_questionStatus`;
          const sessionStatus = sessionStorage.getItem(sessionKey);
          
          if (sessionStatus) {
            try {
              const decryptedStatuses = CryptoJS.AES.decrypt(sessionStatus, secretKey).toString(CryptoJS.enc.Utf8);
              const statuses = JSON.parse(decryptedStatuses);
              
              statuses[questionKey] = "Submitted";
              
              const encryptedStatuses = CryptoJS.AES.encrypt(JSON.stringify(statuses), secretKey).toString();
              sessionStorage.setItem(sessionKey, encryptedStatuses);
              
              // Notify TestEditorFlow to update its local state
              if ((window as any).updateQuestionStatusInTestEditor) {
                (window as any).updateQuestionStatusInTestEditor(questionKey, "Submitted");
              }
            } catch (error) {
              console.error("Error updating session status:", error);
            }
          }

          // Cleanup auto-saved code after successful submission
          await cleanupAfterSubmission(question.Qn_name, studentId, testId);

          setSuccessMessage("Code submitted successfully!");
          setAdditionalMessage("");
        } else {
          setSuccessMessage("Submission failed");
          setAdditionalMessage("Could not submit your answer please try again");
        }
      } else {
        // Practice coding submission
        const url = `${process.env.REACT_APP_BACKEND_URL}api/student/frontend/submit/`;
        
        // Get max score from question data (e.g., "0/10" -> use 10 as max score)
        const questionScore = question?.score || "0/10";
        const maxScore = parseInt(questionScore.split('/')[1]);
        
        const encryptedCourseId = sessionStorage.getItem('CourseId');
        const decryptedCourseId = encryptedCourseId ? 
          CryptoJS.AES.decrypt(encryptedCourseId, secretKey).toString(CryptoJS.enc.Utf8) : 'course1';
        
        const postData = {
          student_id: studentId,
          question_id: question.Qn_name,
          question_done_at: QUESTION_STATUS.PRACTICE,
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

        const response = await getApiClient().post(url, postData);
        const responseData = response.data;
        
        if (responseData.status === true) {
          setIsSubmitted(true);
          const submitStatusKey = `submitStatus_${studentId}_${subject}_${weekNumber}_${dayNumber}_${question.Qn_name}`;
          const encryptedSubmitStatus = CryptoJS.AES.encrypt("true", secretKey).toString();
          sessionStorage.setItem(submitStatusKey, encryptedSubmitStatus);

          // Clean up auto-saved code after successful submission
          await cleanupAfterSubmission(question.Qn_name, studentId, QUESTION_STATUS.PRACTICE);

          setSuccessMessage("Code submitted successfully!");
          setAdditionalMessage("");
        } else {
          setSuccessMessage("Submission failed");
          setAdditionalMessage("Could not submit your answer please try again");
        }
      }
   
    } catch (error) {
      console.error("Error submitting code:", error);
      setSuccessMessage("Submission failed");
      setAdditionalMessage("There was an error submitting your code. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      {/* ===== NORMAL EDITOR VIEW ===== */}
      {!isMaximized && (
    <div className="d-flex" style={{ height: '100%', width: '100%', gap: '0' }}>
      {/* Problem Statement Panel */}
      <div className="bg-white" style={{ width: "40%", flexShrink: 0, height: "100%", display: "flex", flexDirection: "column", borderRight: "2px solid #dee2e6", marginRight: "10px" }}>
        <div className="bg-white" style={{ height: "100%", backgroundColor: "#E5E5E533", display: "flex", flexDirection: "column" }}>
          {/* Problem Statement & Requirements (50%) */}
          <div style={{ height: "50%", display: "flex", flexDirection: "column", borderBottom: "2px solid #dee2e6" }}>
            <div 
              className="flex-fill overflow-auto p-3"
              style={{ 
                scrollbarWidth: "thin",
                scrollbarColor: "#c1c1c1 #f1f1f1"
              }}
            >
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <h4 style={{ fontSize: "18px", fontWeight: "600", color: "#333", margin: 0 }}>
                    Problem Statement
                  </h4>
                  {isTestingContext && question?.question_id && (
                    <span className="p-2 fs-6 rounded-2 bg-primary-subtle">
                      QID: {question.question_id}
                    </span>
                  )}
                </div>
                <div 
                  style={{ 
                    whiteSpace: "pre-wrap", 
                    wordBreak: "break-word",
                    fontFamily: "inherit",
                    lineHeight: "1.5",
                    fontSize: "14px",
                    color: "#555"
                  }} 
                  dangerouslySetInnerHTML={{ __html: question?.Qn || '' }}
                />
              </div>

              <div>
                <h4 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "10px", color: "#333" }}>
                  Requirements
                </h4>
                <div 
                  dangerouslySetInnerHTML={{ __html: question?.requirements || 'No requirements specified.' }}
                />
              </div>
            </div>
          </div>
          
          {/* Expected Output (50%) */}
          <div style={{ height: "50%", display: "flex", flexDirection: "column" }}>
            <ExpectedOutput
              questionData={question}
              activeOutputTab={activeOutputTab}
              onOutputTabChange={(tab) => setActiveOutputTab(tab)}
              onImageClick={(src, title) => openModal('image', src, title)}
              onVideoClick={(src, title) => openModal('video', src, title)}
            />
            
            <ExpectedOutputContent
              questionData={question}
              activeOutputTab={activeOutputTab}
              onImageClick={(src, title) => openModal('image', src, title)}
              onVideoClick={(src, title) => openModal('video', src, title)}
            />
          </div>
        </div>
      </div>

      {/* Code Editor and Controls Panel */}
      <div style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Code Editor */}
        <div className="bg-white" style={{ height: "45%", backgroundColor: "#E5E5E533" }}>
          <div className="border-bottom border-dark p-2 d-flex justify-content-between align-items-center">
            <TabNavigation
              tabs={question?.Tabs || []}
              activeTab={activeTab}
              onTabClick={handleTabClickWithClear}
              showExpandButton={true}
              onExpandClick={() => setIsMaximized(true)}
            />
          </div>
          <div className="col top" style={{ height: `calc(100% - 60px)`, overflowY: 'auto', marginBottom: '10px' }}>
            {renderEditor()}
          </div>
        </div>

        {/* Processing Status and Action Buttons */}
        <div style={{ height: "6%", backgroundColor: "#E5E5E533" }} className="d-flex flex-column justify-content-center pe-3">
          <div className="d-flex justify-content-between align-items-center h-100">
            <div className="d-flex flex-column justify-content-center">
              {processing ? (
                <h5 className="m-0 processingDivHeadingTag">Processing...</h5>
              ) : (
                <>
                  {successMessage && <h5 className={`m-0 ps-1 ${getMessageClass(successMessage)}`} style={{ fontSize: '14px' }}>{successMessage}</h5>}
                  {additionalMessage && <p className={`processingDivParaTag m-0 ps-1 ${getMessageClass(successMessage)}`} style={{ fontSize: "10px" }}>{additionalMessage}</p>}
                </>
              )}
            </div>
            <div className="d-flex justify-content-end">
              <button
                className="btn btn-sm btn-light me-2 processingDivButton"
                style={{
                  whiteSpace: "nowrap",
                  fontSize: "12px",
                  minWidth: "70px",
                  boxShadow: "#888 1px 2px 5px 0px",
                  height: "30px",
                }}
                onClick={handleCheckCode}
                disabled={processing}
              >
                RUN
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
                  disabled={processing || isSubmitted || !hasRunCode}
                >
                  {processing ? "PROCESSING..." : isSubmitted ? "SUBMITTED" : "SUBMIT"}
                </button>
              )}
              
              {((!isTestingContext && isSubmitted) || (isTestingContext && hasRunCode)) &&
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
                className={`btn ${activeSection === 'console' ? 'btn-primary' : 'btn-outline-primary'} me-2`}
                onClick={() => setActiveSection('console')}
                style={{ fontSize: "12px", padding: "6px 12px" }}
              >
                Console
              </button>
              <button
                className={`btn ${activeSection === 'testcases' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setActiveSection('testcases')}
                style={{ fontSize: "12px", padding: "6px 12px" }}
              >
                Test Cases
              </button>
            </div>

            {/* Output Section */}
            {activeSection === 'output' && (
              <div style={{ flex: 1, maxHeight: "90%", display: "flex", flexDirection: "column" }}>
                {hasRunCode && activeTab.endsWith('.html') && testResults[activeTab] && testResults[activeTab].length === 0 && structureErrorMessage && (
                  <div className="alert alert-warning m-0 me-3 align-self-center" style={{ fontSize: "12px", padding: "8px 12px", margin: "0 0 10px 0" }}>
                    <strong>HTML Structure Error:</strong>
                    {structureErrorMessage}
                  </div>
                )}
                
                <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
                  {srcCode ? (
                    <iframe
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        backgroundColor: 'white', 
                        color: 'black', 
                        border: 'none',
                        outline: 'none',
                        overflow: 'auto'
                      }}
                      className="w-full h-full"
                      srcDoc={srcCode}
                      title="Output"
                      sandbox="allow-scripts allow-same-origin"
                      width="100%"
                      height="100%"
                      scrolling="yes"
                    ></iframe>
                  ) : (
                    <div className="d-flex align-items-center justify-content-center h-100" style={{ backgroundColor: '#f8f9fa' }}>
                      <div className="text-center text-muted">
                        <p className="mt-2">Click RUN to see output</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Console Section */}
            {activeSection === 'console' && (
              <ConsoleTabContent
                activeSection={activeSection}
                srcCode={srcCode || ''}
                consoleLogs={consoleLogs}
                clearConsoleLogs={clearConsoleLogs}
                iframeKey={iframeKey}
                iframeRef={iframeRef}
                currentExecutionId={currentExecutionId}
              />
            )}
            
            {/* Test Cases Section */}
            {activeSection === 'testcases' && (
              <div style={{ flex: 1, maxHeight: "90%", overflow: "hidden" }}>
                {testResults[activeTab] && testResults[activeTab].length > 0 ? (
                  <div style={{ height: "100%" }}>
                    <div className="d-flex" style={{ height: "100%" }}>
                      {/* Left Column - Test Case List (30%) */}
                      <div className="border-end" style={{ 
                        width: "30%", 
                        height: "100%",
                        overflowY: "auto", 
                        padding: "10px",
                        scrollbarWidth: "thin",
                        scrollbarColor: "#c1c1c1 #f1f1f1"
                      }}>
                        {testResults[activeTab].map((result, index) => {
                          const displayText = `Test Case ${index + 1}`;
                          let isPassed = false;
                          
                          if (typeof result === 'boolean') {
                            isPassed = result;
                          } else if (typeof result === 'object' && result !== null && 'passed' in result) {
                            isPassed = (result as any).passed;
                          }
                          
                          return (
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
                              <span style={{ fontSize: "11px", lineHeight: "1.3" }}>{displayText}</span>
                              {isPassed ? (
                                <span className="text-success">✓</span>
                              ) : (
                                <span className="text-danger">✗</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Right Column - Test Case Details (70%) */}
                      <div className="px-4 pt-3 pb-3" style={{ 
                        width: "70%", 
                        height: "100%",
                        overflowY: "auto",
                        scrollbarWidth: "thin",
                        scrollbarColor: "#c1c1c1 #f1f1f1"
                      }}>
                        {selectedTestCaseIndex !== null && testResults[activeTab][selectedTestCaseIndex] !== undefined && (
                          <div>
                            <div className="mb-3">
                              <strong>Status: </strong>
                              <span className={(() => {
                                const result = testResults[activeTab][selectedTestCaseIndex];
                                if (typeof result === 'boolean') {
                                  return result ? "text-success" : "text-danger";
                                } else if (typeof result === 'object' && result !== null && 'passed' in result) {
                                  return (result as any).passed ? "text-success" : "text-danger";
                                }
                                return "text-danger";
                              })()}>
                                {(() => {
                                  const result = testResults[activeTab][selectedTestCaseIndex];
                                  if (typeof result === 'boolean') {
                                    return result ? "Pass" : "Failed";
                                  } else if (typeof result === 'object' && result !== null && 'passed' in result) {
                                    return (result as any).passed ? "Pass" : "Failed";
                                  }
                                  return "Failed";
                                })()}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted" style={{ padding: "20px" }}>
                    <p className="mt-2">Click RUN to validate your code</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
      )}

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
          {/* Header with buttons */}
          <div className="bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
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
                onClick={handleCheckCode}
                disabled={processing}
              >
                RUN
              </button>
            </div>
          </div>
          
          {/* Main content area */}
          <div style={{ flex: 1, display: 'flex', margin: '10px', gap: '10px' }}>
            {/* Requirement panel */}
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
                    <div style={{ marginBottom: "20px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                        <h4 style={{ fontSize: "18px", fontWeight: "600", color: "#333", margin: 0 }}>
                          Problem Statement
                        </h4>
                        {isTestingContext && question?.question_id && (
                          <span className="p-2 fs-6 rounded-2 bg-primary-subtle">
                            QID: {question.question_id}
                          </span>
                        )}
                      </div>
                      <div 
                        style={{ 
                          whiteSpace: "pre-wrap", 
                          wordBreak: "break-word",
                          fontFamily: "inherit",
                          lineHeight: "1.5",
                          fontSize: "14px",
                          color: "#555"
                        }} 
                        dangerouslySetInnerHTML={{ __html: question?.Qn || '' }}
                      />
                    </div>

                    <div>
                      <h4 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "10px", color: "#333" }}>
                        Requirements
                      </h4>
                      <div 
                        dangerouslySetInnerHTML={{ __html: question?.requirements || 'No requirements specified.' }}
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
                  <ExpectedOutput
                    questionData={question}
                    activeOutputTab={activeOutputTab}
                    onOutputTabChange={(tab) => setActiveOutputTab(tab)}
                    onImageClick={(src, title) => openModal('image', src, title)}
                    onVideoClick={(src, title) => openModal('video', src, title)}
                  />
                  
                  <ExpectedOutputContent
                    questionData={question}
                    activeOutputTab={activeOutputTab}
                    onImageClick={(src, title) => openModal('image', src, title)}
                    onVideoClick={(src, title) => openModal('video', src, title)}
                  />
                </div>
              </div>
            )}
            
            {/* Editor area */}
            <div style={{ 
              width: showRequirement ? '60%' : '100%', 
              backgroundColor: 'white', 
              borderRadius: '4px',
              display: 'flex',
              flexDirection: 'column',
              height: 'calc(100vh - 80px)'
            }}>
              {/* File tabs on top of editor */}
              <div className="bg-light border-bottom p-2 d-flex align-items-center">
                <TabNavigation
                  tabs={question?.Tabs || []}
                  activeTab={activeTab}
                  onTabClick={handleTabClickWithClear}
                  showExpandButton={false}
                />
              </div>
              {/* Editor area */}
              <div style={{ flex: 1, minHeight: 0 }}>
                {renderEditor()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        showModal={showModal}
        modalContent={modalContent}
        onClose={closeModal}
      />
    </>
  );
};

export default FrontendEditorComponent;

