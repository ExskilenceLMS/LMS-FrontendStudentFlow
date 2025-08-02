import React, { useState, useEffect } from "react";
import QuestionNavigation from "./QuestionNavigation";
import PythonCodeEditor from "./PythonCodeEditor";
import SQLCodeEditor from "./SQLCodeEditor";
import { secretKey } from "../constants";
import CryptoJS from "crypto-js";

/**
 * Interface for DynamicCodingEditor Props
 */
interface DynamicCodingEditorProps {
  questionData: any;
  onBack: () => void;
}

/**
 * DynamicCodingEditor Component
 * Wrapper component that manages switching between Python and SQL editors
 */
const DynamicCodingEditor: React.FC<DynamicCodingEditorProps> = ({
  questionData,
  onBack
}) => {
  // ===== STATE MANAGEMENT =====
  
  const [currentSubject, setCurrentSubject] = useState<'py' | 'sq'>('py');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [switchingMessage, setSwitchingMessage] = useState<string>("");
  const [questionStatuses, setQuestionStatuses] = useState<{[key: string]: string}>({});
  const [error, setError] = useState<string>("");
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<string>>(new Set());
  
  // ===== SESSION STORAGE DATA EXTRACTION =====
  
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
  
  // ===== UTILITY FUNCTIONS =====
  
  /**
   * Get question status from session storage
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
   * Update question status in session storage
   */
  const updateQuestionStatus = (questionKey: string, status: string) => {
    const sessionKey = `${testId}_questionStatus`;
    const sessionStatus = sessionStorage.getItem(sessionKey);
    
    try {
      let statuses: { [key: string]: string } = {};
      if (sessionStatus) {
        const decryptedStatuses = CryptoJS.AES.decrypt(sessionStatus, secretKey).toString(CryptoJS.enc.Utf8);
        statuses = JSON.parse(decryptedStatuses);
      }
      
      statuses[questionKey] = status;
      
      const encryptedStatuses = CryptoJS.AES.encrypt(JSON.stringify(statuses), secretKey).toString();
      sessionStorage.setItem(sessionKey, encryptedStatuses);
      
      setQuestionStatuses(statuses);
    } catch (error) {
      console.error("Error updating question status:", error);
    }
  };

  /**
   * Determines the subject type from question ID
   * Extracts 2nd and 3rd letters from qn_id
   */
  const getSubjectFromQuestion = (question: any): 'py' | 'sq' => {
    const qnId = question.Qn_name || '';
    if (qnId.length >= 3) {
      const subjectCode = qnId.substring(1, 3).toLowerCase();
      if (subjectCode === 'py') return 'py';
      if (subjectCode === 'sq') return 'sq';
    }
    return 'py'; // Default to Python
  };

  /**
   * Get question status for display
   */
  const getQuestionStatus = (question: any): string => {
    const questionKey = `coding_${question.Qn_name}`;
    return questionStatuses[questionKey] || "Not Started";
  };

  /**
   * Get status color for question button
   */
  const getStatusColor = (status: string): string => {
    switch (status) {
      case "Submitted":
        return "#28a745"; // Green
      case "In Progress":
        return "#ffc107"; // Yellow
      case "Failed":
        return "#dc3545"; // Red
      default:
        return "#6c757d"; // Gray
    }
  };

  // ===== DATA INITIALIZATION =====
  
  useEffect(() => {
    if (questionData && questionData.qns_data && questionData.qns_data.coding) {
      try {
        // Extract coding questions
        const codingQuestions = questionData.qns_data.coding;
        console.log("DynamicCodingEditor: Found coding questions:", codingQuestions.length);
        console.log("DynamicCodingEditor: Sample question:", codingQuestions[0]);
        
        setQuestions(codingQuestions);
        
        // Get initial question index from session storage or default to 0
        const savedIndex = sessionStorage.getItem("codingCurrentQuestionIndex");
        const initialIndex = savedIndex ? parseInt(savedIndex, 10) : 0;
        setCurrentQuestionIndex(initialIndex);
        
        // Determine initial subject from the first question
        if (codingQuestions.length > 0) {
          const initialQuestion = codingQuestions[initialIndex];
          const initialSubject = getSubjectFromQuestion(initialQuestion);
          console.log("DynamicCodingEditor: Initial subject:", initialSubject);
          setCurrentSubject(initialSubject);
        }
        
        // Load question statuses
        const statuses = getQuestionStatusFromSession();
        setQuestionStatuses(statuses);
        
        // Initialize timer synchronously on page load/refresh
        if ((window as any).updateTimerSync) {
          (window as any).updateTimerSync();
        }
        
        setError("");
      } catch (error) {
        console.error("Error initializing DynamicCodingEditor:", error);
        setError("Failed to load questions. Please try again.");
      }
    } else {
      console.log("DynamicCodingEditor: No coding questions found in questionData:", questionData);
      setError("No coding questions available.");
    }
  }, [questionData]);

  // ===== QUESTION NAVIGATION HANDLERS =====
  
  /**
   * Handles question index change
   */
  const handleQuestionChange = async (index: number) => {
    if (index === currentQuestionIndex) return;
    
    try {
      // Get the new question
      const newQuestion = questions[index];
      if (!newQuestion) {
        setError("Question not found.");
        return;
      }
      
      // Determine the subject of the new question
      const newSubject = getSubjectFromQuestion(newQuestion);
      
      // If subject is different, show loading and switch
      if (newSubject !== currentSubject) {
        setLoading(true);
        setSwitchingMessage(`Switching to ${newSubject === 'py' ? 'Python' : 'SQL'} editor...`);
        
        // Simulate loading time for better UX
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setCurrentSubject(newSubject);
        setLoading(false);
        setSwitchingMessage("");
      }
      
      // Update current question index
      setCurrentQuestionIndex(index);
      
      // Save to session storage
      sessionStorage.setItem("codingCurrentQuestionIndex", index.toString());
      
      // Update question status to "In Progress"
      const questionKey = `coding_${newQuestion.Qn_name}`;
      const currentStatus = questionStatuses[questionKey];
      if (currentStatus !== "Submitted") {
        updateQuestionStatus(questionKey, "In Progress");
      }
      
      // Update test duration asynchronously when question is changed
      if ((window as any).updateTimerAsync) {
        (window as any).updateTimerAsync();
      }
      
      setError("");
    } catch (error) {
      console.error("Error changing question:", error);
      setError("Failed to switch question. Please try again.");
    }
  };

  /**
   * Handles subject change with loading state
   */
  const handleSubjectChange = async (newSubject: 'py' | 'sq') => {
    if (newSubject === currentSubject) return;
    
    try {
      setLoading(true);
      setSwitchingMessage(`Switching to ${newSubject === 'py' ? 'Python' : 'SQL'} editor...`);
      
      // Simulate loading time for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCurrentSubject(newSubject);
      setLoading(false);
      setSwitchingMessage("");
      setError("");
    } catch (error) {
      console.error("Error changing subject:", error);
      setError("Failed to switch editor. Please try again.");
      setLoading(false);
    }
  };

  /**
   * Handles navigation to the next question or back to test section
   */
  const handleNext = async () => {
    // Check if this is the last question
    if (currentQuestionIndex === questions.length - 1) {
      // Navigate back to test section
      onBack();
    } else {
      // Navigate to next question
      const nextIndex = currentQuestionIndex + 1;
      await handleQuestionChange(nextIndex);
    }
    
    // Update test duration asynchronously when moving to next question
    if ((window as any).updateTimerAsync) {
      (window as any).updateTimerAsync();
    }
  };

  /**
   * Determines if the Next button should be shown for the current question
   */
  const shouldShowNextButton = (question: any): boolean => {
    if (!question) return false;
    
    const questionKey = `coding_${question.Qn_name}`;
    
    // Check local state first (for immediate updates)
    if (submittedQuestions.has(questionKey)) {
      return true;
    }
    
    // Get the current question status from session storage
    const sessionKey = `${testId}_questionStatus`;
    const sessionStatus = sessionStorage.getItem(sessionKey);
    
    if (sessionStatus) {
      try {
        const decryptedStatuses = CryptoJS.AES.decrypt(sessionStatus, secretKey).toString(CryptoJS.enc.Utf8);
        const statuses = JSON.parse(decryptedStatuses);
        const questionStatus = statuses[questionKey];
        
        if (questionStatus === "Submitted") {
          // Update local state to match sessionStorage
          setSubmittedQuestions(prev => new Set([...prev, questionKey]));
          return true;
        }
      } catch (error) {
        console.error("Error checking question status:", error);
      }
    }
    
    // Fallback to checking question properties
    // For SQL questions: check isSubmitted, status, or question_status
    if (getSubjectFromQuestion(question) === 'sq') {
      return question.isSubmitted || question.status === true || question.question_status === "Submitted";
    }
    
    // For Python questions: check isSubmitted or status
    if (getSubjectFromQuestion(question) === 'py') {
      return question.isSubmitted || question.status === true;
    }
    
    return false;
  };

  /**
   * Mark a question as submitted in local state
   */
  const markQuestionAsSubmitted = (questionName: string) => {
    const questionKey = `coding_${questionName}`;
    setSubmittedQuestions(prev => new Set([...prev, questionKey]));
  };

  /**
   * Gets the text for the Next button
   */
  const getNextButtonText = (): string => {
    return currentQuestionIndex === questions.length - 1 ? "Test Section" : "NEXT";
  };

  // ===== RENDERING =====

  if (error) {
    return (
      <div className="container-fluid p-0" style={{ height: "100vh", backgroundColor: "#f2eeee" }}>
        <div className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
          <div className="text-center">
            <div className="alert alert-danger" role="alert">
              <h4 className="alert-heading">Error</h4>
              <p>{error}</p>
              <hr />
              <button 
                className="btn btn-primary" 
                onClick={onBack}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="container-fluid p-0" style={{ height: "100vh", backgroundColor: "#f2eeee" }}>
        <div className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0" style={{ height: '100%', overflowX: "hidden", overflowY: "hidden", backgroundColor: "#f2eeee" }}>
      <div className="p-0 my-0" style={{ backgroundColor: "#F2EEEE", marginRight: '10px' }}>
        <div className="container-fluid p-0 pt-2" style={{ maxWidth: "100%", overflowX: "hidden", overflowY: "auto", backgroundColor: "#f2eeee" }}>
          <div className="row g-2">
            <div className="col-12">
              <div className="" style={{ height: "87vh", overflow: "hidden", padding: '0px 0px 15px 0px' }}>
                <div className="d-flex" style={{ height: '100%', width: '100%' }}>
                  
                  {/* ===== QUESTION LIST (LEFT PANEL) ===== */}
                  <div className="col-1 lg-8" style={{ width: "70px", display: "flex", flexDirection: "column", paddingRight: "15px", height: "100%", overflowY: "auto" }}>
                    {questions.map((question: any, index: number) => {
                      const status = getQuestionStatus(question);
                      const statusColor = getStatusColor(status);
                      const subject = getSubjectFromQuestion(question);
                      
                      return (
                        <div key={index} className="mb-2">
                          <button
                            className="btn rounded-2 px-1 mx-auto position-relative"
                            style={{
                              width: "50px",
                              height: "50px",
                              backgroundColor: currentQuestionIndex === index ? "grey" : "#fff",
                              color: currentQuestionIndex === index ? "#fff" : "#000",
                              cursor: "pointer",
                              boxShadow: "#888 1px 2px 5px 0px",
                              border: `2px solid ${statusColor}`,
                              fontSize: "10px"
                            }}
                            onClick={() => handleQuestionChange(index)}
                            title={`Q${index + 1} - ${subject.toUpperCase()} - ${status}`}
                          >
                            <div>Q{index + 1}</div>
                            <div style={{ fontSize: "8px", marginTop: "2px" }}>
                              {subject.toUpperCase()}
                            </div>
                          </button>
                          
                          {/* Status indicator dot */}
                          {/* <div 
                            className="position-absolute"
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              backgroundColor: statusColor,
                              top: "2px",
                              right: "2px",
                              border: "1px solid white"
                            }}
                          /> */}
                        </div>
                      );
                    })}
                  </div>

                  {/* ===== MAIN CONTENT AREA ===== */}
                  <div className="col-11" style={{ display: "flex", flexDirection: "column", height: "100%",width:"100%" }}>
                    
                    {/* ===== EDITOR CONTENT ===== */}
                    <div style={{ flex: 1, display: "flex" }}>
                      {currentSubject === 'py' ? (
                        <PythonCodeEditor
                          questionData={questionData}
                          currentQuestionIndex={currentQuestionIndex}
                          onQuestionChange={handleSubjectChange}
                          onNext={handleNext}
                          showNextButton={shouldShowNextButton(questions[currentQuestionIndex])}
                          nextButtonText={getNextButtonText()}
                          onQuestionSubmitted={markQuestionAsSubmitted}
                        />
                      ) : (
                        <SQLCodeEditor
                          questionData={questionData}
                          currentQuestionIndex={currentQuestionIndex}
                          onQuestionChange={handleSubjectChange}
                          onNext={handleNext}
                          showNextButton={shouldShowNextButton(questions[currentQuestionIndex])}
                          nextButtonText={getNextButtonText()}
                          onQuestionSubmitted={markQuestionAsSubmitted}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* ===== LOADING OVERLAY FOR EDITOR SWITCHING ===== */}
      {loading && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "8px",
            textAlign: "center"
          }}>
            <div className="spinner-border mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mb-0">{switchingMessage || "Loading..."}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicCodingEditor; 