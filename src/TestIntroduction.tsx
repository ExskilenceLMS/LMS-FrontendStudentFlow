import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import timer from "./Components/images/Timer.png";
import problems from "./Components/images/problems.png";
import axios from "axios";
import { secretKey } from './constants';
import CryptoJS from 'crypto-js';
import { Spinner } from "react-bootstrap";

const TestIntroduction: React.FC = () => {
  const encryptedStudentId = sessionStorage.getItem('StudentId') || "";
  const decryptedStudentId = CryptoJS.AES.decrypt(encryptedStudentId, secretKey).toString(CryptoJS.enc.Utf8);
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
  const [duration, setDuration] = useState<string>("");
  const [sectionCount, setSectionCount] = useState({ section_1: 0, section_2: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const actualStudentId= CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualEmail= CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualName= CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);
 

  useEffect(() => {
    const fetchData = async () => {
      if (testId && studentId) {
        setLoading(true);
        const url = `${process.env.REACT_APP_BACKEND_URL}api/student/test/instuction/${studentId}/${testId}/`;

        try {
          const response = await axios.get(url);
          setDuration(response.data.duration);
          setSectionCount(response.data.section_count);
        } catch (innerError:any) {
          const errorData = innerError.response?.data || {
            message: innerError.message,
            stack: innerError.stack,
          };

          const body = {
            student_id: actualStudentId,
            Email: actualEmail,
            Name: actualName,
            URL_and_Body: `${url}\n + ""`,
            error: errorData.error || errorData,
          };

          try {
            await axios.post(
              `${process.env.REACT_APP_BACKEND_URL}api/errorlog/`,
              body
            );
          } catch (loggingError) {
            console.error("Error logging the test instruction error:", loggingError);
          }

          console.error("Error fetching test instruction data:", innerError);
          navigate("/test");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [testId, studentId, navigate]);

  const handleStartTest = () => {
    // sessionStorage.setItem("timer", duration);
    navigate("/test-section", { state: { testId } });
  };

  return (
    <div style={{ backgroundColor: "#F2EEEE", height: `calc(100vh - 60px)`, overflow: "hidden" }}>
      <div
        className="p-0 my-0 me-2"
        style={{ backgroundColor: "#F2EEEE" }}
      >
        <div
          className="container-fluid bg-white mt-2 border rounded-1"
          style={{
            maxWidth: "100%",
            overflowX: "hidden",
            overflowY: "auto",
            backgroundColor: "#f2eeee",
            height: `calc(100vh - 60px)`,
          }}
        >
          <div className="container-fluid">
            <div
              className="row m-3 border rounded-1 py-4"
              style={{
                boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
                backgroundColor: "white",
              }}
            >
              <div className="col d-flex justify-content-center align-items-center">
                <div className="">
                  <img
                    src={timer}
                    alt="Logo"
                    style={{ width: "50px", height: "50px" }}
                  />
                </div>
                <div className="ms-2">
                  {/* <p className="m-0 fs-5 fw-bold">{duration} minutes</p> */}
                  <p className="m-0 fs-5 fw-bold">{Number(duration) / 60} minutes</p>
                  <p className="m-0">test duration</p>
                </div>
              </div>
              <div className="col d-flex justify-content-center align-items-center">
                <div>
                  <img
                    src={problems}
                    alt="Logo"
                    style={{ width: "50px", height: "50px" }}
                  />
                </div>
                <div className="ms-2">
                  <p className="m-0 fs-5 fw-bold">{sectionCount.section_1}</p>
                  <p className="m-0">questions to be solved in section 1</p>
                </div>
              </div>
              <div className="col d-flex justify-content-center align-items-center">
                <div>
                  <img
                    src={problems}
                    alt="Logo"
                    style={{ width: "50px", height: "50px" }}
                  />
                </div>
                <div className="ms-2">
                  <p className="m-0 fs-5 fw-bold">{sectionCount.section_2}</p>
                  <p className="m-0">questions to be solved in section 2</p>
                </div>
              </div>
            </div>
            <div
              className="row m-3 border rounded-1"
              style={{
                boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
                backgroundColor: "white",
              }}
            >
              <span
                className="p-0 m-0 py-2 px-4"
                style={{ backgroundColor: "#FCFCFC" }}
              >
                Instructions
              </span>
              <div className="py-2 ps-4" style={{ position: "relative" }}>
                {/* <div
                  className="text-center"
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    zIndex: "1",
                  }}
                >
                  <img
                    src={wifi}
                    alt="Logo"
                    style={{ width: "50px", height: "50px" }}
                  /><br/>
                  <span>Internet Status</span>
                </div> */}
                <p>
                  To enjoy the best experience on our platform, please ensure
                  that
                </p>
                <p className="p-0 m-0 fw-bold ps-2">
                  1. The operating system on your computer is one of the 3
                  mentioned below:
                </p>
                <ul className="ps-5">
                  <li>Windows 7 and above</li>
                  <li>Linux distributions or </li>
                  <li>Mac OS X 10.6 and above</li>
                </ul>

                <p className="p-0 m-0 fw-bold ps-2">
                  2. You are opening the assessment in the latest versions of
                  one of the browsers mentioned below:
                </p>
                <ul className="ps-5" style={{ color: "green" }}>
                  <li style={{ color: "black" }}>Chrome/ Chromium</li>
                  <li style={{ color: "black" }}>Mozilla Firefox</li>
                  <li style={{ color: "black" }}>Microsoft Edge</li>
                  <li style={{ color: "black" }}>Apple Safari</li>
                </ul>

                <p className="p-0 m-0 fw-bold ps-2">
                  3. Basic Prototype enabled
                </p>
                <p className="p-0 m-0 fw-bold ps-2">
                  4. Other Question related instructions has to be added
                </p>
                <p className="p-0 m-0 fw-bold ps-2">
                  5. Once the question is submitted, it cannot be edited / resubmitted
                </p>
              </div>
            </div>
            <div className="d-flex justify-content-end pe-4">
              <button
                className="btn border border-black fw-bold"
                style={{
                  borderRadius: "10px",
                  width: "150px",
                  boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)",
                }}
                onClick={handleStartTest}
              >
                Start Test
              </button>
            </div>
          </div>
        </div>
      </div>
          {loading && (
              <div className="loading-overlay">
                  <Spinner animation="border" role="status">
                      <span className="visually-hidden">Loading...</span>
                  </Spinner>
              </div>
          )}
    </div>
  );
}

export default TestIntroduction;
