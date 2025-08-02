  import React, { useEffect, useState } from "react";
  import { useLocation, useNavigate } from "react-router-dom";
  import { getApiClient } from "./utils/apiAuth";
import { useAPISWR } from "./utils/swrConfig";
import { cleanupTestSessionData } from './utils/sessionCleanup';
import CryptoJS from "crypto-js";
import { secretKey } from "./constants";
  import SkeletonLoading from "./SkeletonTestSection";
  import { Modal, Button } from 'react-bootstrap';
  import { cleanDigitSectionValue } from "@mui/x-date-pickers/internals/hooks/useField/useField.utils";

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
    Qn?: string; // For coding questions
  }

  interface Question {
    Qn_name: string;
    Qn: string;
    Level: string;
    question_type: string;
    tags: string;
    question_data: QuestionData;
    status?: string; 
    qn_id?: string;
    level?: string;
    question?: string;
    score?: number;
    time?: number;
  }

  interface QuestionList {
    completed_questions: string;
    duration: number;
    qns_data: {
      mcq: Question[];
      coding?: Question[];
    };
    sections:{
      MCQ?:Question[],
      Coding?:Question[]
    }
  }

  const TestSection: React.FC = () => {
    const navigate = useNavigate();
    const encryptedStudentId = sessionStorage.getItem("StudentId") || "";
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
    const [questionList, setQuestionList] = useState<QuestionList | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
    const [questionStatuses, setQuestionStatuses] = useState<{[key: string]: string}>({});
    const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);

    // Use SWR for tables API with 1-day cache
    const tablesUrl = sessionStorage.getItem('TestSubject') === 'SQL' 
      ? `${process.env.REACT_APP_BACKEND_URL}api/student/practicecoding/tables/`
      : null;
    const { data: tablesData } = useAPISWR<{ tables: any[] }>(tablesUrl);

    // Use useLocation from react-router-dom to access location.state safely
    const location = useLocation() as { state?: { sectionData?: any } };
    const sectionData = location.state?.sectionData;

    useEffect(() => {
      // Get the test data from location.state that was passed during navigation from instruction page
      const testData = sectionData;

      // Update test duration synchronously on page load/refresh
      if ((window as any).updateTimerSync) {
        (window as any).updateTimerSync();
      }

      const fetchQuestionStatus = async () => {
        const url=`${process.env.REACT_APP_BACKEND_URL}api/student/test/questions/status/${studentId}/${testId}/`
        try {
          const response = await getApiClient().get(url);
          return response.data;
        } catch (innerError: any) {
          console.error("Error submitting test:", innerError);
          return null;
        }
      };

      if (testData) {
        try {
          // Since sectionData is already an object, we don't need to parse it
          setQuestionList(testData);
          
          // Fetch status and update questions
          fetchQuestionStatus().then((statusData) => {
            const initialStatuses: {[key: string]: string} = {};
            
            if (testData.qns_data && testData.qns_data.mcq) {
              
              testData.qns_data.mcq.forEach((question: Question, index: number) => {
                let questionStatus = "Pending"; // Default status
                
                // Update status from API response if available
                if (statusData && statusData.sections && statusData.sections.MCQ) {
                  const statusInfo = statusData.sections.MCQ.find((item: any) => item.qn_id === question.Qn_name);
                  if (statusInfo) {
                    questionStatus = statusInfo.status;
                  } else {
                  }
                }
                
                initialStatuses[`mcq_${question.Qn_name}`] = questionStatus;
              });
            }
            
            if (testData.qns_data && testData.qns_data.coding) {
              
              testData.qns_data.coding.forEach((question: Question, index: number) => {
                let questionStatus = "Pending"; // Default status
                
                // Update status from API response if available
                if (statusData && statusData.sections && statusData.sections.Coding) {
                  const statusInfo = statusData.sections.Coding.find((item: any) => item.qn_id === question.Qn_name);
                  if (statusInfo) {
                    questionStatus = statusInfo.status;
                  }
                }
                
                initialStatuses[`coding_${question.Qn_name}`] = questionStatus;
              });
            }
            
            setQuestionStatuses(initialStatuses);
            
            // Store statuses in session storage with test ID
            const sessionKey = `${testId}_questionStatus`;
            const encryptedStatuses = CryptoJS.AES.encrypt(JSON.stringify(initialStatuses), secretKey).toString();
            sessionStorage.setItem(sessionKey, encryptedStatuses);
            
            // Update completed questions count if available
            if (statusData && statusData.completed_questions) {
              setQuestionList(prev => prev ? {...prev, completed_questions: statusData.completed_questions} : prev);
            }
          });
        } catch (error) {
          console.error("Error processing test data:", error);
          navigate("/test");
        }
      } else {
        // If no test data is found, redirect back to test page
        console.error("No test data found in location.state");
        navigate("/test");
      }
    }, [testId, studentId, navigate]);

    // Handle tables data when available from SWR
    useEffect(() => {
      if (tablesData && tablesData.tables) {
        // Encrypt and store tables in session
        const encryptedTables = CryptoJS.AES.encrypt(JSON.stringify(tablesData.tables), secretKey).toString();
        sessionStorage.setItem('sqlTables', encryptedTables);
      }
    }, [tablesData]);

    // Add window resize listener for responsive text truncation
    useEffect(() => {
      const handleResize = () => {
        setWindowWidth(window.innerWidth);
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Expose updateQuestionStatusInSession globally for other components to use
    useEffect(() => {
      (window as any).updateQuestionStatusInSession = updateQuestionStatusInSession;
      return () => {
        delete (window as any).updateQuestionStatusInSession;
      };
    }, [testId]);

    const handleSubmitTest = async () => {
      setShowSubmitConfirmation(true);
    };

    const confirmSubmitTest = async () => {
      const url=`${process.env.REACT_APP_BACKEND_URL}api/student/test/submit/${studentId}/${testId}/`
      try {
        await getApiClient().post(url);
        
        // Clean up all test-related session storage data
        cleanupTestSessionData(testId);
        setShowSubmitConfirmation(false);
        setShowModal(true);
      } catch (innerError: any) {
        console.error("Error submitting test:", innerError);
      }
    };

    const handleViewReport = () => {
      // Clean up all test-related session storage data
      cleanupTestSessionData(testId);
      navigate("/test-report");
    };

    const handleQuestionClick = (questionType: string, index: number) => {
      // Update test duration asynchronously when question is clicked
      if ((window as any).updateTimerAsync) {
        (window as any).updateTimerAsync();
      }

      if (questionType === "MCQ") {
        // Set the MCQ current question index in session storage
        sessionStorage.setItem("mcqCurrentQuestionIndex", index.toString());
        
        // Navigate to MCQ page with test data
        navigate(`/mcq-temp?index=${index}`, { 
          state: { 
            sectionData: questionList 
          } 
        });
      } else if (questionType === "Coding") {
        // Set the Coding current question index in session storage
        sessionStorage.setItem("codingCurrentQuestionIndex", index.toString());
        
        // Navigate to Dynamic Coding Editor with test data
        navigate(`/dynamic-coding-editor`, { 
          state: { 
            sectionData: questionList 
          } 
        });
      }
    };

    const updateQuestionStatusInSession = (questionType: string, questionId: string, status: string) => {
      const sessionKey = `${testId}_questionStatus`;
      const sessionStatus = sessionStorage.getItem(sessionKey);
      
      if (sessionStatus) {
        try {
          const decryptedStatuses = CryptoJS.AES.decrypt(sessionStatus, secretKey).toString(CryptoJS.enc.Utf8);
          const statuses = JSON.parse(decryptedStatuses);
          statuses[`${questionType.toLowerCase()}_${questionId}`] = status;
          
          // Re-encrypt and store updated statuses
          const encryptedStatuses = CryptoJS.AES.encrypt(JSON.stringify(statuses), secretKey).toString();
          sessionStorage.setItem(sessionKey, encryptedStatuses);
          
          // Update local state
          setQuestionStatuses(statuses);
        } catch (error) {
          console.error("Error updating session status:", error);
        }
      }
    };

    const getQuestionStatus = (questionType: string, index: number, questionId?: string) => {
      // First check session storage with test ID
      const sessionKey = `${testId}_questionStatus`;
      const sessionStatus = sessionStorage.getItem(sessionKey);
      if (sessionStatus) {
        try {
          const decryptedStatuses = CryptoJS.AES.decrypt(sessionStatus, secretKey).toString(CryptoJS.enc.Utf8);
          const statuses = JSON.parse(decryptedStatuses);
          const key = questionId ? `${questionType.toLowerCase()}_${questionId}` : `${questionType.toLowerCase()}_${index}`;
          const status = statuses[key] || "Pending";
          return status;
        } catch (error) {
          console.error("Error decrypting session status:", error);
        }
      }
      
      // Fallback to state
      const key = questionId ? `${questionType.toLowerCase()}_${questionId}` : `${questionType.toLowerCase()}_${index}`;
      return questionStatuses[key] || "Pending";
    };

    if (!questionList) {
      return <SkeletonLoading />;
    }

    const truncateText = (text: string | null | undefined) => {
      if (!text) return ""; // Handle null, undefined, or empty string
      
      // Use the windowWidth state for responsive truncation
      let maxLength: number;
      
      if (windowWidth < 480) {
        // Extra small devices (phones)
        maxLength = 15;
      } else if (windowWidth < 768) {
        // Small devices (tablets)
        maxLength = 20;
      } else if (windowWidth < 992) {
        // Medium devices (small laptops)
        maxLength = 60;
      } else if (windowWidth < 1200) {
        // Large devices (desktops)
        maxLength = 80;
      } else if (windowWidth < 1400) {
        // Extra large devices
        maxLength = 110;
      } else {
        // Extra large devices
        maxLength = 120;
      }
      
      return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
    };

    return (
      <div style={{ backgroundColor: "#F2EEEE", height: `calc(100vh - 200px)` }}>
        <div className="p-0 my-0 me-2" style={{ backgroundColor: "#F2EEEE" }}>
          <div
            className="container-fluid bg-white mt-3 rounded-1 py-2"
            style={{ height: `calc(100vh - 100px)`, overflowY: "auto" }}
          >
            <div className="mb-3">
              <span className="fs-5">Section 1: MCQ</span>
              <span className="float-end">
                Completed : {questionList.completed_questions}
              </span>
            </div>
            
            {questionList.sections.MCQ && questionList.sections.MCQ.length > 0 && (
              <div>
                {questionList.sections.MCQ.map((question, index) => (
                  <div
                    className="d-flex flex-column flex-md-row justify-content-between align-items-center py-2"
                    key={question?.Qn_name || `mcq-${index}`}
                  >
                    <span className="px-1 border-black border-end me-2" style={{width: "30px"}}>
                      {index + 1}
                    </span>
                    <div
                      className="w-100 px-2 rounded-1 py-2 d-flex flex-column flex-md-row justify-content-between align-items-center ms-2"
                      style={{ backgroundColor: "#F5F5F5" }}
                    >
                      <div className="text-truncate" style={{ maxWidth: "100%" }}>
                        <span>
                          {truncateText(question?.question || "")}
                        </span>
                      </div>
                      <div className="d-flex justify-content-start text-center mt-2 mt-md-0">
                        {/* <span style={{ minWidth: "70px" }} className="me-3">
                          MCQ
                        </span> */}
                        <span style={{ minWidth: "70px" }} className="me-3">
                          {question?.Level || ""}
                        </span>
                        {/* <span style={{ minWidth: "70px" }} className="me-3">
                          Score {question?.score || ""}
                        </span> */}
                        <button
                          className={`btn btn-sm px-3 border border-black text-dark`}
                          style={{
                            width: "110px",
                            backgroundColor: 
                              getQuestionStatus("mcq", index, question.qn_id) === "Pending"
                                ? "#F8F8F8"
                                : getQuestionStatus("mcq", index, question.qn_id) === "Attempted"
                                ? "#FEFFBE"
                                : "#CFF7C9",
                            cursor: "pointer"
                          }}
                          onClick={() => handleQuestionClick("MCQ", index)}
                        >
                          {getQuestionStatus("mcq", index, question.qn_id)}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {questionList.sections.Coding && questionList.sections.Coding.length > 0 && (
              <div>
                <hr />
                <h5 className="fw-normal">Section 2: Coding</h5>
                {questionList.sections.Coding.map((question, index) => (
                  <div
                    className="d-flex flex-column flex-md-row justify-content-between align-items-center py-2"
                    key={question?.qn_id}
                  >
                    <span className="px-1 border-black border-end me-2" style={{width: "30px"}}>
                      {index + 1}
                    </span>
                    <div
                      className="w-100 px-2 rounded-1 py-2 d-flex flex-column flex-md-row justify-content-between align-items-center ms-2"
                      style={{ backgroundColor: "#F5F5F5" }}
                    >
                      <div className="text-truncate" style={{ maxWidth: "100%" }}>
                        <span>
                          {truncateText(question?.question || "")}
                        </span>
                      </div>
                      <div className="d-flex justify-content-start text-center mt-2 mt-md-0">
                        {/* <span style={{ minWidth: "70px" }} className="me-3">
                          Coding
                        </span> */}
                        <span style={{ minWidth: "70px" }} className="me-3">
                          {question?.Level || ""}
                        </span>
                        {/* <span style={{ minWidth: "70px" }} className="me-3">
                          Score {question?.score || ""}
                        </span> */}
                        <button
                          className={`btn btn-sm px-3 border border-black text-dark`}
                          style={{
                            width: "110px",
                            backgroundColor:
                              getQuestionStatus("Coding", index, question.qn_id) === "Pending"
                                ? "#F8F8F8"
                                : getQuestionStatus("Coding", index, question.qn_id) === "Attempted"
                                ? "#FEFFBE"
                                : "#CFF7C9",
                            cursor: "pointer",
                          }}
                          onClick={() => handleQuestionClick("Coding", index)}
                        >
                          {getQuestionStatus("Coding", index, question.qn_id)}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="d-flex justify-content-center mt-3">
              <button className="btn btn-sm px-2 py-1 border border-black" onClick={handleSubmitTest}>
                Submit the Test
              </button>
            </div>
          </div>
        </div>

        <Modal className="modal-dialog modal-dialog-centered modal-dialog-scrollable" show={showSubmitConfirmation} onHide={() => setShowSubmitConfirmation(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Submission</Modal.Title>
          </Modal.Header>
          <Modal.Body>Are you sure you want to submit the test?</Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowSubmitConfirmation(false)}>
              No
            </Button>
            <Button variant="success" style={{backgroundColor:'none'}} onClick={confirmSubmitTest}>
              Yes
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal
          className="modal-dialog-centered"
          show={showModal}
          onHide={() => {
            setShowModal(false);
            navigate("/test"); 
          }}
        >
          <Modal.Header>
            <Modal.Title>Test Submitted</Modal.Title>
          </Modal.Header>
          <Modal.Body>Your test has been submitted successfully.</Modal.Body>
          <Modal.Footer>
            <Button variant="success" onClick={handleViewReport}>
              View Report
            </Button>
          </Modal.Footer>
        </Modal>

      </div>
    );
  };

  export default TestSection;

