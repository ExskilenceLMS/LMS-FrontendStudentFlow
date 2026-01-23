import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getApiClient } from "../utils/apiAuth";
import { secretKey } from "../constants";
import CryptoJS from "crypto-js";
import SQLCodeEditorComponent from "./SQLCodeEditorComponent";
import PythonEditorComponent from "./PythonEditorComponent";
import FrontendEditorComponent from "./FrontendEditorComponent";
import TestQuestionNav from "./TestQuestionNav";
import SkeletonCode from "./EditorSkeletonCode";
import { getBackNavigationPath, navigateBackWithReplace } from "../utils/navigationRules";

/**
 * TestEditorFlow Component
 * Unified component for test coding questions that uses SQLCodeEditorComponent,
 * PythonEditorComponent, and FrontendEditorComponent
 */
const TestEditorFlow: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract question data from location state
  const questionData = location.state?.sectionData;
  
  // State management
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [currentSubject, setCurrentSubject] = useState<'py' | 'sq' | 'ht'>('py');
  const [questionStatuses, setQuestionStatuses] = useState<{[key: string]: string}>({});
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string>("");

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

  const testId = getSessionData('TestId');

  // ===== UTILITY FUNCTIONS =====

  /**
   * Transforms question data to flatten question_data structure
   * Merges question_data fields into root level for component compatibility
   */
  const transformQuestion = (question: any): any => {
    if (!question) return question;
    
    // If question has question_data, merge it into root level
    if (question.question_data) {
      return {
        ...question,
        ...question.question_data,
        // Keep root level fields that should override question_data
        Qn_name: question.Qn_name,
        entered_ans: question.entered_ans || '',
        score: question.score || '0/10',
        status: question.status || false,
        editor: question.editor || 'python_coding',
        // Merge question_data fields
        Qn: question.question_data.Qn || question.Qn || '',
        Ans: question.question_data.Ans || question.Ans || '',
        Query: question.question_data.Ans || question.Query || '',
        TestCases: question.question_data.TestCases || question.TestCases || [],
        ExpectedOutput: question.question_data.ExpectedOutput || question.ExpectedOutput || [],
        Table: question.question_data.Table || question.Table || '',
        Tables: question.Tables || question.question_data.Tables,
        // Additional fields from question_data
        Expl: question.question_data.Expl || [],
        Name: question.question_data.Name || question.Name || '',
        QNty: question.question_data.QNty || question.QNty || '',
        QnTe: question.question_data.QnTe || question.QnTe || '',
        test: question.question_data.test || question.test || [],
        Hints: question.question_data.Hints || question.Hints || [],
        Level: question.question_data.Level || question.Level || '',
        CreatedOn: question.question_data.CreatedOn || question.CreatedON || '',
        MultiSelect: question.question_data.MultiSelect || question.MultiSelect || '0',
        Template: question.question_data.Template || question.Template || '',
        FunctionCall: question.question_data.FunctionCall || question.FunctionCall || '',
        // HTML/CSS specific fields
        Code_Validation: question.question_data.Code_Validation || question.Code_Validation,
        requirements: question.question_data.requirements || question.requirements,
        Tabs: question.question_data.Tabs || question.Tabs,
        image_path: question.question_data.image_path || question.image_path,
        video_path: question.question_data.video_path || question.video_path,
        image_urls: question.question_data.image_urls || question.image_urls,
        question_id: question.question_id || question.question_data.question_id
      };
    }
    
    return question;
  };

  /**
   * Maps question to FrontendEditorComponent's QuestionData format
   */
  const mapToQuestionData = (question: any): any => {
    return {
      Qn_name: question.Qn_name,
      Page_Name: question.Qn_name,
      level: question.level || question.Level || '',
      subtopic_id: question.subtopic_id || question.ConceptID || '',
      type: question.QuestionType || '',
      Tabs: question.Tabs || [],
      Qn: question.Qn,
      requirements: question.requirements || '',
      Code_Validation: question.Code_Validation || {},
      defaulttemplate: question.Template || '',
      Template: question.Template || '',
      image_path: question.image_path || '',
      video_path: question.video_path || '',
      CreatedBy: question.CreatedBy || '',
      CreatedOn: question.CreatedOn || question.CreatedON || '',
      LastUpdated: question.LastUpdated || '',
      status: question.status || false,
      score: question.score || '0/10',
      entered_ans: question.entered_ans || '',
      image_urls: question.image_urls || [],
      question_id: question.question_id || ''
    };
  };

  /**
   * Determines the editor type from question editor key
   * Maps editor values to component types
   */
  const getEditorTypeFromQuestion = (question: any): 'py' | 'sq' | 'ht' => {
    const editor = question.editor || '';
    if (editor === 'sql_coding') return 'sq';
    if (editor === 'python_coding') return 'py';
    if (editor === 'frontend_coding') return 'ht';
    
    // Fallback: try to determine from Qn_name if editor not present
    const qnId = question.Qn_name || '';
    if (qnId.length >= 3) {
      const subjectCode = qnId.substring(1, 3).toLowerCase();
      if (subjectCode === 'py') return 'py';
      if (subjectCode === 'sq') return 'sq';
      if (subjectCode === 'ht' || subjectCode === 'cs' || subjectCode === 'js') return 'ht';
    }
    
    return 'py'; // Default to Python
  };

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
          setSubmittedQuestions(prev => new Set([...prev, questionKey]));
          return true;
        }
      } catch (error) {
        console.error("Error checking question status:", error);
      }
    }
    
    // Fallback to checking question properties
    return question.isSubmitted || question.status === true || question.question_status === "Submitted";
  };

  /**
   * Mark a question as submitted in local state
   */
  const markQuestionAsSubmitted = (questionName: string) => {
    const questionKey = `coding_${questionName}`;
    setSubmittedQuestions(prev => new Set([...prev, questionKey]));
    updateQuestionStatus(questionKey, "Submitted");
  };

  /**
   * Gets the text for the Next button
   */
  const getNextButtonText = (): string => {
    return currentQuestionIndex === questions.length - 1 ? "Test Section" : "NEXT";
  };

  /**
   * Handle back navigation
   */
  const handleBack = () => {
    const currentPath = location.pathname;
    
    // Get test data from location state or session storage as fallback
    let sectionData = questionData;
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
    
    // Use navigateBackWithReplace to prevent back button access
    navigateBackWithReplace(navigate, currentPath, { 
      sectionData: sectionData 
    });
  };

  // ===== DATA INITIALIZATION =====
  
  useEffect(() => {
    if (questionData && questionData.qns_data && questionData.qns_data.coding) {
      try {
        // Extract coding questions
        const codingQuestions = questionData.qns_data.coding;
        
        // Transform questions to flatten question_data structure
        const transformedQuestions = codingQuestions.map((q: any) => transformQuestion(q));
        setQuestions(transformedQuestions);
        
        // Get initial question index from session storage or default to 0
        const savedIndex = sessionStorage.getItem("codingCurrentQuestionIndex");
        const initialIndex = savedIndex ? parseInt(savedIndex, 10) : 0;
        setCurrentQuestionIndex(initialIndex);
        
        // Determine initial editor type from the first question
        if (transformedQuestions.length > 0) {
          const initialQuestion = transformedQuestions[initialIndex];
          const initialEditorType = getEditorTypeFromQuestion(initialQuestion);
          setCurrentSubject(initialEditorType);
        }
        
        // Load question statuses
        const statuses = getQuestionStatusFromSession();
        setQuestionStatuses(statuses);
        
        // Initialize timer synchronously on page load/refresh
        if ((window as any).updateTimerSync) {
          (window as any).updateTimerSync();
        }
        
        setError("");
        setLoading(false);
      } catch (error) {
        console.error("Error initializing TestEditorFlow:", error);
        setError("Failed to load questions. Please try again.");
        setLoading(false);
      }
    } else {
      setError("No coding questions available.");
      setLoading(false);
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
      
      // Transform the question to flatten question_data structure
      const transformedQuestion = transformQuestion(newQuestion);
      
      // Determine the editor type of the new question
      const newEditorType = getEditorTypeFromQuestion(transformedQuestion);
      
      // If editor type is different, show loading and switch
      if (newEditorType !== currentSubject) {
        setLoading(true);
        setCurrentSubject(newEditorType);
        // Small delay for smoother transition
        await new Promise(resolve => setTimeout(resolve, 100));
        setLoading(false);
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
   * Handles navigation to the next question or back to test section
   */
  const handleNext = async () => {
    // Check if this is the last question
    if (currentQuestionIndex === questions.length - 1) {
      // Navigate back to test section
      handleBack();
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

  // ===== RENDERING =====

  if (!questionData) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

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
                onClick={handleBack}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-fluid p-0" style={{ height: "100%", maxWidth: "100%", overflowX: "hidden", backgroundColor: "#f2eeee" }}>
        <div className="p-0 my-0 me-2" style={{ backgroundColor: "#F2EEEE", height: "100%" }}>
          <SkeletonCode />
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

  const currentQuestion = questions[currentQuestionIndex];
  
  // Ensure question is transformed (in case it wasn't transformed during initialization)
  const transformedCurrentQuestion = transformQuestion(currentQuestion);

  return (
    <div className="container-fluid p-0" style={{ overflowX: "hidden", overflowY: "hidden", backgroundColor: "#f2eeee" }}>
      <div className="p-0 my-0" style={{ backgroundColor: "#F2EEEE", marginRight: '10px', height: '100%' }}>
        <div className="container-fluid p-0 pt-2" style={{ maxWidth: "100%", overflowX: "hidden", overflowY: "hidden", backgroundColor: "#f2eeee", height: '100%' }}>
          <div className="row g-2" style={{ height: '100%' }}>
            <div className="col-12" style={{ height: '100%' }}>
              <div className="" style={{ height: "calc(100vh - 87px)", overflow: "hidden", padding: '0px 0px 5px 0px' }}>
                <div className="d-flex" style={{ height: '100%', width: '100%', gap: 0 }}>
                  
                  {/* ===== QUESTION NAVIGATION (LEFT PANEL) ===== */}
                  <TestQuestionNav
                    totalQuestions={questions.length}
                    currentIndex={currentQuestionIndex}
                    onQuestionClick={handleQuestionChange}
                    questionStatuses={questionStatuses}
                    questions={questions}
                  />

                  {/* ===== MAIN CONTENT AREA ===== */}
                  <div style={{ display: "flex", flexDirection: "column", height: "100%", flex: 1, maxHeight: "100%", minWidth: 0 }}>
                    
                    {/* ===== EDITOR CONTENT ===== */}
                    <div style={{ flex: 1, display: "flex", height: "100%", maxHeight: "100%" }}>
                      {currentSubject === 'py' ? (
                        <PythonEditorComponent
                          question={transformedCurrentQuestion}
                          questionIndex={currentQuestionIndex}
                          totalQuestions={questions.length}
                          onNext={handleNext}
                          onQuestionChange={handleQuestionChange}
                        />
                      ) : currentSubject === 'sq' ? (
                        <SQLCodeEditorComponent
                          question={transformedCurrentQuestion}
                          questionIndex={currentQuestionIndex}
                          totalQuestions={questions.length}
                          onNext={handleNext}
                          onQuestionChange={handleQuestionChange}
                        />
                      ) : (
                        <FrontendEditorComponent
                          question={mapToQuestionData(transformedCurrentQuestion)}
                          questionIndex={currentQuestionIndex}
                          totalQuestions={questions.length}
                          onNext={handleNext}
                          onQuestionChange={handleQuestionChange}
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
    </div>
  );
};

export default TestEditorFlow;
