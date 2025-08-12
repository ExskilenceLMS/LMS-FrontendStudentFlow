import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getApiClient } from "./utils/apiAuth";
import Modal from 'react-bootstrap/Modal';
import eye from './Components/images/eye.png';
import { secretKey } from "./constants";
import CryptoJS from "crypto-js";
import { Spinner } from "react-bootstrap";

interface Data1 {
  timeTaken: string;
  total_time: string;
  score: {
    user: string;
    total: string;
  };
  result: {
    pass: boolean;
    status: string;
    cutoff: string;
  };
  problems: {
    user: string;
    total: string;
  };
  rank: {
    college_rank: string | number;
    overall_rank: string | number;
  };
  time: {
    start: string;
    end: string;
    actual_start: string;
    actual_end: string;
  };
  good: string[];
  average: string[];
  bad: string[];
}

interface question {
  id: number;
  question: string;
  testcase?: string;
  answer?: {
    user: string;
    correct: string;
  };
  options?: [option, option, option, option];
  score: string;
  status: string;
  topic: string;
  explanation: string;
}

interface option {
  data: string;
  user: boolean;
  correct: boolean;
}

interface questionData {
  mcq: question[];
  coding: question[];
}

const TestReport: React.FC = () => {
  const navigate = useNavigate();
  const [choice, setChoice] = useState<"mcq" | "coding">("mcq");
  const testType = sessionStorage.getItem("TestType") || "";
  const [data, setData] = useState<Data1>({
    timeTaken: "",
    total_time: "",
    score: {
      user: "",
      total: "",
    },
    result: {
      pass: false,
      status: "",
      cutoff: "",
    },
    problems: {
      user: "",
      total: "",
    },
    rank: {
      college_rank: "",
      overall_rank: "",
    },
    time: {
      start: "",
      end: "",
      actual_start: "",
      actual_end: "",
    },
    good: [],
    average: [],
    bad: [],
  });

  const [showModal, setShowModal] = useState<boolean>(false);
  const [popupData, setPopupData] = useState<question | null>(null);
  const [questionsData, setQuestionsData] = useState<questionData>({
    mcq: [],
    coding: [],
  });

  const [expandedTopics, setExpandedTopics] = useState<{ [key: string]: boolean }>({});

  const encryptedStudentId = sessionStorage.getItem("StudentId") || "";
  const decryptedStudentId = CryptoJS.AES.decrypt(encryptedStudentId!, secretKey).toString(CryptoJS.enc.Utf8);
  const studentId = decryptedStudentId;
  const encryptedTestId = sessionStorage.getItem("TestId") || "";
  const decryptedTestId = CryptoJS.AES.decrypt(encryptedTestId!, secretKey).toString(CryptoJS.enc.Utf8);
  const testId = decryptedTestId;
  const [loading, setLoading] = useState<boolean>(false);
  const handleClose = () => setShowModal(false);
  
  useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      const url=`${process.env.REACT_APP_BACKEND_URL}api/student/test/report/${studentId}/${testId}/`
      try {
        const response = await getApiClient().get(url);
        const apiData = response.data;
        
        // Update the data structure to match the new API response
        setData({
          timeTaken: `${apiData.test_summary.time_taken_for_completion} / ${apiData.test_summary.total_time}`,
          total_time: apiData.test_summary.total_time,
          score: {
            user: apiData.test_summary.score_secured.toString(),
            total: apiData.test_summary.max_score.toString(),
          },
          result: {
            pass: apiData.test_summary.status === "Passed" || apiData.test_summary.status === "Completed",
            status: apiData.test_summary.percentage >= 40 ? "Passed" : "Failed",
            cutoff: ">=40%",
          },
          problems: {
            user: apiData.test_summary.attempted_questions.toString(),
            total: apiData.test_summary.total_questions.toString(),
          },
          rank: {
            college_rank: apiData.test_summary.college_rank?.toString() || "--",
            overall_rank: apiData.test_summary.overall_rank?.toString() || "--",
          },
          time: {
            start: apiData.test_summary.test_start_time || "Not started",
            end: apiData.test_summary.test_end_time || "Not completed",
            actual_start: apiData.test_summary.actual_test_start_time || "--",
            actual_end: apiData.test_summary.actual_test_end_time || "--", 
          },
          good: apiData.topics.good || [],
          average: apiData.topics.average || [],
          bad: apiData.topics.poor || [],
        });

        // Map MCQ questions with the new structure
        const mcqQuestions = apiData.answers.mcq.map((q: any, index: number) => ({
          id: index + 1,
          question: q.question,
          options: q.options.map((opt: any) => ({
            data: opt,
            user: q.user_answer === opt,
            correct: q.correct_answer === opt,
          })),
          score: `${q.score_secured}/${q.max_score}`,
          status: q.status.toLowerCase(),
          topic: q.topic,
          explanation: q.Explanation,
        }));

        // Map coding questions with the new structure
        const codingQuestions = apiData.answers.coding.map((q: any, index: number) => ({
          id: index + 1,
          question: q.Qn,
          answer: {
            user: q.user_answer || "Not attempted",
            correct: q.Ans,
          },
          testcase: q.testcases || "0/0",
          score: `${q.score_secured}/${q.max_score}`,
          status: q.status.toLowerCase(),
          topic: q.topic,
        }));

        setQuestionsData({
          mcq: mcqQuestions,
          coding: codingQuestions,
        });
        setLoading(false);
      } catch (innerError: any) {
        console.error("Error fetching test report data:", innerError);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAnswerClick = (data: question) => {
    setPopupData(data);
    setShowModal(true);
  };

  const toggleTopic = (topic: string) => {
    setExpandedTopics((prev) => ({
      ...prev,
      [topic]: !prev[topic],
    }));
  };

  return (
    <>
      <div className="" style={{ backgroundColor: "#F2EEEE", height: `calc(100vh - 90px)` }}>
        <div className="p-0 my-0 me-2" style={{ backgroundColor: "#F2EEEE" }}>
          <div className="container-fluid bg-white mt-2 border pb-4 rounded-1" style={{ height: `calc(100vh - 70px)`, overflowY: "scroll", backgroundColor: "white" }}>
            <div className="p-1 pt-4">
              <div className="container-fluid border rounded-3 shadow-sm" style={{ backgroundColor: '#f8f9fa', padding: '2rem' }}>
                {/* <h4 className="text-center mb-4" style={{ color: '#2c3e50', fontWeight: '600' }}>Test Summary</h4> */}
                <div className="row align-items-stretch">
                  <div className={testType === "Final Test" ? "col-3 mb-3" : "col-4 mb-3"}>
                    <div className="h-100 text-center p-3 rounded-3" style={{ backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      <div className="h4 mb-2" style={{ color: '#3498db', fontWeight: 'normal' }}>
                        {data.timeTaken !== undefined ? data.timeTaken : "0"}
                      </div>
                      <p className="mb-0 fw-bold" style={{ color: '#2c3e50', fontSize: '0.9rem' }}>
                        Time Taken for Completion
                      </p>
                    </div>
                  </div>

                  <div className={testType === "Final Test" ? "col-3 mb-3" : "col-4 mb-3"}>
                    <div className="h-100 text-center p-3 rounded-3" style={{ backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      <div className="h4 mb-2" style={{ color: '#e74c3c', fontWeight: 'normal' }}>
                        {data.score.user !== undefined ? data.score.user : "0"}
                      </div>
                      <p className="mb-0 fw-bold" style={{ color: '#2c3e50', fontSize: '0.9rem' }}>
                        Scored out of {data.score.total !== undefined ? data.score.total : "0"}
                      </p>
                    </div>
                  </div>

                  <div className={testType === "Final Test" ? "col-3 mb-3" : "col-4 mb-3"}>
                    <div className="h-100 text-center p-3 rounded-3" style={{ backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      <div className="h4 mb-2" style={{ color: data.result.status === 'Passed' ? '#27ae60' : '#e74c3c', fontWeight: 'normal' }}>
                        {data.result.status !== undefined ? data.result.status : "Failed"}
                      </div>
                      <p className="mb-0 fw-bold" style={{ color: '#2c3e50', fontSize: '0.9rem' }}>
                        Test Status (Cutoff: {data.result.cutoff !== undefined ? data.result.cutoff : "0%"})
                      </p>
                    </div>
                  </div>

                  <div className={testType === "Final Test" ? "col-3 mb-3" : "col-4 mb-3"}>
                    <div className="h-100 text-center p-3 rounded-3" style={{ backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      <div className="h4 mb-2" style={{ color: '#f39c12', fontWeight: 'normal' }}>
                        {data.problems.user !== undefined ? data.problems.user : "0"}
                      </div>
                      <p className="mb-0 fw-bold" style={{ color: '#2c3e50', fontSize: '0.9rem' }}>
                        Problems Attempted out of {data.problems.total !== undefined ? data.problems.total : "0"}
                      </p>
                    </div>
                  </div>
                       {testType === "Final Test" && (
                        <div className="col-3 mb-3">
                        <div className="h-100 text-center p-3 rounded-3" style={{ backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                          <div className="h5 mb-2" style={{ color: '#9b59b6', fontWeight: 'normal' }}>
                            {data.rank.college_rank !== undefined && data.rank.college_rank !== "-1" && data.rank.college_rank !== -1 ? data.rank.college_rank.toString() : "--"}
                          </div>
                          <p className="mb-0 fw-bold" style={{ color: '#2c3e50', fontSize: '0.85rem' }}>
                            College Rank
                          </p>
                        </div>
                      </div>
                      )}
                      {testType === "Final Test" && (
                      <div className="col-3 mb-3">
                        <div className="h-100 text-center p-3 rounded-3" style={{ backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                          <div className="h5 mb-2" style={{ color: '#9b59b6', fontWeight: 'normal' }}>
                            {data.rank.overall_rank !== undefined && data.rank.overall_rank !== "-1" && data.rank.overall_rank !== -1 ? data.rank.overall_rank.toString() : "--"}
                          </div>
                          <p className="mb-0 fw-bold" style={{ color: '#2c3e50', fontSize: '0.85rem' }}>
                            Overall Rank
                          </p>
                        </div>
                      </div>
                      )}



                  <div className={testType === "Final Test" ? "col-3 mb-3" : "col-4 mb-3"}>
                    <div className="h-100 text-center p-3 rounded-3" style={{ backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      <div className="h6 mb-0" style={{ color: '#34495e', fontWeight: 'normal', fontSize: '0.9rem' }}>
                        {data.time.actual_start !== undefined ? data.time.actual_start : "0"}
                      </div>
                      <p className="fw-bold mb-2" style={{ color: '#2c3e50', fontSize: '0.85rem' }}>
                      Test Assigned at
                      </p>
                      <div className="h6 mb-0" style={{ color: '#34495e', fontWeight: 'normal', fontSize: '0.9rem' }}>
                        {data.total_time !== undefined ? data.total_time : "0"}
                      </div>
                      <p className="mb-0 fw-bold" style={{ color: '#2c3e50', fontSize: '0.85rem' }}>
                        Duration
                      </p>
                    </div>
                  </div>

                  <div className={testType === "Final Test" ? "col-3 mb-3" : "col-4 mb-3"}>
                    <div className="h-100 text-center p-3 rounded-3" style={{ backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      <div className="h6 mb-0" style={{ color: '#34495e', fontWeight: 'normal', fontSize: '0.9rem' }}>
                        {data.time.start !== undefined ? data.time.start : "0"}
                      </div>
                      <p className="mb-2 fw-bold" style={{ color: '#2c3e50', fontSize: '0.85rem' }}>
                        Test Started at
                      </p>
                      <div className="h6 mb-0" style={{ color: '#34495e', fontWeight: 'normal', fontSize: '0.9rem' }}>
                        {data.time.end !== undefined ? data.time.end : "0"}
                      </div>
                      <p className="mb-0 fw-bold" style={{ color: '#2c3e50', fontSize: '0.85rem' }}>
                        Test Ended at
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {(data.good.length > 0 || data.average.length > 0 || data.bad.length > 0) ? (
                <div className="container-fluid mt-5 border rounded-2 shadow pb-2">
                    {data.good.length > 0 && (
                     <div className="row align-items-center pb-2">
                       <div className="col-2 mt-2 p-2 ps-3">
                       <span className="">Very Good :</span>
                       </div>
                       <div className="col-10 d-flex flex-wrap">
                      {data.good.map((item) => (
                        <span
                          key={item}
                          style={{ backgroundColor: expandedTopics[item] ? '#6eadef' : 'initial', color: expandedTopics[item] ? 'white' : 'initial' }}
                          title={item}
                          role="button"
                          className="mt-2 justify-content-center border rounded-2 mx-3 text-center p-1 shadow py-2 w-auto"
                          onClick={() => toggleTopic(item)}
                        >
                          {item}
                        </span>
                      ))}
                      </div>
                    </div>
                  )}
                    {data.average.length > 0 && (
                     <div className="row align-items-center pb-2">
                       <div className="col-2 mt-2 p-2 ps-3">
                       <span className="">Average in :</span>
                       </div>
                       <div className="col-10 d-flex flex-wrap align-items-center">
                      {data.average.map((item) => (
                        <span
                          key={item}
                          style={{ backgroundColor: expandedTopics[item] ? '#6eadef' : 'initial', color: expandedTopics[item] ? 'white' : 'initial' }}
                          title={item}
                          role="button"
                          className="mt-2 justify-content-center border rounded-2 mx-3 text-center p-1 shadow py-2 w-auto"
                          onClick={() => toggleTopic(item)}
                        >
                          {item}
                        </span>
                      ))}
                      </div>
                    </div>
                  )}
                  {data.bad.length > 0 && (
                     <div className="row align-items-center">
                       <div className="col-2 mt-2 p-2 ps-3">
                       <span className="">Poor in :</span>
                       </div>
                       <div className="col-10 d-flex flex-wrap align-items-center">
                      {data.bad.map((item) => (
                        <span
                          key={item}
                          style={{ backgroundColor: expandedTopics[item] ? '#6eadef' : 'initial', color: expandedTopics[item] ? 'white' : 'initial' }}
                          title={item}
                          role="button"
                          className="mt-2 justify-content-center border rounded-2 mx-3 text-center p-1 shadow py-2 w-auto"
                          onClick={() => toggleTopic(item)}
                        >
                          {item}
                        </span>
                      ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
              <div className="container-fluid mt-5 pb-3 pt-3 border rounded-2 shadow">
                <span
                  onClick={() => setChoice("mcq")}
                  role="button"
                  className={`ms-3 me-5  ${
                    choice === "mcq" ? "border-2 border-bottom" : ""
                  }`}
                >
                  MCQ's
                </span>
                <span
                  role="button"
                  onClick={() => setChoice("coding")}
                  className={`ms-3 ${
                    choice === "coding" ? "border-2 border-bottom" : ""
                  }`}
                >
                  Coding
                </span>
                <div className="table-responsive pt-3 px-5">
                  <table className="table">
                    <thead className="">
                      <tr>
                        <th className="text-center">Q.no</th>
                        <th className="text-center">Question</th>
                        <th className="text-center">Answer</th>
                        {choice === "coding" && (
                          <th className="text-center">
                            <span style={{ whiteSpace: 'nowrap' }}>{"Test Cases"}</span>
                          </th>
                        )}
                        <th className="text-center">Score</th>
                        <th className="text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody style={{ textAlign: "center" }}>
                      {Object.keys(expandedTopics).filter(topic => expandedTopics[topic]).length > 0 ? (
                        questionsData[choice]
                          .filter(question =>
                            Object.keys(expandedTopics).filter(topic => expandedTopics[topic]).some(topic => question.topic === topic)
                          )
                          .map((question) => (
                            <tr key={question.id}>
                              <td>{question.id}</td>
                              <td style={{ textAlign: "start"}}> {question.question.length > 80
                                ? question.question.substring(0, 80) + "..."
                                : question.question}</td>
                              <td
                                className="text-center"
                                onClick={() => handleAnswerClick(question)}
                              >
                                <img src={eye} alt="eye" role="button" />
                              </td>
                              {choice === "coding" && <td className="text-center">{question.testcase}</td>}
                              <td className="text-center">{question.score}</td>
                              {question.status === "correct" ? (
                                <td className="text-success">Correct</td>
                              ) : (
                                question.status === "partial" ? (
                                  <td className="text-warning">Partial</td>
                                ) : (
                                  question.status === "wrong" ? (
                                    <td className="text-danger">Wrong</td>
                                  ) : (
                                    question.status === "skipped" ? (
                                      <td className="text-danger">Skipped</td>
                                    ) : (
                                      <td style={{ color: 'orange' }}>{question.status === "not attempted" ? "Not Attempted" : question.status}</td>
                                    )
                                  )
                                )
                              )}
                            </tr>
                          ))
                      ) : questionsData[choice].length > 0 ? (
                        questionsData[choice].map((question) => (
                          <tr key={question.id}>
                            <td>{question.id}</td>
                            <td style={{ textAlign: "start"}}> {question.question.length > 80
                              ? question.question.substring(0, 80) + "..."
                              : question.question}</td>
                            <td
                              className="text-center"
                              onClick={() => handleAnswerClick(question)}
                            >
                              <img src={eye} alt="eye" role="button" />
                            </td>
                            {choice === "coding" && <td>{question.testcase}</td>}
                            <td>{question.score}</td>
                            {question.status === "correct" ? (
                              <td className="text-success">Correct</td>
                            ) : (
                              question.status === "partial" ? (
                                <td className="text-warning">Partial</td>
                              ) : (
                                question.status === "wrong" ? (
                                  <td className="text-danger">Wrong</td>
                                ) : (
                                  question.status === "skipped" ? (
                                    <td className="text-danger">Skipped</td>
                                  ) : (
                                    <td style={{ color: 'orange' }}>{question.status === "not attempted" ? "Not Attempted" : question.status}</td>
                                  )
                                )
                              )
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={choice === "coding" ? 6 : 5} className="text-center">
                            No questions available for this category.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <Modal
                show={showModal}
                onHide={handleClose}
                size="xl"
                className="custom-modal"
                centered
              >
                <Modal.Body className="border border-black rounded-3">
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={handleClose}
                    style={{ position: "absolute", top: "10px", right: "10px" }}
                  ></button>
                  <h4 className="text-center">Answer</h4>
                  {popupData ? (
                    <div className="p-4">
                      {popupData.question && (
                        <pre className="pb-3">
                          {popupData.id}. {popupData.question}
                        </pre>
                      )}
                      {popupData.answer && (
                        <>
                          <div className="container-fluid">
                            <div className="row gap-2">
                              <div className="col border border-black rounded-3 p-3 px-5 d-flex flex-column">
                                <p className="fw-bold pb-0 mb-0">Your answer</p>
                                <hr className="mt-0 pt-0" />
                                <div className="w-100 overflowX-auto flex-grow-1">
                                  <pre className="mb-0">{popupData.answer.user}</pre>
                                </div>
                              </div>
                              <div className="col border border-black rounded-2 p-3 px-5 d-flex flex-column">
                                <p className="fw-bold pb-0 mb-0">Optimal answer</p>
                                <hr className="mt-0 pt-0" />
                                <div className="w-100 overflowX-auto flex-grow-1">
                                  <pre className="mb-0">{popupData.answer.correct}</pre>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                      {popupData.options &&
                        popupData.options.map((optionItem, index) => {
                          const isUserAnswer = optionItem.user;
                          const isCorrectAnswer = optionItem.correct;
                          const optionstyles =
                            isUserAnswer && isCorrectAnswer
                              ? { color: "green" }
                              : isUserAnswer
                                ? { color: "red" }
                                : isCorrectAnswer
                                  ? { color: "green" }
                                  : {};
                          return (
                            <div key={index}>
                              <input
                                type="radio"
                                disabled
                                checked={isUserAnswer}
                                className="me-2"
                              />
                              <label
                                htmlFor={`option-${index}`}
                                style={optionstyles}
                              >
                                <div className="d-flex align-items-center justify-content-between">
                                  <div>
                                    {optionItem.data}
                                  </div>
                                  <div className="d-flex justify-content-end">
                                    {isUserAnswer && (
                                      <span className="text-dark text-end ps-3">
                                        Your answer
                                      </span>
                                    )}
                                    {isCorrectAnswer && !isUserAnswer && (
                                      <span className="text-dark text-end ps-3">
                                        Correct answer
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </label>
                            </div>
                          );
                        })}
                      {popupData.status === "wrong" && popupData.explanation && (
                        <div className="mt-3">
                          <p className="fw-bold">Explanation:</p>
                          <p>{popupData.explanation}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    ""
                  )}
                </Modal.Body>
              </Modal>
              {loading && (
                <div className="loading-overlay">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TestReport;
