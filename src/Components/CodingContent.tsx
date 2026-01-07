import React from "react";
import { useNavigate } from "react-router-dom";
import CryptoJS from "crypto-js";
import { secretKey, LEVEL_TO_DIFFICULTY, DIFFICULTY_COLORS, getQuestionTitleMaxLength } from "../constants";
import { CodingQuestion } from "../utils/projectStorageUtils";
import LoaderComponent from "./LoaderComponent";

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
      <LoaderComponent />
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


  return (
    <div className="d-flex flex-column flex-grow-1 h-100 overflow-auto">
  <div className="flex-grow-1 w-100">
    {questions.map((question) => {
      const isSolved =
        question.status !== undefined ? question.status : question.isSolved;

      const difficultyLabel = getDifficultyLabel(question.level);
      const difficultyColor = getDifficultyColor(question.level);
      const questionTitle = question.Qn;

      return (
        <div
          key={question.id}
          className="mb-3 rounded-3 d-flex flex-column bg-white shadow-sm cursor-pointer"
          style={{
            minHeight: "50x",
            transition: "box-shadow 0.2s ease, transform 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.classList.remove("shadow-sm");
            e.currentTarget.classList.add("shadow");
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.classList.remove("shadow");
            e.currentTarget.classList.add("shadow-sm");
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div className="d-flex align-items-stretch">
            {/* LEFT CONTENT */}
            <div className="d-flex align-items-center flex-grow-1 px-3 py-2 gap-3">
              {/* QUESTION TITLE */}
              <div className="flex-grow-1 overflow-hidden" style={{ minWidth: 0 }}>
                <span
                  className="fw-semibold d-block small"
                  style={{
                    fontFamily: "Ziro",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={questionTitle}
                >
                  {(() => {
                    const maxLength = getQuestionTitleMaxLength();

                    return questionTitle.length > maxLength
                      ? `${questionTitle.substring(0, maxLength)}...`
                      : questionTitle;
                  })()}
                </span>
              </div>

              {/* LEVEL COLUMN */}
              <div
                className="d-flex align-items-center justify-content-end text-nowrap"
                style={{ minWidth: "90px" }}
              >
                <span
                  className="fw-semibold small"
                  style={{ color: difficultyColor }}
                >
                  {difficultyLabel}
                </span>
              </div>

              {/* SCORE COLUMN */}
              <div
                className="d-flex align-items-center justify-content-end text-nowrap"
                style={{ minWidth: "110px" }}
              >
                <span className="fw-semibold small text-primary">
                  Score: {question.score.replace("/", " / ")}
                </span>
              </div>
            </div>

            {/* ACTION BUTTON */}
            <button
              className={`btn fw-semibold position-relative d-flex align-items-center justify-content-center border-0 text-white shadow-sm ${
                isSolved ? "coding-button-solved" : "coding-button-unsolved"
              }`}
              style={{
                minWidth: "90px",
                borderRadius: "0 0.5rem 0.5rem 0",
              }}
              onClick={() => {
                sessionStorage.setItem(
                  "currentQuestionIndex",
                  questions.indexOf(question).toString()
                );
                navigate("/coding-challenges-editor", { replace: true });
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

