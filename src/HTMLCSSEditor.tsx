import React, { useState, useEffect,  useCallback, ChangeEvent, MouseEvent as ReactMouseEvent } from "react";
import { Button, Modal } from "react-bootstrap";
import CodeMirror from "@uiw/react-codemirror";
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faCircleXmark, faExpand } from '@fortawesome/free-solid-svg-icons';
import { getApiClient } from "./utils/apiAuth";
import { useNavigate } from "react-router-dom";
import SkeletonCode from "./Components/EditorSkeletonCode"
import { secretKey } from "./constants";
import CryptoJS from "crypto-js";
import HTMLCSSQuestionData from "./HTMLCSSQuestion.json";

interface Tab {
  name: string;
  type: string;
}

interface CodeValidation {
  [key: string]: {
    Ans: string;
    messages: string[];
    template: string;
    structure: any[];
  };
}

interface QuestionData {
  Qn_name: string;
  Page_Name: string;
  level: string;
  subtopic_id: string;
  type: string;
  Tabs: Tab[];
  Qn: string;
  Code_Validation: CodeValidation;
  defaulttemplate: string;
  image_path: string;
  video_path: string;
  CreatedBy: string;
  CreatedOn: string;
  LastUpdated: string;
}

interface QuestionDataWrapper {
  questions: QuestionData[];
}

const HTMLCSSEditor: React.FC = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [questionData, setQuestionData] = useState<QuestionData | null>(null);
  const [fileContents, setFileContents] = useState<{[key: string]: string}>({});
  const [activeTab, setActiveTab] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [displ, setdispl] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [validationStatus, setValidationStatus] = useState<{[key: string]: number[]}>({});
  const [splitOffset, setSplitOffset] = useState(window.innerWidth / 2);
  const [isDragging, setIsDragging] = useState(false);
  const [initialX, setInitialX] = useState<number | null>(null);
  const [editorHeightPercentage, setEditorHeightPercentage] = useState(45);
  const [outputHeightPercentage, setOutputHeightPercentage] = useState(45);
  const [isDraggingVertically, setIsDraggingVertically] = useState(false);
  const [initialY, setInitialY] = useState<number | null>(null);
  const [DOMSTR, setDOMSTR] = useState('HTML DOM structure');
  const [DOMTRUE, setDOMTRUE] = useState(false);
  const [submittedFiles, setSubmittedFiles] = useState<{[key: string]: boolean}>({});
  const [processing, setProcessing] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [additionalMessage, setAdditionalMessage] = useState<string>('');
  const [editorInstances, setEditorInstances] = useState<{[key: string]: any}>({});
  const [isMaximized, setIsMaximized] = useState(false);
  const [showRequirement, setShowRequirement] = useState(false);
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
  
  const actualStudentId= CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualEmail= CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualName= CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);
 
 

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        
        // Check if SubjectHtml is in session storage - if so, use hardcoded JSON data
        const encryptedSubjectHtml = sessionStorage.getItem("SubjectHtml");
        let useHardcodedData = false;
        
        if (encryptedSubjectHtml) {
          try {
            const decryptedSubjectHtml = CryptoJS.AES.decrypt(encryptedSubjectHtml, secretKey).toString(CryptoJS.enc.Utf8);
            if (decryptedSubjectHtml.toLowerCase().includes("html")) {
              useHardcodedData = true;
            }
      } catch (error) {
            console.error("Error decrypting SubjectHtml:", error);
          }
        }
        
        if (useHardcodedData) {
          // Use hardcoded JSON data
          const data: QuestionDataWrapper = HTMLCSSQuestionData;
          setQuestions(data.questions);
          
          if (data.questions.length > 0) {
            const firstQuestion = data.questions[0];
            setQuestionData(firstQuestion);
            setCurrentQuestionIndex(0);
            
            const fileContents: {[key: string]: string} = {};
            const validationStatus: {[key: string]: number[]} = {};
            
            Object.keys(firstQuestion.Code_Validation).forEach(fileName => {
              const fileData = firstQuestion.Code_Validation[fileName];
               fileContents[fileName] = fileData.template || '';
              validationStatus[fileName] = [];
            });
            
            setFileContents(fileContents);
            setValidationStatus(validationStatus);
            
            if (firstQuestion.Tabs.length > 0) {
              setActiveTab(firstQuestion.Tabs[0].name);
            }
          }
          setLoading(false);
          return;
        }
        
        // Construct API URL with all necessary parameters
        const url = `${process.env.REACT_APP_BACKEND_URL}api/student/practicecoding/` +
          `${studentId}/` +
          `${subject}/` +
          `${subjectId}/` +
          `${dayNumber}/` +
          `${weekNumber}/` +
          `${sessionStorage.getItem("currentSubTopicId")}/`;
        
        const response = await getApiClient().get(url);
        const apiQuestions = response.data.questions;
        
        // Transform API questions to match our expected format
        const transformedQuestions = apiQuestions.map((q: any) => {
          // Check for saved code in session storage
          const savedCodeKey = `htmlcss_${q.Qn_name}`;
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
              structure: [],
              messages: [],
              template: "",
               Ans: "" // Don't load answer - let students write from scratch
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
            Code_Validation: q.Code_Validation || codeValidation,
            defaulttemplate: q.defaulttemplate || "<html>\n  \n</html>",
            image_path: q.image_path || "",
            video_path: q.video_path || "",
            CreatedBy: q.CreatedBy || "",
            CreatedOn: q.CreatedOn || "",
            LastUpdated: q.LastUpdated || ""
          };
        });
        
        setQuestions(transformedQuestions);
        
        // Set current question to first one
        if (transformedQuestions.length > 0) {
          const firstQuestion = transformedQuestions[0];
          setQuestionData(firstQuestion);
          setCurrentQuestionIndex(0);
          
          // Initialize file contents from Code_Validation
          const fileContents: {[key: string]: string} = {};
          const validationStatus: {[key: string]: number[]} = {};
          
          // Process each file in Code_Validation
          Object.keys(firstQuestion.Code_Validation).forEach(fileName => {
            const fileData = firstQuestion.Code_Validation[fileName];
               fileContents[fileName] = fileData.template || '';
            validationStatus[fileName] = [];
          });
          
          setFileContents(fileContents);
          setValidationStatus(validationStatus);
          
          // Set active tab to the first file
          if (firstQuestion.Tabs.length > 0) {
            setActiveTab(firstQuestion.Tabs[0].name);
          }
        }
      } catch (error) {
        console.error("Error fetching questions:", error);
        // Fallback to local JSON data if API fails
        try {
          const data: QuestionDataWrapper = HTMLCSSQuestionData;
          setQuestions(data.questions);
          
          if (data.questions.length > 0) {
            const firstQuestion = data.questions[0];
            setQuestionData(firstQuestion);
            setCurrentQuestionIndex(0);
            
            const fileContents: {[key: string]: string} = {};
            const validationStatus: {[key: string]: number[]} = {};
            
            Object.keys(firstQuestion.Code_Validation).forEach(fileName => {
              const fileData = firstQuestion.Code_Validation[fileName];
               fileContents[fileName] = fileData.template || '';
              validationStatus[fileName] = [];
            });
            
            setFileContents(fileContents);
            setValidationStatus(validationStatus);
            
            if (firstQuestion.Tabs.length > 0) {
              setActiveTab(firstQuestion.Tabs[0].name);
            }
          }
        } catch (fallbackError) {
          console.error("Error loading fallback data:", fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [studentId, subject, subjectId, dayNumber, weekNumber]);

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setInitialX(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !initialX) return;
    const dx = e.clientX - initialX;
    setSplitOffset(splitOffset + dx);
    setInitialX(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setInitialX(null);
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, initialX]);

  const handleVerticalMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    setIsDraggingVertically(true);
    setInitialY(e.clientY);
  };

  const handleVerticalMouseMove = (e: MouseEvent) => {
    if (!isDraggingVertically || !initialY) return;

    const dy = e.clientY - initialY;
    const vhUnitChange = (dy / window.innerHeight) * 100;

    setEditorHeightPercentage((prevHeight) => {
      const newHeight = Math.max(30, Math.min(70, prevHeight + vhUnitChange));
      setOutputHeightPercentage(94 - newHeight);
      return newHeight;
    });

    setInitialY(e.clientY);
  };

  const handleVerticalMouseUp = () => {
    setIsDraggingVertically(false);
    setInitialY(null);
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleVerticalMouseMove);
    window.addEventListener('mouseup', handleVerticalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleVerticalMouseMove);
      window.removeEventListener('mouseup', handleVerticalMouseUp);
    };
  }, [isDraggingVertically, initialY]);

  const handleTabClick = (fileName: string) => {
    setActiveTab(fileName);
    // Force re-render of editor by clearing the instance for this file
    setEditorInstances(prev => {
      const newInstances = { ...prev };
      delete newInstances[fileName];
      return newInstances;
    });
  };

  const handleQuestionChange = (index: number) => {
    if (index >= 0 && index < questions.length) {
      const question = questions[index];
      setQuestionData(question);
      setCurrentQuestionIndex(index);
      
      // Initialize file contents from Code_Validation
      const fileContents: {[key: string]: string} = {};
      const validationStatus: {[key: string]: number[]} = {};
      
      // Process each file in Code_Validation
      Object.keys(question.Code_Validation).forEach(fileName => {
        const fileData = question.Code_Validation[fileName];
               fileContents[fileName] = fileData.template || '';
        validationStatus[fileName] = [];
      });
      
      setFileContents(fileContents);
      setValidationStatus(validationStatus);
      
      // Set active tab to the first file
      if (question.Tabs.length > 0) {
        setActiveTab(question.Tabs[0].name);
      }
      
       // Reset submission status
       setSubmittedFiles({});
       
       // Clear editor instances to ensure fresh state
       setEditorInstances({});
     }
   };

  // Helper function to get file type based on extension
  const getFileType = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension || 'text';
  };

  // Helper function to get current file content
  const getCurrentFileContent = (): string => {
    return fileContents[activeTab] || '';
  };

  // Helper function to update file content
  const updateFileContent = (fileName: string, content: string) => {
    setFileContents(prev => ({
      ...prev,
      [fileName]: content
    }));
  };

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleCloseAlert = () => {
    setShowAlert(false);
    setdispl('');
  };

  const handleImgView = () => {
    setdispl('image');
    setShowAlert(true);
  };

  const Handlepreview = () => {
    setdispl('output');
    setShowAlert(true);
  };

  
  const onChangeFileContent = useCallback((value: string, viewUpdate: any) => {
    updateFileContent(activeTab, value);
    
    // Auto-save code to session storage
    if (questionData) {
      // Create a dynamic object with all current file contents
      const codeToSave: {[key: string]: string} = {};
      
      // Add all current file contents
      Object.keys(fileContents).forEach(fileName => {
        codeToSave[fileName] = fileContents[fileName] || '';
      });
      
      // Update the current file content before saving
      codeToSave[activeTab] = value;
      
      const encryptedCode = CryptoJS.AES.encrypt(JSON.stringify(codeToSave), secretKey).toString();
      sessionStorage.setItem(`htmlcss_${questionData.Qn_name}`, encryptedCode);
    }
    
    // Remove automatic validation - only validate on RUN button click
  }, [activeTab, fileContents, questionData]);

  const handleCheckCode = () => {
    const codeToTest = getCurrentFileContent();
    const fileType = getFileType(activeTab);
    setSuccessMessage('');
    setAdditionalMessage('');
    sendDataToCheck(fileType, codeToTest);
    
    // If maximized, return to normal view when RUN is clicked
    if (isMaximized) {
      setIsMaximized(false);
    }
  };

  const sendDataToCheck = (type: string, code: string) => {
    // Validation logic will be implemented here
    console.log(`Validating ${type} code:`, code);
    
    // Set success message for now (placeholder)
    setSuccessMessage('Code validated successfully');
    setAdditionalMessage('Your code has been checked. Click Submit to save your work.');
  };
  

  const renderEditor = () => {
    const fileType = getFileType(activeTab);
    const currentContent = getCurrentFileContent();
    
    let extensions: any[] = [];
    if (fileType === 'html') {
      extensions = [html()];
    } else if (fileType === 'css') {
      extensions = [css()];
    }
    
        return (
          <CodeMirror
        key={activeTab} // This ensures a new instance for each file
            className="text-xl text-start custom-codemirror"
        value={currentContent}
            height="100%"
        extensions={extensions}
        onChange={onChangeFileContent}
            style={{ backgroundColor: 'white', overflow: 'auto' }}
        basicSetup={{
          history: true, // Enable undo/redo for each instance
          lineNumbers: true,
          foldGutter: true,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          highlightSelectionMatches: true
        }}
      />
    );
  };

  // Generate output code - always use index.html as the main file
  const generateOutputCode = () => {
    const htmlContent = fileContents['index.html'] || '';
    
    // Get all CSS files dynamically
    const cssFiles = Object.keys(fileContents).filter(fileName => 
      fileName.endsWith('.css')
    );
    
    // Combine all CSS content
    const allCssContent = cssFiles.map(fileName => fileContents[fileName] || '').join('\n');
    
    return `
      ${htmlContent.replace('</body>', '').replace('</html>', '')}
      <style>${allCssContent}</style>
    </body>
    </html>
  `;
  };

  const srcCode = generateOutputCode();

      const handleSubmit = async () => {
        setProcessing(true);
    const url=`${process.env.REACT_APP_BACKEND_URL}api/student/coding/`
        try {
          // Get HTML content (always from index.html)
          const htmlContent = fileContents['index.html'] || '';
          
          // Get all CSS files dynamically
          const cssFiles = Object.keys(fileContents).filter(fileName => 
            fileName.endsWith('.css')
          );
          const cssContent = cssFiles.map(fileName => fileContents[fileName] || '').join('\n');
          
          const postData = {
            student_id: studentId,
            week_number: weekNumber,
            day_number: dayNumber,
            subject: subject,
            subject_id: subjectId,
            Qn: questionData?.Qn_name || "htmlcss_question",
            final_score: "14/19",
            Ans: htmlContent,
            CSS_Ans: cssContent,
            Result: "",
            Attempt: 0
          };
    
          const response = await getApiClient().put(
            url,
            postData
          );
    
          const responseData = response.data;
          
          // Mark all files as submitted
          const newSubmittedFiles: {[key: string]: boolean} = {};
          Object.keys(fileContents).forEach(fileName => {
            newSubmittedFiles[fileName] = true;
          });
          setSubmittedFiles(newSubmittedFiles);

     
        } catch (error) {
          console.error("Error submitting code:", error);
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
    <div className="container-fluid p-0" style={{ height: 'calc(100vh)', overflowX: "hidden", overflowY: "hidden", backgroundColor: "#f2eeee" }}>
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
                    <div className="bg-white" style={{ height: "100%", backgroundColor: "#E5E5E533", display: "flex", flexDirection: "column" }}>
                      
                      {/* ===== FIRST ROW - PROBLEM STATEMENT ===== */}
                      <div style={{ height: "50%", display: "flex", flexDirection: "column", borderBottom: "2px solid #dee2e6" }}>
                        {/* Page Name */}
                        <div className="p-2" style={{ borderBottom: "1px solid #e9ecef" }}>
                          <h6 className="m-0 text-muted text-center fs-5">
                            {questionData?.Page_Name || "HTML/CSS Question"}
                          </h6>
                        </div>
                        
                        {/* Problem Statement Header */}
                        <div className="p-2" style={{ borderBottom: "1px solid #e9ecef" }}>
                          <h5 className="m-0" style={{ fontSize: "16px", fontWeight: "600" }}>
                            Problem Statement
                          </h5>
                            </div>
                        
                        {/* Question Content with Scrollbar */}
                        <div 
                          className="flex-fill overflow-auto p-3"
                          style={{ 
                            scrollbarWidth: "thin",
                            scrollbarColor: "#c1c1c1 #f1f1f1"
                          }}
                        >
                          <div 
                            style={{ 
                              whiteSpace: "pre-wrap", 
                              wordBreak: "break-word",
                              fontFamily: "inherit",
                              lineHeight: "1.5",
                              fontSize: "14px"
                            }} 
                            dangerouslySetInnerHTML={{ __html: questionData?.Qn || '' }}
                          />
                        </div>
                            </div>
                      
                      {/* ===== SECOND ROW - EXPECTED OUTPUT ===== */}
                      <div style={{ height: "50%", display: "flex", flexDirection: "column" }}>
                        {/* Expected Output Header */}
                        <div className="p-2" style={{ borderBottom: "1px solid #e9ecef" }}>
                          <div className='d-flex justify-content-between align-items-center'>
                            <h5 className="m-0" style={{ fontSize: "16px", fontWeight: "600" }}>
                              Expected Output
                            </h5>
                        </div>
                                        </div>
                        
                        {/* Image Content with Scrollbar */}
                        <div 
                          className="flex-fill overflow-auto p-3 d-flex justify-content-center align-items-start"
                          style={{ 
                            scrollbarWidth: "thin",
                            scrollbarColor: "#c1c1c1 #f1f1f1"
                          }}
                        >
                          {questionData?.image_path ? (
                            <img 
                              src={questionData.image_path} 
                              className="img-fluid" 
                              alt="Expected Output" 
                              style={{ 
                                pointerEvents: 'none', 
                                maxWidth: '100%',
                                height: 'auto',
                                borderRadius: '4px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                              }} 
                            />
                          ) : (
                            <div className="text-center text-muted" style={{ padding: "20px" }}>
                              <FontAwesomeIcon icon={faExpand} style={{ fontSize: "48px", opacity: 0.3 }} />
                              <p className="mt-2">No expected output image available</p>
                            </div>
                          )}
                        </div>
                        </div>
                    </div>
                  </div>


                  {/* ===== CODE EDITOR AND CONTROLS PANEL ===== */}
                  <div className="col-6 lg-8" style={{ height: "100%", display: "flex", flexDirection: "column", width: '55.1%' }}>
                    
                    {/* ===== CODE EDITOR ===== */}
                    <div className="bg-white me-3" style={{ height: "45%", backgroundColor: "#E5E5E533" }}>
                    <div className="border-bottom border-dark p-3 d-flex justify-content-between align-items-center">
                         <div className="d-flex align-items-center" style={{ flex: 1, minWidth: 0 }}>
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
                               maxWidth: 'calc(100% - 40px)'
                             }}
                           >
                            {questionData?.Tabs.map((tab, index) => (
                                <div
                                    key={index}
                                    style={{
                                     minWidth: 'fit-content',
                                     width: 'auto',
                                        height: '30px',
                                        borderRadius: '10px',
                                     backgroundColor: activeTab === tab.name ? "black" : "transparent",
                                     color: activeTab === tab.name ? "white" : "black",
                                     border: activeTab === tab.name ? "none" : "1px solid black",
                                        display: 'inline-block',
                                        textAlign: 'center',
                                        lineHeight: '30px',
                                        marginRight: '8px',
                                     cursor: 'pointer',
                                     padding: '0 12px',
                                     whiteSpace: 'nowrap',
                                     flexShrink: 0
                                    }}
                                   className={`tab-button me-1 ${activeTab === tab.name ? 'selected-tab' : ''}`}
                                   onClick={() => handleTabClick(tab.name)}
                                   title={tab.name} // Show full filename on hover
                                >
                                   {tab.name}
                                </div>
                            ))}
                           </div>
                           <FontAwesomeIcon 
                             icon={faExpand} 
                             className='text-dark ms-2 me-1' 
                             onClick={() => setIsMaximized(true)} 
                             style={{ cursor: 'pointer', fontSize: "16px", flexShrink: 0 }} 
                           />
                        </div>
                    </div>
                    <div className="col top" style={{ height: `calc(100% - 60px)`, overflowY: 'auto', marginBottom: '10px' }}>
                        {renderEditor()}
                    </div>
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
                            disabled={processing || Object.values(submittedFiles).every(submitted => submitted)}
                          >
                            {processing ? "PROCESSING..." : Object.values(submittedFiles).every(submitted => submitted) ? "SUBMITTED" : "SUBMIT"}
                          </button>
                          
                          {/* Next Button (only shown when question is completed) */}
                          {Object.values(submittedFiles).every(submitted => submitted) &&
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
                        {/* ===== OUTPUT SECTION ===== */}
                        <div className="d-flex mb-3 justify-content-between" style={{ flexShrink: 0 }}>
                    <h5 className="m-0">Output</h5>
                </div>

                        {/* ===== HTML/CSS OUTPUT ===== */}
                        <div className="flex-fill" style={{ maxHeight: "90%", overflow: "auto" }}>
                    <div className='d-flex justify-content-start mt-2'>
                    </div>
                    <iframe
                    style={{ width: '100%', height: '100%', backgroundColor: '', color: 'black', borderColor: 'white', outline: 'none', resize: 'none' }}
                    className="w-full h-full"
                    srcDoc={srcCode}
                    title="output"
                    sandbox="allow-scripts"
                    width="100%"
                    height="100%"
                    ></iframe>
                </div>
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
          {/* Header with file tabs */}
          <div className="bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center" style={{ flex: 1, minWidth: 0 }}>
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
                  maxWidth: 'calc(100% - 200px)'
                }}
              >
                {questionData?.Tabs.map((tab, index) => (
                  <div
                    key={index}
                    style={{
                      minWidth: 'fit-content',
                      width: 'auto',
                      height: '30px',
                      borderRadius: '10px',
                      backgroundColor: activeTab === tab.name ? "black" : "transparent",
                      color: activeTab === tab.name ? "white" : "black",
                      border: activeTab === tab.name ? "none" : "1px solid black",
                      display: 'inline-block',
                      textAlign: 'center',
                      lineHeight: '30px',
                      marginRight: '8px',
                      cursor: 'pointer',
                      padding: '0 12px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                    className={`tab-button me-1 ${activeTab === tab.name ? 'selected-tab' : ''}`}
                    onClick={() => handleTabClick(tab.name)}
                    title={tab.name}
                  >
                    {tab.name}
                  </div>
                ))}
              </div>
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
                onClick={() => setShowRequirement(!showRequirement)}
                disabled={processing}
              >
                {showRequirement ? 'HIDE REQUIREMENT' : 'REQUIREMENT'}
              </button>
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
            <div style={{ 
              width: showRequirement ? '60%' : '100%', 
              backgroundColor: 'white', 
              borderRadius: '4px',
              transition: 'width 0.3s ease'
            }}>
              {renderEditor()}
            </div>
            
            {/* Requirement panel - only shown when showRequirement is true */}
            {showRequirement && (
              <div style={{ 
                width: '40%',
                backgroundColor: 'white', 
                borderRadius: '4px', 
                padding: '15px', 
                height: 'calc(100vh - 70px)',
                overflowY: 'auto',
                scrollbarWidth: "thin",
                scrollbarColor: "#c1c1c1 #f1f1f1",
                flexShrink: 0
              }}>
                {/* Problem Statement Section */}
                <div style={{ marginBottom: '20px' }}>
                  <h5 className="mb-3" style={{ fontSize: "16px", fontWeight: "600" }}>
                    Problem Statement
                  </h5>
                  <div 
                    style={{ 
                      whiteSpace: "pre-wrap", 
                      wordBreak: "break-word",
                      fontFamily: "inherit",
                      lineHeight: "1.5",
                      fontSize: "14px",
                      padding: "10px",
                      border: "1px solid #e9ecef",
                      borderRadius: "4px",
                      backgroundColor: "#f8f9fa",
                      minHeight: "200px"
                    }} 
                    dangerouslySetInnerHTML={{ __html: questionData?.Qn || '' }}
                  />
                </div>
                
                {/* Expected Output Section */}
                <div>
                  <h5 className="mb-3" style={{ fontSize: "16px", fontWeight: "600" }}>
                    Expected Output
                  </h5>
                  <div 
                    style={{ 
                      padding: "10px",
                      border: "1px solid #e9ecef",
                      borderRadius: "4px",
                      backgroundColor: "#f8f9fa",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      minHeight: "200px"
                    }}
                  >
                    {questionData?.image_path ? (
                      <img 
                        src={questionData.image_path} 
                        className="img-fluid" 
                        alt="Expected Output" 
                        style={{ 
                          pointerEvents: 'none', 
                          maxWidth: '100%',
                          height: 'auto',
                          borderRadius: '4px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }} 
                      />
                    ) : (
                      <div className="text-center text-muted">
                        <FontAwesomeIcon icon={faExpand} style={{ fontSize: "48px", opacity: 0.3 }} />
                        <p className="mt-2">No expected output image available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      <Modal show={showAlert} onHide={handleCloseAlert} size='lg' aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Body className='text-dark w-100 '>
                {displ === 'image' ? (
                <img
                    src={questionData?.image_path}
                    className="img-fluid mt-3"
                    alt="image"
                    style={{ pointerEvents: 'none', maxWidth: '100%', maxHeight: '100%' }}
                />
                ) : displ === 'output' ? (
                <iframe
                    style={{ width: '100%', height: '95%', backgroundColor: '', color: 'black', borderColor: 'white', outline: 'none', resize: 'none' }}
                    className="w-full h-full"
                    srcDoc={srcCode}
                    title="output"
                    sandbox="allow-scripts"
                    width="100%"
                    height="100%"
                ></iframe>
                ) : null}
        </Modal.Body>
        <Modal.Footer>
            <Button variant="dark" onClick={handleCloseAlert}>
            Close
            </Button>
        </Modal.Footer>
        </Modal>

    </div>
  );
};

export default HTMLCSSEditor;