import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { secretKey } from './constants';
import CryptoJS from 'crypto-js';

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
  Template: string;
  Explanation: string;
  LastUpdated: string;
  Qn_name: string;
  question_status: string;
  user_answer?: string;
}

const TestMcq: React.FC = () => {
  const encryptedStudentId = sessionStorage.getItem('StudentId') || "";
  const decryptedStudentId = CryptoJS.AES.decrypt(encryptedStudentId!, secretKey).toString(CryptoJS.enc.Utf8);
  const studentId = decryptedStudentId;
  const encryptedTestId = sessionStorage.getItem("TestId") || "";
  const decryptedTestId = CryptoJS.AES.decrypt(encryptedTestId!, secretKey).toString(CryptoJS.enc.Utf8);
  const testId = decryptedTestId;
  const encryptedSubject = sessionStorage.getItem("Subject") || "";
  const decryptedSubject = CryptoJS.AES.decrypt(encryptedSubject!, secretKey).toString(CryptoJS.enc.Utf8);
  const subject = decryptedSubject;
  const encryptedSubjectId = sessionStorage.getItem("SubjectId") || "";
  const decryptedSubjectId = CryptoJS.AES.decrypt(encryptedSubjectId!, secretKey).toString(CryptoJS.enc.Utf8);
  const subjectId = decryptedSubjectId;
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
      const url=`${process.env.REACT_APP_BACKEND_URL}api/student/test/questions/${studentId}/${testId}/mcq/`
      try {
        const response = await axios.get(url);
        const shuffledQuestions = response.data.qns_data.mcq.map((q: Question) => ({
          ...q,
          options: shuffleArray(q.options)
        }));
        setQuestions(shuffledQuestions);
        setAnsweredQuestions(Array(shuffledQuestions.length).fill(null));
        setSkippedQuestions(Array(shuffledQuestions.length).fill(false));

        const urlParams = new URLSearchParams(location.search);
        const indexParam = urlParams.get('index');
        if (indexParam !== null) {
          setCurrentQuestion(parseInt(indexParam, 10));
        }

        setLoading(false);
      } 
      catch (innerError: any) {
        setLoading(false);
            const errorData = innerError.response?.data || {
                message: innerError.message,
                stack: innerError.stack
            };
 
            const body = {
                student_id: actualStudentId,
                Email: actualEmail,
                Name: actualName,
                URL_and_Body: `${url}\n + ""`,
                error: errorData.error,
            };
 
            try {
                await axios.post(
                `${process.env.REACT_APP_BACKEND_URL}api/errorlog/`,
                body
                );
            } catch (loggingError) {
                console.error("Error logging the mcq questions error:", loggingError);
            }
 
            console.error("Error fetching MCQ questions data:", innerError);
            }
    };

    fetchQuestions();
  }, [location.search]);

  useEffect(() => {
    if (questions.length > 0) {
      setSelectedOption(questions[currentQuestion].user_answer || null);
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

  const handleOptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedOption(event.target.value);
  };

  const handleNext = () => {
    if (selectedOption) {
      setShowSkipConfirmation(true);
    } else {
      setShowSkipConfirmation(true);
    }
  };

  const handleSubmit = async () => {
    if (selectedOption) {
      setIsSubmitting(true);

      // Optimistic update
      const newAnsweredQuestions = [...answeredQuestions];
      newAnsweredQuestions[currentQuestion] = selectedOption;
      setAnsweredQuestions(newAnsweredQuestions);
      setSelectedOption(null);
      const url=`${process.env.REACT_APP_BACKEND_URL}api/student/test/questions/submit/mcq/`
      try {
        await axios.put(url, {
          student_id: studentId,
          question_id: questions[currentQuestion].Qn_name || "ranjitha",
          test_id: testId,
          correct_ans: questions[currentQuestion].correct_answer,
          entered_ans: selectedOption,
          subject_id: subjectId,
          subject: subject,
          week_number: 1,
          day_number: 1
        });
      } 
      catch (innerError: any) {

        const revertedAnsweredQuestions = [...answeredQuestions];
        revertedAnsweredQuestions[currentQuestion] = null;
        setAnsweredQuestions(revertedAnsweredQuestions);
        setSelectedOption(selectedOption);
        
            const errorData = innerError.response?.data || {
                message: innerError.message,
                stack: innerError.stack
            };
 
            const body = {
                student_id: actualStudentId,
                Email: actualEmail,
                Name: actualName,
                URL_and_Body: `${url}\n + ""`,
                error: errorData.error,
            };
 
            try {
                await axios.post(
                `${process.env.REACT_APP_BACKEND_URL}api/errorlog/`,
                body
                );
            } catch (loggingError) {
                console.error("Error logging the mcq questions error:", loggingError);
            }
 
            console.error("Error fetching mcq questions data:", innerError);
            } finally {
        setIsSubmitting(false);
        setShowSubmitConfirmation(false);
      }
    }
  };

  const handleConfirmation = (confirm: boolean) => {
    setShowSubmitConfirmation(false);
    setShowSkipConfirmation(false);
    if (confirm) {
      if (selectedOption) {
        const newAnsweredQuestions = [...answeredQuestions];
        newAnsweredQuestions[currentQuestion] = selectedOption;
        setAnsweredQuestions(newAnsweredQuestions);
      } else {
        const newSkippedQuestions = [...skippedQuestions];
        newSkippedQuestions[currentQuestion] = true;
        setSkippedQuestions(newSkippedQuestions);
      }
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedOption(null);
      }
    } else {
      setSelectedOption(null);
    }
  };

  const handleQuestionClick = (index: number) => {
    setCurrentQuestion(index);
    setSelectedOption(answeredQuestions[index] || null);

    sessionStorage.setItem("mcqCurrentQuestionIndex", index.toString());
  };

  const handleTestSectionPage = () => {
    sessionStorage.setItem("mcqCurrentQuestionIndex", currentQuestion.toString());
    navigate('/test-section');
  };

  if (loading) {
    return (
      <div className="container-fluid p-0" style={{ height: "100vh", maxWidth: "100%", overflowX: "hidden", overflowY: "auto", backgroundColor: "#f2eeee" }}>
        <div className="p-0 my-0 me-2" style={{ backgroundColor: "#F2EEEE" }}>
          <div className="container-fluid p-0 pt-2" style={{ maxWidth: "100%", overflowX: "hidden", overflowY: "auto", backgroundColor: "#f2eeee" }}>
            <div className="row g-2">
              <div className="col-12">
                <div className="bg-white border rounded-2 py-3 ps-3" style={{ height: "calc(100vh - 60px)", overflowY: "auto" }}>
                  <div className="d-flex h-100">
                    <div className="d-flex flex-column align-items-center" style={{ width: "80px", marginLeft: "-20px" }}>
                      {Array(10).fill(0).map((_, index) => (
                        <div key={index} className="btn border border-dark rounded-2 my-1 px-3 mx-auto" style={{ width: "50px", height: "55px", backgroundColor: "#fff", color: "#000" }}></div>
                      ))}
                    </div>
                    <div className="col-11 lg-8 me-3" style={{ height: "100%", flex: 1 }}>
                      <div className="border border-dark rounded-2 d-flex flex-column" style={{ height: "calc(100% - 5px)", backgroundColor: "#E5E5E533" }}>
                        <div className="p-3 mt-2">
                          <div className="skeleton-loader" style={{ height: "20px", width: "100%", backgroundColor: "#ddd" }}></div>
                          {Array(4).fill(0).map((_, index) => (
                            <div key={index} className="skeleton-loader mt-2" style={{ height: "20px", width: "100%", backgroundColor: "#ddd" }}></div>
                          ))}
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
  }

  return (
    <div className="container-fluid p-0" style={{ height: "100vh", maxWidth: "100%", overflowX: "hidden", overflowY: "auto", backgroundColor: "#f2eeee" }}>
      <div className="p-0 my-0 me-2" style={{ backgroundColor: "#F2EEEE" }}>
        <div className="container-fluid p-0 pt-2" style={{ maxWidth: "100%", overflowX: "hidden", overflowY: "auto", backgroundColor: "#f2eeee" }}>
          <div className="row g-2">
            <div className="col-12">
              <div className="bg-white border rounded-2 py-3 ps-3" style={{ height: "calc(100vh - 60px)", overflowY: "auto" }}>
                <div className="d-flex h-100">
                  <div className="d-flex flex-column align-items-center" style={{ width: "80px", marginLeft: "-20px" }}>
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
                  <div className="col-11 lg-8 me-3" style={{ height: "100%", flex: 1 }}>
                    <div className="border border-dark rounded-2 d-flex flex-column" style={{ height: "calc(100% - 5px)", backgroundColor: "#E5E5E533" }}>
                      <div className="p-3 mt-2">
                        <h4>{questions[currentQuestion].question}</h4>
                        {questions[currentQuestion].options.map((option, index) => (
                          <div key={index} className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name="option"
                              value={option}
                              checked={selectedOption === option || answeredQuestions[currentQuestion] === option}
                              onChange={handleOptionChange}
                              disabled={answeredQuestions[currentQuestion] !== null || skippedQuestions[currentQuestion] || questions[currentQuestion].question_status === "Submitted"}
                              style={{ cursor: 'pointer', border: '1px solid #000',
                              borderRadius: '50%',
                              padding: '2px'  }}
                              onClick={() => {
                                if (!answeredQuestions[currentQuestion] && !skippedQuestions[currentQuestion] && questions[currentQuestion].question_status !== "Submitted") {
                                  setSelectedOption(option);
                                }
                              }}
                            />
                            <label className="form-check-label" style={{ cursor: 'pointer' }}
                              onClick={() => {
                                if (!answeredQuestions[currentQuestion] && !skippedQuestions[currentQuestion] && questions[currentQuestion].question_status !== "Submitted") {
                                  setSelectedOption(option);
                                }
                              }}>{option}</label>
                          </div>
                        ))}
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
                        disabled={!selectedOption || answeredQuestions[currentQuestion] !== null || isSubmitting || questions[currentQuestion].question_status === "Submitted"}
                      >
                        {answeredQuestions[currentQuestion] !== null || questions[currentQuestion].question_status === "Submitted"
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
                        ) : (
                          <button
                            className="btn btn-sm border btn btn-light border-dark"
                            style={{
                              whiteSpace: "nowrap",
                              minWidth: "100px",
                              height: "35px"
                            }}
                            onClick={handleTestSectionPage}
                          >
                            Test Section
                          </button>
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
    </div>
  );
};

export default TestMcq;
