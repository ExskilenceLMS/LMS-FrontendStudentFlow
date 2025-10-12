import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExpand } from '@fortawesome/free-solid-svg-icons';
import { getApiClient } from "../utils/apiAuth";
import { useNavigate } from "react-router-dom";
import SkeletonCode from "../Components/EditorSkeletonCode";
import { secretKey } from "../constants";
import { QUESTION_STATUS } from "../constants/constants";
import { getExpectedDescription } from "../utils/htmlCssValidationUtils";
import { useHtmlCssEditorState } from "../utils/useHtmlCssEditorState";
import { Modal, TabNavigation, ExpectedOutput, ExpectedOutputContent } from "../utils/htmlCssEditorComponents";
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
  isSuccessMessage
} from "../utils/htmlCssEditorUtils";
import CryptoJS from "crypto-js";


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
  const [loading, setLoading] = useState(false);
  const [submittedFiles, setSubmittedFiles] = useState<{[key: string]: boolean}>({});
  
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
      defaulttemplate: questionData.defaulttemplate || testSectionQuestion.defaulttemplate || testSectionQuestion.Template,
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
    setStructureErrorMessage('');
    setHasRunCode(false);
    setIsSubmitted(false);
    setActiveSection('output');
    setActiveOutputTab('image');
    
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
    
    // Load file contents using shared utility
    const sessionKey = `userCode_${testId}_${question?.Qn_name}`;
    const fileContents = await loadAutoSavedCode(question, sessionKey, studentId, testId, isSubmitted);
    
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
      
      const sessionKey = `userCode_${testId}_${questionData.Qn_name}`;
      saveCodeToSession(codeToSave, sessionKey);
    }
  }, [activeTab, fileContents, questionData?.Qn_name, questionData?.Tabs, processing, testId, isSubmitted]);







  const handleCheckCode = async () => {
    // If maximized, return to normal view when RUN is clicked
    if (isMaximized) {
      setIsMaximized(false);
    }
    
    // Validate only the current active file
    if (questionData && activeTab) {
      const currentCode = getCurrentFileContent();
      
      // Use shared validation utility
      const { results } = await validateCodeWithStructure(
        currentCode,
        activeTab,
        questionData,
        setSuccessMessage,
        setAdditionalMessage,
        setStructureErrorMessage,
        setHasRunCode,
        setTestResults,
        setStructureResults,
        setSelectedTestCaseIndex
      );
      
      if (results.length === 0) return; // Validation failed
      
      // Auto-save code when running
      await autoSaveCode(fileContents, questionData.Qn_name, studentId, testId, isSubmitted);
      
      setSelectedTestCaseIndex(0);
      
      // Calculate success rate and set messages
      const successRate = calculateSuccessRate(results);
      setValidationMessages(successRate, setSuccessMessage, setAdditionalMessage);
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
    const extensions = getCodeMirrorExtensions(fileType, 'Write your code here');
    
        return (
          <CodeMirror
            key={`${currentActiveTab}-${questionData?.Qn_name}`} // Stable key for each file and question
            className="text-xl text-start custom-codemirror"
            value={currentContent}
            height="100%"
            extensions={extensions}
            onChange={onChangeFileContent}
        style={getCodeMirrorStyle()}
        basicSetup={getCodeMirrorBasicSetup()}
          />
        );
  }, [activeTab, questionData?.Qn_name, questionData?.Tabs, fileContents, onChangeFileContent]);

  // Custom handleTabClick that clears status messages
  const handleTabClickWithClear = createTabClickWithClear(
    handleTabClick,
    setSuccessMessage,
    setAdditionalMessage,
    setStructureErrorMessage
  );

  const srcCode = generateOutputCode(fileContents);

  // Modal handlers

  // Cleanup effect to restore body scroll on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

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
            // Use actual test case count from question data if no tests have been run
            const totalTests = testResultsForFile.length > 0 ? testResultsForFile.length : 
              (questionData?.Code_Validation[fileName]?.structure?.length || 0);
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
            // Use actual test case count from question data if no tests have been run
            const totalTests = testResultsForFile.length > 0 ? testResultsForFile.length : 
              (questionData?.Code_Validation[fileName]?.structure?.length || 0);
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
            // Use actual test case count from question data if no tests have been run
            const totalTests = testResultsForFile.length > 0 ? testResultsForFile.length : 
              (questionData?.Code_Validation[fileName]?.structure?.length || 0);
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
    
          const response = await getApiClient().post(
            url,
            postData
          );
    
          const responseData = response.data;
          
          // Check if submission was successful based on API response status
          if (responseData.status === true) {
            // Mark as submitted only if API confirms success
            setIsSubmitted(true);
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

            await cleanupAfterSubmission(questionData?.Qn_name!, studentId, testId);

            // Show success message
            setSuccessMessage("Code submitted successfully!");
            setAdditionalMessage("");
          } else {
            // Show error message if API returns false status
            setSuccessMessage("Submission failed");
            setAdditionalMessage("Could not submit your answer please try again");
          }
     
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
                  <div className="col-5 lg-8 bg-white" style={{ height: "100%", display: "flex", flexDirection: "column", marginLeft: "-10px",  borderRight: "2px solid #dee2e6" }}>
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
                        <ExpectedOutput
                          questionData={questionData}
                          activeOutputTab={activeOutputTab}
                          onOutputTabChange={(tab) => setActiveOutputTab(tab)}
                          onImageClick={(src, title) => openModal('image', src, title)}
                          onVideoClick={(src, title) => openModal('video', src, title)}
                        />
                        
                        {/* Content with Scrollbar */}
                        <ExpectedOutputContent
                          questionData={questionData}
                          activeOutputTab={activeOutputTab}
                          onImageClick={(src, title) => openModal('image', src, title)}
                          onVideoClick={(src, title) => openModal('video', src, title)}
                        />
                      </div>
                    </div>
                  </div>


                  {/* ===== CODE EDITOR AND CONTROLS PANEL ===== */}
                  <div className="col-6 lg-8" style={{ height: "100%", display: "flex", flexDirection: "column", width: '55.1%' }}>
                    
                    {/* ===== CODE EDITOR ===== */}
                    <div className="bg-white me-3" style={{ height: "45%", backgroundColor: "#E5E5E533" }}>
                    <div className="border-bottom border-dark p-1 d-flex justify-content-between align-items-center">
                         <div className="d-flex align-items-center" style={{ flex: 1, minWidth: 0 }}>
                           <TabNavigation
                             tabs={questionData?.Tabs || []}
                             activeTab={activeTab}
                             onTabClick={handleTabClickWithClear}
                             showExpandButton={true}
                             onExpandClick={() => setIsMaximized(true)}
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
                              {successMessage && <h5 className={`m-0 ps-1 ${isSuccessMessage(successMessage) ? 'text-success' : 'text-danger'}`} style={{ fontSize: '14px' }}>{successMessage}</h5>}
                              {additionalMessage && <p className={`processingDivParaTag m-0 ps-1 ${isSuccessMessage(successMessage) ? 'text-success' : 'text-danger'}`} style={{ fontSize: "10px" }}>{additionalMessage}</p>}
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
                          <div style={{ flex: 1, maxHeight: "90%", display: "flex", flexDirection: "column" }}>
                            {/* Structure Error Display */}
                            {hasRunCode && activeTab.endsWith('.html') && testResults[activeTab] && testResults[activeTab].length === 0 && structureErrorMessage && (
                              <div className="alert alert-warning m-0 me-3 align-self-center" style={{ fontSize: "12px", padding: "8px 12px", margin: "0 0 10px 0" }}>
                                <strong>HTML Structure Error:</strong>
                                {structureErrorMessage}
                              </div>
                            )}
                            
                            {/* Output iframe */}
                            <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
                              {srcCode ? (
                                <>
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
                                </>
                              ) : (
                                <div className="d-flex align-items-center justify-content-center h-100" style={{ backgroundColor: '#f8f9fa' }}>
                                  <div className="text-center text-muted">
                                    <FontAwesomeIcon icon={faExpand} style={{ fontSize: "48px", opacity: 0.3 }} />
                                    <p className="mt-2">Click RUN to see output</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* ===== TEST CASES SECTION ===== */}
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
                                    // Handle different result types
                                    let displayText = '';
                                    let isPassed = false;
                                    
                                    if (typeof result === 'boolean') {
                                      displayText = `Test Case ${index + 1}`;
                                      isPassed = result;
                                    } else if (typeof result === 'object' && result !== null && 'passed' in result) {
                                      const objResult = result as any;
                                      isPassed = objResult.passed;
                                      
                                      if (objResult.isGrouped && objResult.elementType === 'function') {
                                        // For grouped function test cases, show count
                                        displayText = `Test Case ${index + 1}`;
                                      } else if (objResult.elementType === 'variable') {
                                        displayText = `Test Case ${index + 1}`;
                                      } else if (objResult.elementType === 'function') {
                                        displayText = `Test Case ${index + 1}`;
                                      } else {
                                        displayText = `Test Case ${index + 1}`;
                                      }
                                    } else {
                                      displayText = `Test Case ${index + 1}`;
                                      isPassed = false;
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
                                  {selectedTestCaseIndex !== null && testResults[activeTab][selectedTestCaseIndex] !== undefined && (() => {
                                    const result = testResults[activeTab][selectedTestCaseIndex];
                                    const isJSFile = activeTab.endsWith('.js');
                                    
                                    return (
                                      <div>
                                        {/* Test Case Status */}
                                        <div className="mb-3">
                                          <strong>Status: </strong>
                                          <span className={(() => {
                                            if (typeof result === 'boolean') {
                                              return result ? "text-success" : "text-danger";
                                            } else if (typeof result === 'object' && result !== null && 'passed' in result) {
                                              return (result as any).passed ? "text-success" : "text-danger";
                                            }
                                            return "text-danger";
                                          })()}>
                                            {(() => {
                                              if (typeof result === 'boolean') {
                                                return result ? "Pass" : "Failed";
                                              } else if (typeof result === 'object' && result !== null && 'passed' in result) {
                                                return (result as any).passed ? "Pass" : "Failed";
                                              }
                                              return "Failed";
                                            })()}
                                          </span>
                                        </div>

                                        
                                        {/* For JavaScript files, show test case information */}
                                        {isJSFile && typeof result === 'object' && result !== null && 'elementType' in result && (() => {
                                          const jsResult = result as any;
                                          
                                          // If it's a grouped function result, show nested test cases
                                          if (jsResult.isGrouped && jsResult.elementType === 'function') {
                                            return (
                                              <>
                                                {/* Function Information */}
                                                <div className="mb-3">
                                                  <strong>Function: </strong>
                                                  <span className="text-info">{jsResult.elementName}</span>
                                                  <span className="text-muted ms-2">({jsResult.passedCount}/{jsResult.totalCount} passed)</span>
                                                </div>
                                                
                                                {/* Nested Test Cases */}
                                                <div className="mb-3">
                                                  <strong>Test Cases:</strong>
                                                  <div className="mt-2">
                                                    {jsResult.testCases.map((testCase: any, tcIndex: number) => (
                                                      <div key={tcIndex} className="mb-2 p-2 border rounded" style={{ backgroundColor: testCase.passed ? '#f8f9fa' : '#fff5f5' }}>
                                                        <div className="d-flex justify-content-between align-items-center">
                                                          <span className="fw-bold">Test Case {tcIndex + 1}</span>
                                                          {testCase.passed && (
                                                            <span className="text-success">✓</span>
                                                          )}
                                                        </div>
                                                        
                                                        {/* Show description only for failed test cases */}
                                                        {!testCase.passed && testCase.testCaseDescription && (
                                                          <div className="mt-2">
                                                            <strong>Description: </strong>
                                                            <span className="text-warning">{testCase.testCaseDescription}</span>
                                                          </div>
                                                        )}
                                                        
                                                        {/* Show input and expected output for failed test cases */}
                                                        {!testCase.passed && (
                                                          <>
                                                            {testCase.input && (
                                                              <div className="mt-1">
                                                                <strong>Input: </strong>
                                                                <code>[{testCase.input.join(', ')}]</code>
                                                              </div>
                                                            )}
                                                            {testCase.expectedOutput && (
                                                              <div className="mt-1">
                                                                <strong>Expected: </strong>
                                                                <code>{testCase.expectedOutput}</code>
                                                              </div>
                                                            )}
                                                          </>
                                                        )}
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              </>
                                            );
                                          } else {
                                            // Individual elements (variables, etc.)
                                            return (
                                              <>
                                                {/* Show Element Information only for functions */}
                                                {jsResult.elementType === 'function' && (
                                                  <div className="mb-3">
                                                    <strong>Element: </strong>
                                                    <span className="text-info">{jsResult.elementName}</span>
                                                    <span className="text-muted ms-2">({jsResult.elementType})</span>
                                                  </div>
                                                )}
                                                
                                                {/* Test Case Description (only show if failed) */}
                                                {!jsResult.passed && jsResult.testCaseDescription && (
                                                  <div className="mb-3">
                                                    <strong>Description: </strong>
                                                    <span className="text-warning">{jsResult.testCaseDescription}</span>
                                                  </div>
                                                )}
                                                
                                                {/* Expected Value for Variables */}
                                                {jsResult.elementType === 'variable' && jsResult.expectedValue && (
                                                  <div className="mb-3">
                                                    <strong>Expected Value: </strong>
                                                    <div className="mt-1 p-2" style={{ 
                                                      backgroundColor: "#d4edda", 
                                                      border: "1px solid #c3e6cb", 
                                                      borderRadius: "4px",
                                                      fontSize: "12px",
                                                      fontFamily: "monospace"
                                                    }}>
                                                      {jsResult.expectedValue}
                                                    </div>
                                                  </div>
                                                )}
                                              </>
                                            );
                                          }
                                        })()}
                                        
                                        {/* For non-JavaScript files, show structure and expected */}
                                        {!isJSFile && (
                                          <>
                                            {/* Structure - only for HTML files */}
                                            {activeTab.endsWith('.html') && (
                                              <div className="mb-3">
                                                <strong>Structure: </strong>
                                                <span className={(() => {
                                                  const structureResult = structureResults[activeTab] && structureResults[activeTab][selectedTestCaseIndex];
                                                  if (typeof structureResult === 'boolean') {
                                                    return structureResult ? "text-success" : "text-danger";
                                                  } else if (typeof structureResult === 'object' && structureResult !== null && 'passed' in structureResult) {
                                                    return (structureResult as any).passed ? "text-success" : "text-danger";
                                                  }
                                                  return "text-danger";
                                                })()}>
                                                  {(() => {
                                                    const structureResult = structureResults[activeTab] && structureResults[activeTab][selectedTestCaseIndex];
                                                    if (typeof structureResult === 'boolean') {
                                                      return structureResult ? "Pass" : "Failed";
                                                    } else if (typeof structureResult === 'object' && structureResult !== null && 'passed' in structureResult) {
                                                      return (structureResult as any).passed ? "Pass" : "Failed";
                                                    }
                                                    return "Failed";
                                                  })()}
                                                </span>
                                              </div>
                                            )}
                                            
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
                                                {(() => {
                                                  const result = testResults[activeTab][selectedTestCaseIndex];
                                                  if (typeof result === 'object' && result !== null && 'elementType' in result) {
                                                    const jsResult = result as any;
                                                    if (jsResult.elementType === 'variable') {
                                                      return `let ${jsResult.elementName};`;
                                                    } else if (jsResult.elementType === 'function') {
                                                      return `Function: ${jsResult.elementName}`;
                                                    }
                                                  }
                                                  return questionData?.Code_Validation[activeTab]?.structure?.[selectedTestCaseIndex] ? 
                                                    getExpectedDescription(questionData?.Code_Validation[activeTab].structure?.[selectedTestCaseIndex], activeTab) :
                                                    'Expected result';
                                                })()}
                                              </div>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
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
            {/* Editor area */}
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
                  <ExpectedOutput
                    questionData={questionData}
                    activeOutputTab={activeOutputTab}
                    onOutputTabChange={(tab) => setActiveOutputTab(tab)}
                    onImageClick={(src, title) => openModal('image', src, title)}
                    onVideoClick={(src, title) => openModal('video', src, title)}
                  />

                  <ExpectedOutputContent
                    questionData={questionData}
                    activeOutputTab={activeOutputTab}
                    onImageClick={(src, title) => openModal('image', src, title)}
                    onVideoClick={(src, title) => openModal('video', src, title)}
                  />
                </div>
              </div>
            )}
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
                  tabs={questionData?.Tabs || []}
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

      {/* ===== MODAL FOR IMAGES, VIDEOS, AND OUTPUT ===== */}
      <Modal
        showModal={showModal}
        modalContent={modalContent}
        onClose={closeModal}
      />

    </div>
  );
};

export default HTMLCSSEditor;