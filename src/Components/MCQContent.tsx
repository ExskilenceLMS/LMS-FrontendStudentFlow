import React, { useState, useCallback, useEffect } from "react";
import { Spinner } from "react-bootstrap";
import QuestionNav from "./QuestionNav";
import { getApiClient } from "../utils/apiAuth";
import CryptoJS from "crypto-js";
import { secretKey } from "../constants";

interface MCQOption {
  id: string;
  text: string;
}

interface MCQQuestion {
  shuffledOptions: any;
  questionId: string;
  status: boolean;
  score: string;
  level: string;
  question: string;
  options: string[];
  correct_answer: string;
  Explanation?: string;
  Qn_name: string;
  entered_ans: string;
}

interface MCQContentProps {
  currentQuestion: MCQQuestion | null | undefined;
  currentIndex: number;
  totalQuestions: number;
  onQuestionChange: (index: number) => void;
  onAnswerSubmit?: (questionId: string, isCorrect: boolean) => void;
  loading?: boolean;
}

const MCQContent: React.FC<MCQContentProps> = ({
  currentQuestion,
  currentIndex,
  totalQuestions,
  onQuestionChange,
  onAnswerSubmit,
  loading = false,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<{
    [key: string]: string;
  }>({});
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(
    new Set()
  );
  const [submittedAnswers, setSubmittedAnswers] = useState<{
    [key: string]: boolean;
  }>({});

  const shuffleArray = (array: string[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Initialize shuffled options if not present
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);

  useEffect(() => {
    if (currentQuestion?.shuffledOptions) {
      setShuffledOptions(currentQuestion.shuffledOptions);
    } else if (currentQuestion?.options) {
      const shuffled = shuffleArray(
        Array.isArray(currentQuestion.options)
          ? [...currentQuestion.options]
          : []
      );
      setShuffledOptions(shuffled);
      // Store shuffled options back to question object for persistence
      if (currentQuestion) {
        currentQuestion.shuffledOptions = shuffled;
      }
    }
  }, [currentQuestion?.Qn_name, currentQuestion?.options]);

  // Get decrypted values from sessionStorage (before early return)
  const encryptedStudentId = sessionStorage.getItem("StudentId") || "";
  const decryptedStudentId = CryptoJS.AES.decrypt(
    encryptedStudentId,
    secretKey
  ).toString(CryptoJS.enc.Utf8);
  const studentId = decryptedStudentId;

  const encryptedSubjectId = sessionStorage.getItem("SubjectId");
  const decryptedSubjectId = encryptedSubjectId
    ? CryptoJS.AES.decrypt(encryptedSubjectId, secretKey).toString(CryptoJS.enc.Utf8)
    : "";
  const subjectId = decryptedSubjectId;

  const encryptedSubject = sessionStorage.getItem("Subject");
  const decryptedSubject = encryptedSubject
    ? CryptoJS.AES.decrypt(encryptedSubject, secretKey).toString(CryptoJS.enc.Utf8)
    : "";
  const subject = decryptedSubject;

  const encryptedDayNumber = sessionStorage.getItem("DayNumber");
  const decryptedDayNumber = encryptedDayNumber
    ? CryptoJS.AES.decrypt(encryptedDayNumber, secretKey).toString(CryptoJS.enc.Utf8)
    : "";
  const dayNumber = decryptedDayNumber;

  const encryptedWeekNumber = sessionStorage.getItem("WeekNumber");
  const decryptedWeekNumber = encryptedWeekNumber
    ? CryptoJS.AES.decrypt(encryptedWeekNumber, secretKey).toString(CryptoJS.enc.Utf8)
    : "";
  const weekNumber = decryptedWeekNumber;

  const encryptedCourseId = sessionStorage.getItem("CourseId");
  const decryptedCourseId = encryptedCourseId
    ? CryptoJS.AES.decrypt(encryptedCourseId, secretKey).toString(CryptoJS.enc.Utf8)
    : "";

  const encryptedBatchId = sessionStorage.getItem("BatchId");
  const decryptedBatchId = encryptedBatchId
    ? CryptoJS.AES.decrypt(encryptedBatchId, secretKey).toString(CryptoJS.enc.Utf8)
    : "";

  const handleAnswerSelect = useCallback(
    (questionId: string, option: string) => {
      setSelectedAnswers((prev) => ({
        ...prev,
        [questionId]: option,
      }));
    },
    []
  );

  const handleSubmitAnswer = useCallback(
    async (questionId: string, correctAnswer: string) => {
      const isCorrect = selectedAnswers[questionId] === correctAnswer;

      setSubmittedAnswers((prev) => ({
        ...prev,
        [questionId]: isCorrect,
      }));

      setAnsweredQuestions((prev) => {
        const newSet = new Set(prev);
        newSet.add(questionId);
        return newSet;
      });

      const submissionData = {
        student_id: studentId,
        question_id: questionId,
        correct_ans: correctAnswer,
        entered_ans: selectedAnswers[questionId],
        subject_id: subjectId,
        subject: subject.split(" ")[0],
        week_number: parseInt(weekNumber),
        day_number: parseInt(dayNumber),
        course_id: decryptedCourseId,
        batch_id: decryptedBatchId,
      };

      const url = `${process.env.REACT_APP_BACKEND_URL}api/student/practicemcq/submit/`;
      try {
        const response = await getApiClient().post(url, submissionData);

        // Trigger MCQ status API in loop after successful submission
        await triggerMCQStatusAPI(submissionData);

        if (onAnswerSubmit) {
          onAnswerSubmit(questionId, isCorrect);
        }
      } catch (error: any) {
        console.error("Error submitting answer:", error);
      }
    },
    [
      selectedAnswers,
      studentId,
      subject,
      subjectId,
      weekNumber,
      dayNumber,
      decryptedCourseId,
      decryptedBatchId,
      onAnswerSubmit,
    ]
  );

  // Show loader while loading
  if (loading || !currentQuestion) {
    return (
      <div className="d-flex justify-content-center align-items-center h-100">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  // shuffledOptions is now from state
  const score = currentQuestion.score;
  const questionId = currentQuestion.Qn_name;
  const isAnswered =
    currentQuestion.entered_ans !== "" || answeredQuestions.has(questionId);
  const isCorrect = submittedAnswers[questionId];

  // Function to trigger MCQ status API in loop
  const triggerMCQStatusAPI = async (submissionData: any) => {
    const statusUrl = `${process.env.REACT_APP_BACKEND_URL}api/student/practice/mcq/status/`;
    let maxAttempts = 3;
    let attempt = 0;

    while (attempt < maxAttempts) {
      try {
        const response = await getApiClient().put(statusUrl, submissionData);
        if (response.data?.message === true) {
          break;
        } else {
          attempt++;
          if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      } catch (error: any) {
        attempt++;
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }
  };

  return (
    <div className="d-flex flex-grow-1 h-100" style={{ height: "100%" }}>
      <QuestionNav
        totalQuestions={totalQuestions}
        currentIndex={currentIndex}
        onQuestionClick={onQuestionChange}
        questionLabel="Q"
      />

      <div
        className="flex-grow-1 d-flex flex-column"
        style={{ height: "100%", width: "min-content" }}
      >
        <div
          className="border border-muted"
          style={{
            height: "100%",
            overflow: "auto",
            boxShadow: "#00000033 0px 0px 5px 0px inset",
            maxHeight: "100%",
          }}
        >
          <div className="p-3">
            <div className="mb-4">
              <div className="d-flex justify-content-between mb-3">
                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    wordWrap: "break-word",
                    overflowWrap: "break-word",
                    width: "70%",
                    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                    fontSize: "16px",
                    lineHeight: "1.6",
                    color: "#333",
                  }}
                >
                  {currentQuestion.question}
                </div>
                <div
                  style={{
                    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "#333",
                    display: "inline-block",
                    whiteSpace: "nowrap",
                    minWidth: "120px",
                    textAlign: "right",
                  }}
                >
                  Score : {score}
                </div>
              </div>

              <div className="row g-2">
                {shuffledOptions.map(
                  (
                    option:
                      | string
                      | number
                      | boolean
                      | React.ReactElement<any, string | React.JSXElementConstructor<any>>
                      | Iterable<React.ReactNode>
                      | null
                      | undefined,
                    index: React.Key | null | undefined
                  ) => {
                    const isSelected = selectedAnswers[questionId] === option;
                    const isCorrectOption =
                      option === currentQuestion.correct_answer;
                    const isWrongOption = option === currentQuestion.entered_ans;

                    let bgColor = "";
                    if (!isAnswered) {
                      bgColor = isSelected ? "#E0E0E0" : "";
                    } else {
                      if (isCorrectOption) {
                        bgColor = "#BAFFCE";
                      } else if (isSelected || isWrongOption) {
                        bgColor = "#FFC9C9";
                      }
                    }

                    return (
                      <div
                        key={index}
                        className="col-6 d-flex align-items-center mb-2"
                      >
                        <div
                          className="me-2 mx-3"
                          style={{
                            fontFamily:
                              "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#333",
                          }}
                        >
                          {String.fromCharCode(65 + (index as number))}.{" "}
                        </div>

                        <button
                          className="btn px-2 py-1 rounded-2 border border-muted"
                          style={{
                            backgroundColor: bgColor,
                            height: "100%",
                            width: "100%",
                            overflowWrap: "break-word",
                            whiteSpace: "pre-wrap",
                            textAlign: "left",
                            boxShadow: "#00000033 0px 5px 4px",
                            fontFamily:
                              "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                            fontSize: "14px",
                            fontWeight: "500",
                            color: "#333",
                          }}
                          onClick={() => {
                            if (!isAnswered) {
                              handleAnswerSelect(questionId, option as string);
                            }
                          }}
                          disabled={isAnswered}
                        >
                          {option}
                        </button>
                      </div>
                    );
                  }
                )}
              </div>

              {isAnswered ? (
                <button
                  className="btn btn-outline-light mt-3 roadmap-button text-light"
                  disabled={true}
                >
                  Submitted
                </button>
              ) : (
                <button
                  className="btn btn-outline-light mt-3 roadmap-button text-light"
                  onClick={() =>
                    handleSubmitAnswer(questionId, currentQuestion.correct_answer)
                  }
                  disabled={!selectedAnswers[questionId]}
                >
                  Submit
                </button>
              )}
              {isAnswered && currentQuestion.Explanation && (
                <div
                  className="mt-4 border rounded-2 p-2"
                  style={{
                    backgroundColor: "white",
                    boxShadow: "#00000033 0px 5px 4px",
                    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                    fontSize: "14px",
                    color: "#333",
                  }}
                >
                  <strong
                    style={{
                      fontFamily:
                        "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#333",
                    }}
                  >
                    Explanation:
                  </strong>
                  <div
                    style={{
                      fontFamily:
                        "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                      fontSize: "14px",
                      lineHeight: "1.5",
                      color: "#333",
                      marginTop: "8px",
                    }}
                  >
                    {currentQuestion.Explanation}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MCQContent;

