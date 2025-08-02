import React, { useState, useEffect } from "react";

/**
 * Interface for Question Navigation Props
 */
interface QuestionNavigationProps {
  questions: any[];
  currentQuestionIndex: number;
  onQuestionChange: (index: number) => void;
  onSubjectChange: (subject: 'py' | 'sq') => void;
}

/**
 * QuestionNavigation Component
 * Displays question number boxes and handles question switching
 */
const QuestionNavigation: React.FC<QuestionNavigationProps> = ({
  questions,
  currentQuestionIndex,
  onQuestionChange,
  onSubjectChange
}) => {
  const [loading, setLoading] = useState<boolean>(false);

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
   * Handles question navigation click
   * Switches to the appropriate editor based on question subject
   */
  const handleQuestionClick = (index: number) => {
    if (index === currentQuestionIndex) return;
    
    setLoading(true);
    
    try {
      const targetQuestion = questions[index];
      if (!targetQuestion) {
        console.error('Question not found at index:', index);
        return;
      }

      // Determine subject for the target question
      const targetSubject = getSubjectFromQuestion(targetQuestion);
      
      // Save current question index to session storage
      sessionStorage.setItem("codingCurrentQuestionIndex", index.toString());
      
      // Notify parent components about the change
      onQuestionChange(index);
      onSubjectChange(targetSubject);
      
    } catch (error) {
      console.error('Error switching question:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get the current subject for the active question
   */
  const getCurrentSubject = (): 'py' | 'sq' => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return 'py';
    return getSubjectFromQuestion(currentQuestion);
  };

  /**
   * Get question status (completed or not)
   */
  const getQuestionStatus = (question: any): 'completed' | 'pending' => {
    return question.status ? 'completed' : 'pending';
  };

  /**
   * Get question number display text
   */
  const getQuestionNumber = (index: number): string => {
    return `Q${index + 1}`;
  };

  return (
    <div className="question-navigation-container">
      {/* ===== QUESTION NAVIGATION HEADER ===== */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 style={{ 
          color: "#333", 
          fontWeight: "bold", 
          margin: 0,
          fontSize: "14px"
        }}>
          Questions
        </h6>
        
        {/* ===== CURRENT SUBJECT INDICATOR ===== */}
        <div className="d-flex align-items-center">
          <span style={{ 
            fontSize: "12px", 
            color: "#666",
            marginRight: "8px"
          }}>
            Current:
          </span>
          <span style={{
            padding: "2px 8px",
            borderRadius: "12px",
            fontSize: "11px",
            fontWeight: "500",
            backgroundColor: getCurrentSubject() === 'py' ? "#E3F2FD" : "#F3E5F5",
            color: getCurrentSubject() === 'py' ? "#1976D2" : "#7B1FA2",
            border: `1px solid ${getCurrentSubject() === 'py' ? "#BBDEFB" : "#E1BEE7"}`
          }}>
            {getCurrentSubject() === 'py' ? 'Python' : 'SQL'}
          </span>
        </div>
      </div>

      {/* ===== QUESTION BOXES GRID ===== */}
      <div className="question-grid" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))",
        gap: "8px",
        maxHeight: "300px",
        overflowY: "auto"
      }}>
        {questions.map((question, index) => {
          const isActive = index === currentQuestionIndex;
          const status = getQuestionStatus(question);
          const subject = getSubjectFromQuestion(question);
          
          return (
            <button
              key={index}
              className={`question-box ${isActive ? 'active' : ''} ${status === 'completed' ? 'completed' : 'pending'}`}
              onClick={() => handleQuestionClick(index)}
              disabled={loading}
              style={{
                width: "100%",
                height: "50px",
                border: isActive 
                  ? "2px solid #007bff" 
                  : status === 'completed' 
                    ? "2px solid #28a745" 
                    : "2px solid #dee2e6",
                borderRadius: "8px",
                backgroundColor: isActive 
                  ? "#007bff" 
                  : status === 'completed' 
                    ? "#d4edda" 
                    : "#f8f9fa",
                color: isActive 
                  ? "white" 
                  : status === 'completed' 
                    ? "#155724" 
                    : "#6c757d",
                fontWeight: isActive ? "bold" : "normal",
                fontSize: "12px",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                opacity: loading ? 0.6 : 1
              }}
              title={`${getQuestionNumber(index)} - ${subject === 'py' ? 'Python' : 'SQL'} Question`}
            >
              {/* ===== QUESTION NUMBER ===== */}
              <span style={{ fontSize: "11px", fontWeight: "500" }}>
                {getQuestionNumber(index)}
              </span>
              
              {/* ===== SUBJECT INDICATOR ===== */}
              <span style={{ 
                fontSize: "9px", 
                opacity: 0.8,
                marginTop: "2px"
              }}>
                {subject === 'py' ? 'PY' : 'SQL'}
              </span>
              
              {/* ===== COMPLETION INDICATOR ===== */}
              {status === 'completed' && (
                <div style={{
                  position: "absolute",
                  top: "2px",
                  right: "2px",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "#28a745",
                  border: "1px solid white"
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ===== LOADING INDICATOR ===== */}
      {loading && (
        <div className="d-flex justify-content-center align-items-center mt-3">
          <div className="spinner-border spinner-border-sm" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <span className="ms-2" style={{ fontSize: "12px", color: "#666" }}>
            Switching editor...
          </span>
        </div>
      )}

      {/* ===== QUESTION STATISTICS ===== */}
      <div className="question-stats mt-3" style={{
        padding: "8px",
        backgroundColor: "#f8f9fa",
        borderRadius: "6px",
        fontSize: "11px"
      }}>
        <div className="d-flex justify-content-between">
          <span>Total: {questions.length}</span>
          <span>Completed: {questions.filter(q => q.status).length}</span>
          <span>Pending: {questions.filter(q => !q.status).length}</span>
        </div>
      </div>

      {/* ===== CSS STYLES ===== */}
      <style>
        {`
          .question-navigation-container {
            padding: 12px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          .question-box:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
          }
          
          .question-box.active {
            box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
          }
          
          .question-box.completed {
            border-color: #28a745 !important;
          }
          
          .question-grid::-webkit-scrollbar {
            width: 6px;
          }
          
          .question-grid::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 3px;
          }
          
          .question-grid::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 3px;
          }
          
          .question-grid::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
          }
        `}
      </style>
    </div>
  );
};

export default QuestionNavigation; 