import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "react-bootstrap";
import { getApiClient } from "../utils/apiAuth";
import CryptoJS from "crypto-js";
import { secretKey } from "../constants";
import { getProjectId, fetchProjectCodingQuestions } from "../utils/projectStorageUtils";
import QuestionNav from "./QuestionNav";
import PythonEditorComponent from "./PythonEditorComponent";
import FrontendEditorComponent from "./FrontendEditorComponent";
import SkeletonCode from "./EditorSkeletonCode";
import "../SQLEditor.css";

interface UnifiedEditorProps {
  subtaskId?: string; // Optional, will get from sessionStorage if not provided
}

const UnifiedEditor: React.FC<UnifiedEditorProps> = ({ subtaskId }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Get student ID
  const encryptedStudentId = sessionStorage.getItem("StudentId") || "";
  const decryptedStudentId = CryptoJS.AES.decrypt(encryptedStudentId, secretKey).toString(CryptoJS.enc.Utf8);
  const studentId = decryptedStudentId;

  // Fetch questions on mount
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get subtaskId from props or sessionStorage
        const currentSubtaskId = subtaskId || getProjectId("subtaskId");
        if (!currentSubtaskId) {
          throw new Error("Subtask ID is required");
        }

        // Check if full questions are already cached in sessionStorage
        const cachedQuestionsKey = `project_coding_questions_full_${currentSubtaskId}`;
        const cachedQuestions = sessionStorage.getItem(cachedQuestionsKey);
        
        let questionsData: any[] = [];
        
        if (cachedQuestions) {
          try {
            questionsData = JSON.parse(cachedQuestions);
            // Verify the cached data is valid
            if (Array.isArray(questionsData) && questionsData.length > 0) {
              setQuestions(questionsData);
              setLoading(false);
              
              // Set initial question index from session storage or default to 0
              const storedIndex = sessionStorage.getItem("currentQuestionIndex");
              const initialIndex = storedIndex ? 
                Math.max(0, Math.min(parseInt(storedIndex) || 0, questionsData.length - 1)) : 0;
              
              setCurrentQuestionIndex(initialIndex);
              sessionStorage.setItem("currentQuestionIndex", initialIndex.toString());
              return;
            }
          } catch (e) {
            // If parsing fails, continue to fetch from API
            console.warn("Failed to parse cached questions, fetching from API");
          }
        }

        // Fetch full question data from API
        questionsData = await fetchProjectCodingQuestions(studentId, currentSubtaskId);
        
        if (!questionsData || questionsData.length === 0) {
          throw new Error("No questions found");
        }

        // Cache the full questions in sessionStorage
        sessionStorage.setItem(cachedQuestionsKey, JSON.stringify(questionsData));
        
        setQuestions(questionsData);

        // Set initial question index from session storage or default to 0
        const storedIndex = sessionStorage.getItem("currentQuestionIndex");
        const initialIndex = storedIndex ? 
          Math.max(0, Math.min(parseInt(storedIndex) || 0, questionsData.length - 1)) : 0;
        
        setCurrentQuestionIndex(initialIndex);
        sessionStorage.setItem("currentQuestionIndex", initialIndex.toString());

      } catch (err: any) {
        console.error("Error fetching questions:", err);
        setError(err.message || "Failed to load questions");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [studentId, subtaskId]);

  // Handle question navigation
  const handleQuestionChange = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
      sessionStorage.setItem("currentQuestionIndex", index.toString());
    }
  };

  // Get current question
  const currentQuestion = questions[currentQuestionIndex];
  const currentEditor = currentQuestion?.editor || "python_coding";

  // Render appropriate editor component
  const renderEditor = () => {
    if (!currentQuestion) return null;

    const commonProps = {
      question: currentQuestion,
      questionIndex: currentQuestionIndex,
      totalQuestions: questions.length,
      onNext: () => {
        if (currentQuestionIndex < questions.length - 1) {
          handleQuestionChange(currentQuestionIndex + 1);
        } else {
          // Navigate back to project tasks
          navigate("/project-tasks", { replace: true });
        }
      },
      onQuestionChange: handleQuestionChange,
    };

    switch (currentEditor) {
      case "python_coding":
        return <PythonEditorComponent {...commonProps} />;
      case "frontend_coding":
        return <FrontendEditorComponent {...commonProps} />;
      default:
        return <PythonEditorComponent {...commonProps} />;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="container-fluid p-0" style={{ height: "100vh", maxWidth: "100%", overflowX: "hidden", backgroundColor: "#f2eeee" }}>
        <div className="p-0 my-0 me-2" style={{ backgroundColor: "#F2EEEE" }}>
          <SkeletonCode />
        </div>
      </div>
    );
  }

  // Error state
  if (error || questions.length === 0) {
    return (
      <div className="container-fluid p-0 d-flex justify-content-center align-items-center" style={{ height: "100vh", backgroundColor: "#f2eeee" }}>
        <div className="text-center">
          <p className="text-danger">{error || "No questions available"}</p>
          <button className="btn btn-primary" onClick={() => navigate("/project-tasks", { replace: true })}>
            Go Back
          </button>
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
                <div className="d-flex" style={{ height: '100%', width: '100%', gap: '0' }}>
                  {/* Question Navigation Sidebar */}
                  <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", overflow: "auto" }}>
                    <QuestionNav
                      totalQuestions={questions.length}
                      currentIndex={currentQuestionIndex}
                      onQuestionClick={handleQuestionChange}
                      questionLabel="Q"
                    />
                  </div>

                  {/* Editor Component */}
                  <div style={{ flex: 1, minWidth: 0, height: "100%" }}>
                    {renderEditor()}
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

export default UnifiedEditor;

