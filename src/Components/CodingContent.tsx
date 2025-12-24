import React from "react";
import { Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import CryptoJS from "crypto-js";
import { secretKey, LEVEL_TO_DIFFICULTY, DIFFICULTY_COLORS } from "../constants";
import { CodingQuestion } from "../utils/projectStorageUtils";

interface CodingContentProps {
  questions: CodingQuestion[];
  currentIndex: number;
  totalQuestions: number;
  onQuestionChange: (index: number) => void;
  subject: string;
  loading?: boolean;
}

const getDifficultyLabel = (level: string | undefined): string => {
  if (!level) return 'Easy';
  return LEVEL_TO_DIFFICULTY[level] || 'Easy';
};

const getDifficultyColor = (level: string | undefined): string => {
  const difficulty = getDifficultyLabel(level);
  return DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS['Easy'];
};


const CodingContent: React.FC<CodingContentProps> = ({
  questions,
  currentIndex,
  totalQuestions,
  onQuestionChange,
  subject,
  loading = false,
}) => {
  const navigate = useNavigate();

  // Show loader while loading
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center h-100">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  // Show error message if not loading but no questions
  if (!questions || questions.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center h-100">
        <div className="text-center">
          <p className="text-muted">Coding questions not available</p>
        </div>
      </div>
    );
  }

  const url = (editor: string): string => {
    if (editor === "python_coding") {
      return "/py-editor";
    } else if (editor === "sql_editor") {
      return "/sql-editor";
    } else if ( editor === "frontend_coding") {
      return "/html-css-editor";
    }
    return "/html-css-editor";
  };

  const navigateTo = url(questions[currentIndex].editor);

  return (
    <div className="d-flex flex-column flex-grow-1 h-100 overflow-auto bg-light">
      <div className="flex-grow-1 w-100">
        {questions.map((question) => {
          const isSolved = question.status !== undefined ? question.status : question.isSolved;
          const difficultyLabel = getDifficultyLabel(question.level);
          const difficultyColor = getDifficultyColor(question.level);
          const questionTitle = question.Qn;
          
          return (
            <div
              key={question.id}
              className="mb-3 rounded-3 d-flex flex-column align-items-stretch bg-white shadow-sm cursor-pointer"
              style={{
                minHeight: "50px",
                transition: "box-shadow 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.classList.remove("shadow-sm");
                e.currentTarget.classList.add("shadow");
              }}
              onMouseLeave={(e) => {
                e.currentTarget.classList.remove("shadow");
                e.currentTarget.classList.add("shadow-sm");
              }}
            >
              <div className="d-flex align-items-stretch flex-grow-1">
                <div className="d-flex align-items-center justify-content-between flex-grow-1 p-0 px-2">
                  <div className="flex-grow-1 me-4 text-truncate">
                    <span className="mb-2 fw-semibold" style={{ fontFamily: "Ziro"}}>
                    {questionTitle}
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-3 flex-shrink-0 text-nowrap">
                    <span className="fw-semibold small" style={{ color: difficultyColor }}>
                      {difficultyLabel}
                    </span>
                    <span className="fw-semibold small text-primary">
                      Score: {question.score.replace('/', ' / ')}
                    </span>
                  </div>
                </div>
                <button
                className={`btn fw-semibold position-relative d-flex align-items-center justify-content-center border-0 text-white shadow-sm`}
                style={{
                  minWidth: "80px",
                  backgroundColor: isSolved ? "#12B500" : "#E0E0E0",
                  borderRadius: "0 0.5rem 0.5rem 0",
                  transition: "background-color 0.2s ease",
                  alignSelf: "stretch",
                }}
                onMouseEnter={(e) => {
                  if (!isSolved) {
                    e.currentTarget.style.backgroundColor = "#D0D0D0";
                  } else {
                    e.currentTarget.style.backgroundColor = "#10A000";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSolved) {
                    e.currentTarget.style.backgroundColor = "#E0E0E0";
                  } else {
                    e.currentTarget.style.backgroundColor = "#12B500";
                  }
                }}
                onClick={() => {
                  sessionStorage.setItem(
                    "currentQuestionIndex",
                    questions.indexOf(question).toString()
                  );
                  navigate(navigateTo, { replace: true });
                }}
              >
                <span
                  className="position-absolute start-0 top-0 bottom-0 bg-white"
                  style={{ width: "3px" }}
                />
                {isSolved ? "Solved" : "Solve"}
              </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CodingContent;

