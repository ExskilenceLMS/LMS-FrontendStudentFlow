import React, { useState, useEffect } from "react";
import { getApiClient } from "./utils/apiAuth";
import { useLocation, useNavigate } from "react-router-dom";
import CryptoJS from "crypto-js";
import { secretKey } from "./constants";
import { updateIndexParameter } from './utils/urlUtils';
import "bootstrap/dist/css/bootstrap.min.css";

interface QuestionData {
  Tags: string[];
  level: string;
  options: string[];
  Template: number;
  question: string;
  topic_id: string;
  CreatedBy: string;
  subject_id: string;
  Explanation: string;
  subtopic_id: string;
  correct_answer: string;
}

interface Question {
  Qn_name: string;
  Qn: string;
  Level: string;
  question_type: string;
  tags: string;
  question_data: QuestionData;
  status?: string;
  user_answer?: string;
  question_status?: string;
  // Additional properties for compatibility
  question: string;
  options: string[];
  correct_answer: string;
  level: string;
  CreatedBy: string;
  subject_id: string;
  topic_id: string;
  subtopic_id: string;
  Tags: string[];
  Template: string;
  Explanation: string;
  LastUpdated: string;
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
  const encryptedSubjectId = sessionStorage.getItem("TestSubjectId") || "";
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
  const [submittingQuestions, setSubmittingQuestions] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [questionStatuses, setQuestionStatuses] = useState<{[key: string]: string}>({});

  // Encryption/Decryption functions for sessionStorage
  const getUserAnswerKey = (qnName: string) => {
    return `userAnswer_${qnName}`;
  };

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

  const encryptData = (data: string): string => {
    return CryptoJS.AES.encrypt(data, secretKey).toString();
  };

  const decryptData = (encryptedData: string): string => {
    const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  };

  useEffect(() => {
    // Get test data from location.state (passed from TestSection) or session storage
    let testData = (location.state as any)?.sectionData;
    
    // If no test data in location.state, try to get it from session storage
    if (!testData) {
      const encryptedTestData = sessionStorage.getItem('testSectionData');
      if (encryptedTestData) {
        try {
          testData = JSON.parse(CryptoJS.AES.decrypt(encryptedTestData, secretKey).toString(CryptoJS.enc.Utf8));

        } catch (error) {
          console.error("Error decrypting test data from session:", error);
        }
      }
    } else {
      // Store test data in session storage for persistence
      const encryptedTestData = CryptoJS.AES.encrypt(JSON.stringify(testData), secretKey).toString();
      sessionStorage.setItem('testSectionData', encryptedTestData);
      
    }
    
    if (testData && testData.qns_data && testData.qns_data.mcq) {
      // Use the MCQ questions from the test data
      const mcqQuestions = testData.qns_data.mcq.map((q: Question) => ({
        ...q,
        options: q.question_data.options ? shuffleArray(q.question_data.options) : [],
        question: q.question_data.question || q.Qn,
        correct_answer: q.question_data.correct_answer,
        level: q.question_data.level || q.Level,
        CreatedBy: q.question_data.CreatedBy,
        subject_id: q.question_data.subject_id,
        topic_id: q.question_data.topic_id,
        subtopic_id: q.question_data.subtopic_id,
        Tags: q.question_data.Tags || [],
        Template: q.question_data.Template?.toString() || "1",
        Explanation: q.question_data.Explanation || "",
        LastUpdated: "",
        question_status: q.status || "Pending"
      }));

      setQuestions(mcqQuestions);
      
      // Initialize answered questions with encrypted data from sessionStorage
      const initialAnswers = Array(mcqQuestions.length).fill(null);
      mcqQuestions.forEach((q: Question, index: number) => {
        const answerKey = getUserAnswerKey(q.Qn_name);
        const encryptedAnswer = sessionStorage.getItem(answerKey);
        if (encryptedAnswer) {
          try {
            const decryptedAnswer = decryptData(encryptedAnswer);
            initialAnswers[index] = decryptedAnswer;
          } catch (error) {
            console.error("Error decrypting answer:", error);
          }
        }
      });
      
      setAnsweredQuestions(initialAnswers);
      setSkippedQuestions(Array(mcqQuestions.length).fill(false));

      // Load question statuses from session storage
      const statuses = getQuestionStatusFromSession();
      setQuestionStatuses(statuses);

      // Get the current question index from session storage or URL params
      const savedIndex = sessionStorage.getItem("mcqCurrentQuestionIndex");
      const urlParams = new URLSearchParams(location.search);
      const indexParam = urlParams.get('index');
      
      let initialIndex = 0;
      if (savedIndex !== null) {
        initialIndex = parseInt(savedIndex, 10);

      } else if (indexParam !== null) {
        initialIndex = parseInt(indexParam, 10);

      } else {

      }
      

      
      // Ensure the index is within bounds
      initialIndex = Math.max(0, Math.min(initialIndex, mcqQuestions.length - 1));
      

      
      setCurrentQuestion(initialIndex);
      
      // Save the initial index to session storage
      sessionStorage.setItem("mcqCurrentQuestionIndex", initialIndex.toString());
      
      // Update URL parameter to match the actual index
      updateIndexParameter(initialIndex);

      setLoading(false);
      
      // Update test duration synchronously on refresh/load
      if ((window as any).updateTimerSync) {
        (window as any).updateTimerSync();
      }
    } else {
      // If no test data available, redirect back to test section
      console.error("No test data found, redirecting to test section");
      navigate('/test-section', { replace: true });
    }
  }, [location.search, location.state, navigate]);

  useEffect(() => {
    if (questions.length > 0) {
      // Check for saved encrypted answer first
      const answerKey = getUserAnswerKey(questions[currentQuestion].Qn_name);
      const encryptedAnswer = sessionStorage.getItem(answerKey);
      if (encryptedAnswer) {
        try {
          const decryptedAnswer = decryptData(encryptedAnswer);
          setSelectedOption(decryptedAnswer);
        } catch (error) {
          console.error("Error decrypting answer:", error);
          setSelectedOption(answeredQuestions[currentQuestion] || null);
        }
      } else {
        setSelectedOption(answeredQuestions[currentQuestion] || null);
      }
    }
  }, [currentQuestion, questions, answeredQuestions]);

  const shuffleArray = (array: any[]) => {
    const shuffledArray = [...array];
    for (let i = shuffledArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
    }
    return shuffledArray;
  };

  const handleOptionChange = (option: string) => {
    // Allow changing option if question is not submitted
    if (questionStatuses[`mcq_${questions[currentQuestion]?.Qn_name}`] !== "Submitted") {
      setSelectedOption(option);
      
      // Encrypt and store the answer in sessionStorage
      if (questions[currentQuestion]?.Qn_name) {
        const answerKey = getUserAnswerKey(questions[currentQuestion].Qn_name);
        const encryptedAnswer = encryptData(option);
        sessionStorage.setItem(answerKey, encryptedAnswer);
      }
    }
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
      // Add current question to submitting set
      setSubmittingQuestions(prev => new Set([...prev, currentQuestion]));

      // Encrypt and store the answer in sessionStorage
      if (questions[currentQuestion]?.Qn_name) {
        const answerKey = getUserAnswerKey(questions[currentQuestion].Qn_name);
        const encryptedAnswer = encryptData(selectedOption);
        sessionStorage.setItem(answerKey, encryptedAnswer);
      }

      // Optimistic update
      const newAnsweredQuestions = [...answeredQuestions];
      newAnsweredQuestions[currentQuestion] = selectedOption;
      setAnsweredQuestions(newAnsweredQuestions);
      setSelectedOption(null);
      const url=`${process.env.REACT_APP_BACKEND_URL}api/student/test/questions/submit/mcq/`
      try {
        const response = await getApiClient().put(url, {
          student_id: studentId,
          question_id: questions[currentQuestion].Qn_name,
          test_id: testId,
          correct_ans: questions[currentQuestion].correct_answer,
          entered_ans: selectedOption,
          subject_id: subjectId,
          week_number: decryptData(sessionStorage.getItem("WeekNumber") || "0") || "0",
          batch_id: decryptData(sessionStorage.getItem("BatchId") || ""),
        });
        
        // Update question status in session storage after successful submission
        const sessionKey = `${testId}_questionStatus`;
        const sessionStatus = sessionStorage.getItem(sessionKey);
        
        if (sessionStatus) {
          try {
            const decryptedStatuses = CryptoJS.AES.decrypt(sessionStatus, secretKey).toString(CryptoJS.enc.Utf8);
            const statuses = JSON.parse(decryptedStatuses);
            
            // Update the status for this question to "Submitted"
            statuses[`mcq_${questions[currentQuestion].Qn_name}`] = "Submitted";
            
            // Re-encrypt and store updated statuses
            const encryptedStatuses = CryptoJS.AES.encrypt(JSON.stringify(statuses), secretKey).toString();
            sessionStorage.setItem(sessionKey, encryptedStatuses);
            
            // Update local state
            setQuestionStatuses(statuses);
            

          } catch (error) {
            console.error("Error updating session status:", error);
          }
        }
      } 
      catch (innerError: any) {
        const revertedAnsweredQuestions = [...answeredQuestions];
        revertedAnsweredQuestions[currentQuestion] = null;
        setAnsweredQuestions(revertedAnsweredQuestions);
        setSelectedOption(selectedOption);
        console.error("Error submitting MCQ answer:", innerError);
      } finally {
        // Remove current question from submitting set
        setSubmittingQuestions(prev => {
          const newSet = new Set(prev);
          newSet.delete(currentQuestion);
          return newSet;
        });
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
    
    // Check for encrypted answer in sessionStorage first
    const answerKey = getUserAnswerKey(questions[index].Qn_name);
    const encryptedAnswer = sessionStorage.getItem(answerKey);
    if (encryptedAnswer) {
      try {
        const decryptedAnswer = decryptData(encryptedAnswer);
        setSelectedOption(decryptedAnswer);
      } catch (error) {
        console.error("Error decrypting answer:", error);
        setSelectedOption(answeredQuestions[index] || null);
      }
    } else {
      setSelectedOption(answeredQuestions[index] || null);
    }
    
    sessionStorage.setItem("mcqCurrentQuestionIndex", index.toString());
    
    // Update URL parameter
    updateIndexParameter(index);
    
    // Update test duration asynchronously in header
    if ((window as any).updateTimerAsync) {
      (window as any).updateTimerAsync();
    }
  };

  const handleTestSectionPage = () => {
    sessionStorage.setItem("mcqCurrentQuestionIndex", currentQuestion.toString());
    
    // Get test data from session storage or location state
    let sectionData = (location.state as any)?.sectionData;
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
    
    // Navigate back to test section with the same data
    navigate('/test-section', { 
      state: { 
        sectionData: sectionData 
      },
      replace: true
    });
  };

  if (loading) {
    return (
      <div className="container-fluid p-0" style={{ 
        position: "fixed", 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        zIndex: 9999, 
        backgroundColor: "#f2eeee",
        height: "100vh",
        maxWidth: "100%", 
        overflowX: "hidden", 
        overflowY: "auto" 
      }}>
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

  if (questions.length === 0) {
    return (
      <div className="container-fluid p-0 d-flex justify-content-center align-items-center" style={{ height: "100vh", backgroundColor: "#f2eeee" }}>
        <div className="text-center">
          <h4>No MCQ questions available</h4>
          <button className="btn btn-primary mt-3" onClick={handleTestSectionPage}>
            Back to Test Section
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0" style={{ height: "100%", maxWidth: "100%", overflowX: "hidden", overflowY: "auto", backgroundColor: "#f2eeee" }}>
      <div className="p-0 my-0 me-2" style={{ backgroundColor: "#F2EEEE" }}>
        <div className="container-fluid p-0 pt-2" style={{ maxWidth: "100%", overflowX: "hidden", overflowY: "auto", backgroundColor: "#f2eeee" }}>
          <div className="row g-2">
            <div className="col-12">
              <div className="bg-white border rounded-2 py-3 ps-3" style={{ height: "calc(100vh - 100px)", overflowY: "auto" }}>
                <div className="d-flex h-100">
                  <div className="d-flex flex-column align-items-center" style={{ width: "80px", marginLeft: "-20px",overflowY: "auto" }}>
                    {questions.map((_, index) => (
                      <button
                        key={index}
                        className="btn border border-dark rounded-2 my-1 px-3 mx-auto"
                        style={{
                          width: "60px",
                          height: "55px",
                          backgroundColor: (() => {
                            const questionStatus = questionStatuses[`mcq_${questions[index]?.Qn_name}`];
                            if (questionStatus === "Submitted" || questionStatus === "Attempted") {
                              return "#42FF58"; // Green for submitted/attempted
                            } else if (currentQuestion === index) {
                              return "grey"; // Grey for current question
                            } else {
                              return "#fff"; // White for others
                            }
                          })(),
                          color: currentQuestion === index ? "#fff" : "#000",
                        }}
                        onClick={() => handleQuestionClick(index)}
                      >
                        Q{index + 1}
                      </button>
                    ))}
                  </div>
                  <div className="col-11 lg-8 me-3" style={{ height: "100%", flex: 1 }}>
                    <div className="border border-dark rounded-2 overflowY-auto d-flex flex-column" style={{ height :"calc(100% - 40px)", backgroundColor: "#E5E5E533" }}>
                        <div className="p-3 pt-4 m-0 mh-50 w-100 fs-5 overflow-auto d-flex" style={{ scrollbarWidth: 'thin' }}>
                          <div className="col-auto" style={{ minWidth: '40px', flexShrink: 0 }}>
                            <span>Q{currentQuestion + 1}.</span>
                          </div>
                          <div className="col" style={{
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word',
                          }}>
                            {questions[currentQuestion].question}
                          </div>
                        </div>
                        <div className="p-3 mh-50">
                        {questions[currentQuestion].options.map((option, index) => (
                          <div className="d-flex align-items-center">
                          {String.fromCharCode(65 + (index as number))}. 
                          <button onClick={() => handleOptionChange(option)} style={{
                                boxShadow: '#00000033 0px 5px 4px',
                                maxHeight: "10vh",
                                overflowY: "auto",
                                backgroundColor: selectedOption === option ? "#90EE90" : "transparent",
                                width: "100%",
                                textAlign: "left",
                                whiteSpace: "pre-line"
                              }} className="border border-muted rounded-2 p-2 mb-3 ms-2">
                                {option}
                          </button>
                              </div>
                        ))}
                      </div>
                     
                    </div>
                    <div className="d-flex justify-content-end ms-2 mt-1 p-0">
                      <button
                        className="btn btn-sm border btn btn-light border-dark me-2"
                        style={{
                          whiteSpace: "nowrap",
                          minWidth: "100px",
                          height: "35px"
                        }}
                        onClick={handleSubmit}
                        disabled={!selectedOption || questionStatuses[`mcq_${questions[currentQuestion]?.Qn_name}`] === "Submitted" || submittingQuestions.has(currentQuestion)}
                      >
                        {questionStatuses[`mcq_${questions[currentQuestion]?.Qn_name}`] === "Submitted"
                          ? "Submitted"
                          : submittingQuestions.has(currentQuestion)
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
                                const nextIndex = currentQuestion + 1;
                                setCurrentQuestion(nextIndex);
                                setSelectedOption(null);
                                
                                // Update session storage
                                sessionStorage.setItem("mcqCurrentQuestionIndex", nextIndex.toString());
                                
                                // Update URL parameter
                                updateIndexParameter(nextIndex);
                                
                                // Update test duration asynchronously in header
                                if ((window as any).updateTimerAsync) {
                                  (window as any).updateTimerAsync();
                                }
                              }
                            }}
                            // disabled={submittingQuestions.has(currentQuestion)}
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
  );
};

export default TestMcq;
