import React from "react";

interface QuestionNavProps {
  totalQuestions: number;
  currentIndex: number;
  onQuestionClick: (index: number) => void;
  questionLabel?: string; // Optional label prefix (e.g., "Q" for MCQ, "C" for Coding)
}

const QuestionNav: React.FC<QuestionNavProps> = ({
  totalQuestions,
  currentIndex,
  onQuestionClick,
  questionLabel = "Q",
}) => {
  return (
    <div
      className="d-flex flex-column align-items-center"
      style={{ width: "80px", overflowY: "auto", maxHeight: "100%" }}
    >
      {Array.from({ length: totalQuestions }).map((_, index) => (
        <button
          key={index}
          className="btn border border-muted rounded-2 my-1 px-1 mx-auto"
          style={{
            width: "50px",
            height: "55px",
            backgroundColor: index === currentIndex ? "#42FF58" : "#fff",
            color: index === currentIndex ? "#000" : "#000",
            cursor: "pointer",
          }}
          onClick={() => onQuestionClick(index)}
        >
          <span>
            {questionLabel}
            {index + 1}
          </span>
        </button>
      ))}
    </div>
  );
};

export default QuestionNav;

