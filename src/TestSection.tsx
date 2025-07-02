import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "./utils/apiAuth";
import CryptoJS from "crypto-js";
import { secretKey } from "./constants";
import SkeletonLoading from "./SkeletonTestSection";
import { Modal, Button } from 'react-bootstrap';

interface Data {
  qn_id: string;
  question_type: string;
  level: string;
  question: string;
  score: string;
  time: string;
  status: string;
}

interface QuestionList {
  MCQ?: Data[];
  Coding?: Data[];
  Completed_Questions: string;
  Qns_data: {
    mcq: any[];
    coding: any[];
  };
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
  const actualStudentId= CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualEmail= CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualName= CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);
 
  useEffect(() => {
    const fetchData = async () => {
      const url=`${process.env.REACT_APP_BACKEND_URL}api/student/test/section/${studentId}/${testId}/`
      try {
        const response = await apiClient.get(url);

        if (response.status === 200) {
          setQuestionList(response.data);
        } else {
          navigate("/test");
        }
      } catch (innerError: any) {
        console.error("Error fetching test section data:", innerError);
        navigate("/test");
      }

    };

    if (studentId && testId) {
      fetchData();
    } else {
      navigate("/test");
    }
  }, [studentId, testId, navigate]);

  const handleSubmitTest = async () => {
    setShowSubmitConfirmation(true);
  };

  const confirmSubmitTest = async () => {
    const url=`${process.env.REACT_APP_BACKEND_URL}api/student/test/submit/${studentId}/${testId}/`
    try {
      await apiClient.get(url);
      sessionStorage.setItem("time", "0");
      setShowSubmitConfirmation(false);
      setShowModal(true);
    } catch (innerError: any) {
      console.error("Error submitting test:", innerError);
    }
  };

  const handleViewReport = () => {
    sessionStorage.removeItem("time");
    sessionStorage.removeItem("timer");
    navigate("/test-report");
  };

  const handleQuestionClick = (questionType: string, index: number) => {
    if (questionType === "MCQ") {
      navigate(`/mcq-temp?index=${index}`);
    } else if (questionType === "Coding") {
      navigate(`/coding-temp?index=${index}`);
    }
  };

  if (!questionList) {
    return <SkeletonLoading />;
  }

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
  };

  return (
    <div style={{ backgroundColor: "#F2EEEE", height: `calc(100vh - 90px)` }}>
      <div className="p-0 my-0 me-2" style={{ backgroundColor: "#F2EEEE" }}>
        <div
          className="container-fluid bg-white mt-3 rounded-1 py-2"
          style={{ height: `calc(100vh - 70px)`, overflowY: "auto" }}
        >
          <div className="mb-3">
            <span className="fs-5">Section 1: MCQ</span>
            <span className="float-end">
              Completed : {questionList.Completed_Questions}
            </span>
          </div>
          {questionList.MCQ && questionList.MCQ.length > 0 && (
            <div>
              {questionList.MCQ.map((question, index) => (
                <div
                  className="d-flex flex-column flex-md-row justify-content-between align-items-center py-2"
                  key={question.qn_id}
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
                        {truncateText(question.question, window.innerWidth < 600 ? 30 : 50)}
                      </span>
                    </div>
                    <div className="d-flex justify-content-start text-center mt-2 mt-md-0">
                      <span style={{ minWidth: "70px" }} className="me-3">
                        MCQ
                      </span>
                      <span style={{ minWidth: "70px" }} className="me-3">
                        Level {question.level}
                      </span>
                      <span style={{ minWidth: "70px" }} className="me-3">
                        Marks {question.score}
                      </span>
                      <button
                        className={`btn btn-sm px-3 border border-black ${
                          question.status === "Pending"
                            ? "text-dark"
                            : question.status === "Attempted"
                            ? "text-dark"
                            : "text-dark"
                        }`}
                        style={{
                          width: "110px",
                          backgroundColor:
                            question.status === "Pending"
                              ? "#F8F8F8"
                              : question.status === "Attempted"
                              ? "#FEFFBE"
                              : "#CFF7C9",
                          cursor: "pointer"
                        }}
                        onClick={() => handleQuestionClick("MCQ", index)}
                      >
                        {question.status}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {questionList.Coding && questionList.Coding.length > 0 && (
            <div>
              <hr />
              <h5 className="fw-normal">Section 2: Coding</h5>
              {questionList.Coding.map((question, index) => (
                <div
                  className="d-flex flex-column flex-md-row justify-content-between align-items-center py-2"
                  key={question.qn_id}
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
                        {truncateText(question.question, window.innerWidth < 600 ? 30 : 50)}
                      </span>
                    </div>
                    <div className="d-flex justify-content-start text-center mt-2 mt-md-0">
                      <span style={{ minWidth: "70px" }} className="me-3">
                        Coding
                      </span>
                      <span style={{ minWidth: "70px" }} className="me-3">
                        Level {question.level}
                      </span>
                      <span style={{ minWidth: "70px" }} className="me-3">
                        Marks {question.score}
                      </span>
                      <button
                        className={`btn btn-sm px-3 border border-black ${
                          question.status === "Pending"
                            ? "text-dark"
                            : question.status === "Attempted"
                            ? "text-dark"
                            : "text-dark"
                        }`}
                        style={{
                          width: "110px",
                          backgroundColor:
                            question.status === "Pending"
                              ? "#F8F8F8"
                              : question.status === "Attempted"
                              ? "#FEFFBE"
                              : "#CFF7C9",
                          cursor: "pointer",
                        }}
                        onClick={() => handleQuestionClick("Coding", index)}
                      >
                        {question.status}
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

      {/* <Modal className="modal-dialog-centered" show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header>
          <Modal.Title>Test Submitted</Modal.Title>
        </Modal.Header>
        <Modal.Body>Your test has been submitted successfully.</Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={handleViewReport}>
            View Report
          </Button>
        </Modal.Footer>
      </Modal> */}
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

