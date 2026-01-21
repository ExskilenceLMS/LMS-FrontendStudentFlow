import React, { useState, useEffect } from "react";
import apiClient from "../utils/apiAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { Spinner } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { secretKey } from "../constants";
interface Question {
  level: string;
  CreatedBy: string;
  subject_id: string;
  topic_id: string;
  subtopic_id: string;
  question: string;
  options: string[];
  correct_answer: string;
  Tags: string[];
  Template: number;
  Explanation: string;
  Qn_name: string;
  user_answer?: string;
}

const TestingMCQS: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<(string | null)[]>([]);
  const [skippedQuestions, setSkippedQuestions] = useState<boolean[]>([]);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState<boolean>(false);
  const [showSkipConfirmation, setShowSkipConfirmation] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const actualStudentId= CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualEmail= CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualName= CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);


  useEffect(() => {
    const fetchQuestions = async () => {
      const url=`${process.env.REACT_APP_BACKEND_URL}mcqtesting/`
      try {
        const response = await apiClient.get(
          url
        );

        const shuffledQuestions = response.data.map((q: Question) => ({
          ...q,
          options: shuffleArray(q.options),
        }));

        setQuestions(shuffledQuestions);
        setAnsweredQuestions(Array(shuffledQuestions.length).fill(null));
        setSkippedQuestions(Array(shuffledQuestions.length).fill(false));

        setLoading(false);
      } catch (innerError: any) {
        setLoading(false);
        console.error("Error fetching testing mcq data:", innerError);
      }
    };

    fetchQuestions();
  }, [location.search]);

  useEffect(() => {
    if (questions.length > 0 && currentQuestion < questions.length) {
      const userAnswer = questions[currentQuestion].user_answer;
      setSelectedOption(userAnswer || null);

      const storedAnswers = localStorage.getItem('mcqAnswers');
      if (storedAnswers) {
        const parsedAnswers = JSON.parse(storedAnswers);
        if (parsedAnswers[currentQuestion]) {
          setSelectedOption(parsedAnswers[currentQuestion]);
        }
      }
    }
  }, [currentQuestion, questions]);

  const shuffleArray = (array: any[]) => {
    const shuffledArray = [...array];
    for (let i = shuffledArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
    }
    return shuffledArray;
  };

  const handleOptionChange = (option: string) => {
    setSelectedOption(option);
  };

  const handleNext = () => {
    if (selectedOption) {
      setShowSkipConfirmation(true);
    } else {
      setShowSkipConfirmation(true);
    }
  };

  const handleQuestionClick = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestion(index);
      setSelectedOption(answeredQuestions[index] || null);
      sessionStorage.setItem("mcqCurrentQuestionIndex", index.toString());
    }
  };

  const handleSubmit = () => {
    const updatedAnsweredQuestions = [...answeredQuestions];
    updatedAnsweredQuestions[currentQuestion] = selectedOption;
    setAnsweredQuestions(updatedAnsweredQuestions);

    const storedAnswers = localStorage.getItem('mcqAnswers');
    let parsedAnswers = storedAnswers ? JSON.parse(storedAnswers) : Array(questions.length).fill(null);
    parsedAnswers[currentQuestion] = selectedOption;
    localStorage.setItem('mcqAnswers', JSON.stringify(parsedAnswers));

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="container-fluid p-0 d-flex justify-content-center align-items-center" style={{ height: "calc(100vh - 60px)"}}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (questions.length === 0) {
    return <div>No questions available.</div>;
  }

  return (
    <div className="container-fluid p-0" style={{ height: `calc(100vh - 80px)` , overflowY: "auto", border: '1px solid #ABABAB' }}>
      <div className="p-0 my-0 me-2" style={{ backgroundColor: "#F2EEEE" }}>
        <div className="container-fluid p-0 pt-2" style={{ maxWidth: "100%", overflowX: "hidden", overflowY: "auto", backgroundColor: "#f2eeee" }}>
          <div className="row g-2">
            <div className="col-12">
              <div className="bg-white border rounded-2 py-3 ps-3" style={{ height: "calc(100vh - 60px)", overflowY: "auto" }}>
                <div className="d-flex">
                  <div className="d-flex flex-column align-items-center pe-2" style={{ width: "100px", height: "calc(100vh - 60px)", overflowY: "auto", marginLeft: "-20px" }}>
                    {questions.map((_, index) => (
                      <button
                        key={index}
                        className="btn border border-dark rounded-2 my-1 px-3 mx-auto"
                        style={{
                          width: "60px",
                          height: "55px",
                          backgroundColor: currentQuestion === index ? "#42FF58" : "#fff",
                          color: "#000",
                          opacity: answeredQuestions[index] !== null || skippedQuestions[index] ? 0.5 : 1
                        }}
                        onClick={() => handleQuestionClick(index)}
                      >
                        Q{index + 1}
                      </button>
                    ))}
                  </div>
                  <div className="col-11 lg-8 me-3" style={{ height: "calc(114vh - 60px)", overflowY: "auto", flex: 1 }}>
                    <div className="border border-dark rounded-2 d-flex flex-column" style={{ height: "calc(100% - 5px)", backgroundColor: "#E5E5E533" }}>
                      <div className="p-3 mt-2">
                        <h4>{questions[currentQuestion].Qn_name}</h4>
                        <h4>{questions[currentQuestion].question}</h4>
                        {questions[currentQuestion].options.map((option, index) => {
                          const isSelected = selectedOption === option;
                          const isCorrect = option === questions[currentQuestion].correct_answer;
                          const isWrong = isSelected && !isCorrect;
                          const isSubmitted = answeredQuestions[currentQuestion] !== null;

                          return (
                            <div key={index} className="form-check">
                              <input
                                className="form-check-input"
                                type="radio"
                                name="option"
                                value={option}
                                checked={isSelected}
                                onChange={() => handleOptionChange(option)}
                                disabled={isSubmitted}
                                style={{ cursor: 'pointer', border: '1px solid #000', borderRadius: '50%', padding: '2px' }}
                              />
                              <label
                                className="form-check-label"
                                style={{
                                  cursor: 'pointer',
                                  backgroundColor: isSubmitted ? (isCorrect ? '#d4edda' : isWrong ? '#f8d7da' : 'transparent') : 'transparent'
                                }}
                                onClick={() => {
                                  if (!isSubmitted) {
                                    handleOptionChange(option);
                                  }
                                }}
                              >
                                {option}
                              </label>
                            </div>
                          );
                        })}
                        {answeredQuestions[currentQuestion] !== null && (
                          <div className="mt-3 p-2 bg-light border rounded">
                            <strong>Explanation:</strong> {questions[currentQuestion].Explanation}
                          </div>
                        )}
                      </div>
                      <div className="d-flex justify-content-end ms-2 mt-5 p-2 me-5 pe-5">
                        <button
                          className="btn btn-sm border btn btn-light border-dark me-2"
                          style={{
                            whiteSpace: "nowrap",
                            minWidth: "100px",
                            height: "35px"
                          }}
                          onClick={handleSubmit}
                          disabled={selectedOption === null || answeredQuestions[currentQuestion] !== null || isSubmitting}
                        >
                          {answeredQuestions[currentQuestion] !== null
                            ? "Submitted"
                            : isSubmitting
                            ? "Submitting..."
                            : "Submit"}
                        </button>

                        {currentQuestion < questions.length - 1 ? (
                          <button
                            className="btn btn-sm border btn btn-light border-dark"
                            style={{
                              whiteSpace: "nowrap",
                              minWidth: "100px",
                              height: "35px"
                            }}
                            onClick={() => {
                              if (currentQuestion < questions.length - 1) {
                                setCurrentQuestion(currentQuestion + 1);
                                setSelectedOption(null);
                              }
                            }}
                            disabled={isSubmitting}
                          >
                            Next
                          </button>
                        ) : null}
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
  );
};

export default TestingMCQS;
