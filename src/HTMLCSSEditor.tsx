import React, { useState, useEffect, useCallback, useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExpand } from '@fortawesome/free-solid-svg-icons';
import { getApiClient } from "./utils/apiAuth";
import { useNavigate } from "react-router-dom";
import SkeletonCode from "./Components/EditorSkeletonCode";
import { secretKey } from "./constants";
import { QUESTION_STATUS } from "./constants/constants";
import { getExpectedDescription } from "./utils/htmlCssValidationUtils";
import { useHtmlCssEditorState } from "./utils/useHtmlCssEditorState";
import { Modal, TabNavigation, ExpectedOutput, ExpectedOutputContent } from "./utils/htmlCssEditorComponents";
import { getCodeMirrorExtensions, getCodeMirrorBasicSetup, getCodeMirrorStyle } from "./utils/codeMirrorConfig";
import { getFileType, updateFileContent, handleTabClick, saveCodeToSession } from "./utils/htmlCssFileUtils";
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
} from "./utils/htmlCssEditorUtils";
import CryptoJS from "crypto-js";



const HTMLCSSEditor: React.FC = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [questionData, setQuestionData] = useState<QuestionData | null>(null);
  const [loading, setLoading] = useState(true);
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
  const studentId = decryptSessionValue('StudentId');
  const subjectId = decryptSessionValue('SubjectId');
  const subject = decryptSessionValue('Subject');
  const weekNumber = decryptSessionValue('WeekNumber');
  const dayNumber = decryptSessionValue('DayNumber');
  
  // Check if we're in testing context
  const isTestingContext = window.location.pathname.includes('/testing/coding/');
  
 
 

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        
        // Check if we're in testing context (from SubjectBasedCodingEditor)
        const isTestingContext = window.location.pathname.includes('/testing/coding/');
        
        if (isTestingContext) {
          // In testing mode, load questions from session storage set by SubjectBasedCodingEditor
          const storedQuestions = sessionStorage.getItem('codingQuestions');
          if (storedQuestions) {
            try {
              const questions = JSON.parse(storedQuestions);
              setQuestions(questions);
              
              // Set initial question index from session storage or default to 0
              const storedIndex = sessionStorage.getItem("currentQuestionIndex");
              const initialIndex = storedIndex ? 
                Math.max(0, Math.min(parseInt(storedIndex) || 0, questions.length - 1)) : 0;
              
              setCurrentQuestionIndex(initialIndex);
              
              // Set current question based on stored index
              if (questions.length > 0) {
                const currentQuestion = questions[initialIndex];
                setQuestionData(currentQuestion);
                
                // Initialize file contents from Code_Validation
                const fileContents: {[key: string]: string} = {};
                
                // Process each file in Code_Validation
                Object.keys(currentQuestion.Code_Validation).forEach(fileName => {
                  if (fileName === 'index.html') {
                    const defaultTemplate = currentQuestion.Template || currentQuestion.defaulttemplate || '';
                    fileContents[fileName] = defaultTemplate;
                  } else {
                    // Other files start empty
                    fileContents[fileName] = '';
                  }
                });
                setFileContents(fileContents);
                
                // Set active tab to the first file
                if (currentQuestion.Tabs.length > 0) {
                  setActiveTab(currentQuestion.Tabs[0].name);
                }
              }
            } catch (error) {
              console.error('Error loading questions from session storage:', error);
            }
          }
          setLoading(false);
          return;
        }
        
        // Only fetch from practice coding API in non-testing mode
        const url = `${process.env.REACT_APP_BACKEND_URL}api/student/practicecoding/` +
          `${studentId}/` +
          `${subject}/` +
          `${subjectId}/` +
          `${dayNumber}/` +
          `${weekNumber}/` +
          `${sessionStorage.getItem("currentSubTopicId")}/`;
        
        const response = await getApiClient().get(url);
        const apiQuestions = response.data.questions;
        const questionsWithSavedCode = apiQuestions.map((q: any) => {
          // Check for saved code in session storage
          const savedCodeKey = `userCode_${subject}_${weekNumber}_${dayNumber}_${q.Qn_name}`;
          const savedCode = sessionStorage.getItem(savedCodeKey);
          let savedFileContents: {[key: string]: string} = {};
          
          if (savedCode) {
            try {
              const decryptedCode = CryptoJS.AES.decrypt(savedCode, secretKey).toString(CryptoJS.enc.Utf8);
              savedFileContents = JSON.parse(decryptedCode);
            } catch (error) {
              console.error('Error decrypting saved code:', error);
            }
          }
          
          // Determine tabs dynamically from API or use default
          const tabs = q.Tabs || [
            { name: "index.html", type: "HTML" },
            { name: "styles.css", type: "CSS" }
          ];
          
          // Build Code_Validation dynamically
          const codeValidation: {[key: string]: any} = {};
          tabs.forEach((tab: any) => {
            const fileName = tab.name;
            codeValidation[fileName] = {
              template: ""
            };
          });
          
          return {
            Qn_name: q.Qn_name,
            Page_Name: q.Page_Name || "HTML/CSS Question",
            level: q.level || "level1",
            subtopic_id: q.subtopic_id || "",
            type: q.type || "coding",
            Tabs: tabs,
            Qn: q.Qn || q.question || "",
            requirements: q.requirements || "",
            Code_Validation: q.Code_Validation || codeValidation,
            defaulttemplate: q.defaulttemplate || "",
            image_path: q.image_path || "",
            video_path: q.video_path || "",
            CreatedBy: q.CreatedBy || "",
            CreatedOn: q.CreatedOn || "",
            LastUpdated: q.LastUpdated || "",
            status: q.status || false,
            entered_ans: q.entered_ans || {},
            image_urls: q.image_urls || []
          };
        });
        
        setQuestions(questionsWithSavedCode);
        
        // Set initial question index from session storage or default to 0
        const storedIndex = sessionStorage.getItem("currentQuestionIndex");
        const initialIndex = storedIndex ? 
          Math.max(0, Math.min(parseInt(storedIndex) || 0, questionsWithSavedCode.length - 1)) : 0;
        
        setCurrentQuestionIndex(initialIndex);
        
        // Set current question based on stored index
        if (questionsWithSavedCode.length > 0) {
          const currentQuestion = questionsWithSavedCode[initialIndex];
          setQuestionData(currentQuestion);
          const submitStatusKey = `submitStatus_${studentId}_${subject}_${weekNumber}_${dayNumber}_${currentQuestion.Qn_name}`;
          const encryptedSubmitStatus = sessionStorage.getItem(submitStatusKey);
          const isSubmittedStatus = encryptedSubmitStatus ? 
            CryptoJS.AES.decrypt(encryptedSubmitStatus, secretKey).toString(CryptoJS.enc.Utf8) === 'true' : false;
          
          if (currentQuestion.status === true || isSubmittedStatus) {
            setIsSubmitted(true);
            setHasRunCode(true);
          }
          
          // Initialize file contents from Code_Validation
          const fileContents: {[key: string]: string} = {};
          
          // Process each file in Code_Validation
          Object.keys(currentQuestion.Code_Validation).forEach(fileName => {
            // Check if question is submitted and has entered_ans
            if (currentQuestion.status === true && currentQuestion.entered_ans && currentQuestion.entered_ans[fileName]) {
              fileContents[fileName] = currentQuestion.entered_ans[fileName];
            } else if (fileName === 'index.html') {
              const defaultTemplate = currentQuestion.Template || currentQuestion.defaulttemplate || '';
              fileContents[fileName] = defaultTemplate;
            } else {
              // Other files start empty if not submitted
              fileContents[fileName] = '';
            }
          });
          
          // Check session storage first for auto-saved code
          const sessionKey = isTestingContext 
            ? `testing_userCode_${currentQuestion.Qn_name}` 
            : `userCode_${subject}_${weekNumber}_${dayNumber}_${currentQuestion.Qn_name}`;
          const encryptedSessionCode = sessionStorage.getItem(sessionKey);
          
          if (encryptedSessionCode && !currentQuestion.status && !isSubmittedStatus) {
            // Load from session storage if available and question is not submitted
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
          } else if (!currentQuestion.status && !isSubmittedStatus && !isTestingContext) {
            // Only fetch from backend if no session storage data AND question is not submitted AND not in testing mode
            try {
              const autoSavedCode = await loadAutoSavedCode(currentQuestion, sessionKey, studentId, QUESTION_STATUS.PRACTICE, false);
                // Merge auto-saved code with current file contents
                Object.keys(autoSavedCode).forEach(fileName => {
                  if (fileContents.hasOwnProperty(fileName)) {
                    fileContents[fileName] = autoSavedCode[fileName];
                  }
                });
            } catch (error) {
              console.error('Error loading auto-saved code from backend:', error);
            }
          }
          
          setFileContents(fileContents);
          
          // Set active tab to the first file
          if (currentQuestion.Tabs.length > 0) {
            setActiveTab(currentQuestion.Tabs[0].name);
          }
        }
      } catch (error) {
        console.error("Error fetching questions:", error);
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [studentId, subject, subjectId, dayNumber, weekNumber, isTestingContext]);



  const handleQuestionChange = async (index: number) => {
    if (index >= 0 && index < questions.length) {
      const question = questions[index];
      setQuestionData(question);
      setCurrentQuestionIndex(index);
      
      // Reset output tab to image (default)
      setActiveOutputTab('image');
      
      // Save current question index to session storage
      sessionStorage.setItem("currentQuestionIndex", index.toString());
      
      // Check if question is already submitted
        const submitStatusKey = `submitStatus_${studentId}_${subject}_${weekNumber}_${dayNumber}_${question.Qn_name}`;
        const encryptedSubmitStatus = sessionStorage.getItem(submitStatusKey);
        const isSubmittedStatus = encryptedSubmitStatus ? 
          CryptoJS.AES.decrypt(encryptedSubmitStatus, secretKey).toString(CryptoJS.enc.Utf8) === 'true' : false;
        
      const isSubmitted = question.status === true || isSubmittedStatus;
      
      // Load file contents using shared utility
      const sessionKey = isTestingContext 
        ? `testing_userCode_${question.Qn_name}` 
        : `userCode_${subject}_${weekNumber}_${dayNumber}_${question.Qn_name}`;
      let fileContents: {[key: string]: string} = {};
      
      if (isTestingContext) {
        // In testing mode, initialize file contents without API calls
        Object.keys(question.Code_Validation).forEach(fileName => {
          if (fileName === 'index.html') {
              const defaultTemplate = question.Template || question.defaulttemplate || '';
              fileContents[fileName] = defaultTemplate;
          } else {
            fileContents[fileName] = '';
          }
        });
        
        // Check session storage for auto-saved code in testing mode
        const encryptedSessionCode = sessionStorage.getItem(sessionKey);
        if (encryptedSessionCode && !isSubmitted) {
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
            console.error('Error loading testing session storage code:', error);
          }
        }
      } else {
        // In practice mode, use the normal loadAutoSavedCode function
        fileContents = await loadAutoSavedCode(question, sessionKey, studentId, QUESTION_STATUS.PRACTICE, isSubmitted);
      }
      
      setFileContents(fileContents);
      
      // Set active tab to the first file
      if (question.Tabs.length > 0) {
        setActiveTab(question.Tabs[0].name);
      }
      
      // Set submission status
      if (isSubmitted) {
         setIsSubmitted(true);
         setHasRunCode(true);
       } else {
         setSubmittedFiles({});
         setIsSubmitted(false);
         setHasRunCode(false);
       }
       
       // Clear editor instances to ensure fresh state
       setEditorInstances({});
       
       // Reset test results for new question
       setTestResults({});
       setStructureResults({});
       setSelectedTestCaseIndex(null);
       setActiveSection('output');
       
       // Clear all messages and status for new question
       setSuccessMessage('');
       setAdditionalMessage('');
       setStructureErrorMessage('');
     }
   };




  
  const onChangeFileContent = useCallback((value: string, viewUpdate: any) => {
    updateFileContent(activeTab, value);
    
    // Auto-save code to session storage only if not submitted
    if (questionData && !isSubmitted) {
      // Create a dynamic object with all current file contents
      const codeToSave: {[key: string]: string} = {};
      
      // Add all current file contents
      Object.keys(fileContents).forEach(fileName => {
        codeToSave[fileName] = fileContents[fileName] || '';
      });
      
      // Update the current file content before saving
      codeToSave[activeTab] = value;
      
      // Check if we're in testing context and use appropriate session key format
      const isTestingContext = window.location.pathname.includes('/testing/coding/');
      const sessionKey = isTestingContext 
        ? `testing_userCode_${questionData.Qn_name}` 
        : `userCode_${subject}_${weekNumber}_${dayNumber}_${questionData.Qn_name}`;
      saveCodeToSession(codeToSave, sessionKey);
    }
  }, [activeTab, fileContents, questionData, isSubmitted, subject, weekNumber, dayNumber]);

  // Custom handleTabClick that clears status messages
  const handleTabClickWithClear = createTabClickWithClear(
    handleTabClick,
    setSuccessMessage,
    setAdditionalMessage,
    setStructureErrorMessage
  );





  const handleCheckCode = async () => {
    // If maximized, return to normal view when RUN is clicked
    if (isMaximized) {
      setIsMaximized(false);
    }
    setActiveSection('output');
    
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
      
      // Auto-save code when running (only in practice mode)
      if (!isTestingContext) {
        await autoSaveCode(fileContents, questionData.Qn_name, studentId, QUESTION_STATUS.PRACTICE, isSubmitted);
      }
      
      setSelectedTestCaseIndex(0);
      
      // Calculate success rate and set messages
      const successRate = calculateSuccessRate(results);
      setValidationMessages(successRate, setSuccessMessage, setAdditionalMessage);
    }
  };
  

  const renderEditor = () => {
    const fileType = getFileType(activeTab);
    const currentContent = getCurrentFileContent();
    const extensions = getCodeMirrorExtensions(fileType, 'Write your code here');
    
        return (
          <CodeMirror
            key={`${activeTab}-${currentQuestionIndex}`} // Unique key for each file and question
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
    return generateOutputCode(fileContents, questionData?.image_urls);
  }, [fileContents, questionData?.image_urls]);


  // Cleanup effect to restore body scroll on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

      const handleSubmit = async () => {
        setProcessing(true);
        const url = `${process.env.REACT_APP_BACKEND_URL}api/student/frontend/submit/`;
        
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
          
          // Get additional required fields from session storage
          const encryptedBatchId = sessionStorage.getItem('BatchId');
          const decryptedBatchId = encryptedBatchId ? 
            CryptoJS.AES.decrypt(encryptedBatchId, secretKey).toString(CryptoJS.enc.Utf8) : 'batch4';
          
          const encryptedCourseId = sessionStorage.getItem('CourseId');
          const decryptedCourseId = encryptedCourseId ? 
            CryptoJS.AES.decrypt(encryptedCourseId, secretKey).toString(CryptoJS.enc.Utf8) : 'course1';
          
          const postData = {
            student_id: studentId,
            question_id: questionData?.Qn_name,
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
    
          const response = await getApiClient().post(
            url,
            postData
          );
    
          const responseData = response.data;
          
          // Check if submission was successful based on API response status
          if (responseData.status === true) {
            // Mark as submitted only if API confirms success
            setIsSubmitted(true);
            const submitStatusKey = `submitStatus_${studentId}_${subject}_${weekNumber}_${dayNumber}_${questionData?.Qn_name}`;
            const encryptedSubmitStatus = CryptoJS.AES.encrypt("true", secretKey).toString();
            sessionStorage.setItem(submitStatusKey, encryptedSubmitStatus);

            // Update question status in the questions array
            const updatedQuestions = [...questions];
            if (updatedQuestions[currentQuestionIndex]) {
              updatedQuestions[currentQuestionIndex].status = true;
              setQuestions(updatedQuestions);
            }

            // Clean up auto-saved code after successful submission
            await cleanupAfterSubmission(questionData?.Qn_name!, studentId, QUESTION_STATUS.PRACTICE);

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



      if (loading) {
        return (
          <div className="container-fluid p-0" style={{ height: "100vh", maxWidth: "100%", overflowX: "hidden", backgroundColor: "#f2eeee" }}>
            <div className="p-0 my-0 me-2" style={{ backgroundColor: "#F2EEEE" }}>
              <SkeletonCode />
            </div>
          </div>
        );
      }
      

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
                             
                              dangerouslySetInnerHTML={{ __html: questionData?.requirements || 'No requirements specified.' }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* ===== THIRD ROW - EXPECTED OUTPUT (50%) ===== */}
                      <div style={{ height: "50%", display: "flex", flexDirection: "column" }}>
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
                    <div className="border-bottom border-dark p-2 d-flex justify-content-between align-items-center">
                      <TabNavigation
                        tabs={questionData?.Tabs || []}
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

                    {/* ===== PROCESSING STATUS AND ACTION BUTTONS ===== */}
                    <div style={{ height: "6%", marginRight: '37px', backgroundColor: "#E5E5E533" }} className="d-flex flex-column justify-content-center me-4 pe-3">
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
                          
                          {/* Submit Code Button - only show if not in testing context */}
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
                          
                          {/* Next Button - show after submit in practice mode, or after run in testing mode */}
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
                              onClick={() => {
                                if (currentQuestionIndex < questions.length - 1) {
                                  handleQuestionChange(currentQuestionIndex + 1);
                                } else {
                                  navigate('/Subject-Roadmap', { replace: true });
                                }
                              }}
                            >
                              {currentQuestionIndex < questions.length - 1 ? "NEXT" : "FINISH"}
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
                                        {/* Show element name based on file type */}
                                        {(() => {
                                          const structure = questionData?.Code_Validation[activeTab]?.structure;
                                          const currentStructure = structure && structure[selectedTestCaseIndex];
                                          
                                          if (activeTab.endsWith('.html') && currentStructure) {
                                            // Check if test case passed or failed
                                            const isPassed = typeof result === 'boolean' ? result : 
                                              (typeof result === 'object' && result !== null && 'passed' in result ? (result as any).passed : false);
                                            
                                            return (
                                              <div className="mb-3">
                                                {isPassed ? (
                                                  <>
                                                    <strong>Tag: </strong>
                                                    <span className="text-dark">{currentStructure.tag}</span>
                                                  </>
                                                ) : (
                                                  <span className="text-danger">Error with {currentStructure.tag} tag</span>
                                                )}
                                              </div>
                                            );
                                          } else if (activeTab.endsWith('.css') && currentStructure) {
                                            // Check if test case passed or failed
                                            const isPassed = typeof result === 'boolean' ? result : 
                                              (typeof result === 'object' && result !== null && 'passed' in result ? (result as any).passed : false);
                                            
                                            return (
                                              <div className="mb-3">
                                                {isPassed ? (
                                                  <>
                                                    <strong>Selector: </strong>
                                                    <span className="text-dark">{currentStructure.selector}</span>
                                                  </>
                                                ) : (
                                                  <span className="text-danger">Error with {currentStructure.selector} selector</span>
                                                )}
                                              </div>
                                            );
                                          } else if (isJSFile && typeof result === 'object' && result !== null && 'elementType' in result) {
                                            const jsResult = result as any;
                                            return (
                                              <div className="mb-3">
                                                <strong>Element: </strong>
                                                <span className="text-dark">{jsResult.elementName}</span>
                                                <span className="text-muted ms-2">({jsResult.elementType})</span>
                                              </div>
                                            );
                                          }
                                          return null;
                                        })()}

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

                                        {/* For JavaScript files, show simplified test case information */}
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
                                                          {testCase.passed ? (
                                                            <span className="text-success">✓</span>
                                                          ) : (
                                                            <span className="text-danger">✗</span>
                                                          )}
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              </>
                                            );
                                          }
                                          return null;
                                        })()}
                                        
                                        {/* For non-JavaScript files, show structure information */}
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
                        dangerouslySetInnerHTML={{ __html: questionData?.requirements || 'No requirements specified.' }}
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
                  <div className="p-2 d-flex justify-content-between align-items-center" style={{ borderBottom: "1px solid #e9ecef" }}>
                    <h5 className="m-0" style={{ fontSize: "16px", fontWeight: "600" }}>
                    Expected Output
                  </h5>
                    {/* Image and Video buttons - only show if both are available */}
                    {questionData?.image_path && questionData?.video_path && (
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
                    )}
                  </div>

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
                        src={questionData.image_path} 
                        className="img-fluid" 
                        alt="Expected Output" 
                        style={{ 
                          cursor: 'pointer',
                          maxWidth: '100%',
                          height: 'auto',
                          borderRadius: '4px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        onClick={() => openModal('image', questionData.image_path, 'Expected Output')}
                      />
                    )}

                    {/* Show video if it's the active tab or if no image is available */}
                    {((questionData?.image_path && questionData?.video_path && activeOutputTab === 'video') || 
                      (!questionData?.image_path && questionData?.video_path)) && (
                      <video 
                        src={questionData.video_path} 
                        className="img-fluid" 
                        controls
                        style={{ 
                          cursor: 'pointer',
                          maxWidth: '100%',
                          height: 'auto',
                          borderRadius: '4px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        onClick={() => openModal('video', questionData.video_path, 'Expected Output Video')}
                      />
                    )}

                    {/* Show message if neither image nor video is available */}
                    {!questionData?.image_path && !questionData?.video_path && (
                      <div className="text-center text-muted" style={{ padding: "20px" }}>
                        <FontAwesomeIcon icon={faExpand} style={{ fontSize: "48px", opacity: 0.3 }} />
                        <p className="mt-2">No expected output available</p>
                      </div>
                    )}
                  </div>
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
                    maxWidth: '100%'
                  }}
                >
                  {questionData?.Tabs.map((tab, index) => (
                    <button
                      key={index}
                      className={`btn me-2 ${activeTab === tab.name ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleTabClickWithClear(tab.name)}
                      style={{ 
                        fontSize: "12px", 
                        padding: "4px 8px",
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                      title={tab.name}
                    >
                      {tab.name}
                    </button>
                  ))}
                </div>
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