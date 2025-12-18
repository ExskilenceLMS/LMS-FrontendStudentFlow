import React from "react";
import { Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import CryptoJS from "crypto-js";
import { secretKey } from "../constants";

interface CodingQuestion {
  id: number;
  question: string;
  score: string;
  isSolved: boolean;
}

interface CodingContentProps {
  questions: CodingQuestion[];
  currentIndex: number;
  totalQuestions: number;
  onQuestionChange: (index: number) => void;
  subject: string;
  loading?: boolean;
}

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

  const url = (subject: string): string => {
    if (subject.toLowerCase().includes("python")) {
      return "/py-editor";
    } else if (subject.toLowerCase().includes("sql")) {
      return "/sql-editor";
    } else if (
      subject.toLowerCase().includes("html") ||
      subject.toLowerCase().includes("css") ||
      subject.toLowerCase().includes("javascript") ||
      subject.toLowerCase().includes("js")
    ) {
      return "/html-css-editor";
    }
    return "/html-css-editor";
  };

  const navigateTo = url(subject);

  return (
    <div className="d-flex flex-grow-1 h-100" style={{ height: "100%" }}>
      <div
        className="p-3 CodingInfo flex-grow-1"
        style={{ height: "calc(100%)", overflow: "auto" }}
      >
        {questions.map((question) => (
          <div key={question.id} className="mb-4">
            <div className="d-flex align-items-start justify-content-between">
              <div className="d-flex flex-column">
                <div className="d-flex align-items-start">
                  <span className="me-2">{question.id}.</span>
                  <span style={{ wordBreak: "break-word" }}>
                    {question.question &&
                    question.question.length >
                      (window.innerWidth < 600
                        ? 30
                        : window.innerWidth < 1024
                        ? 50
                        : 80)
                      ? question.question.slice(
                          0,
                          window.innerWidth < 1000
                            ? 30
                            : window.innerWidth < 1200
                            ? 50
                            : window.innerWidth < 1400
                            ? 80
                            : 100
                        ) + "..."
                      : question.question || "No question text available"}
                  </span>
                </div>
              </div>
              <div
                className="d-flex align-items-center gap-5"
                style={{ minWidth: "275px" }}
              >
                <button
                  className={`btn me-3`}
                  style={{
                    minWidth: "80px",
                    backgroundColor: question.isSolved ? "#63F67E" : "#D4DCFF",
                    border: "1px solid black",
                    color: "black",
                  }}
                  onClick={() => {
                    sessionStorage.setItem(
                      "currentQuestionIndex",
                      questions.indexOf(question).toString()
                    );
                    navigate(navigateTo, { replace: true });
                  }}
                >
                  {question.isSolved ? "Solved" : "Solve"}
                </button>
                <div className="me-3">Score: {question.score}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CodingContent;

