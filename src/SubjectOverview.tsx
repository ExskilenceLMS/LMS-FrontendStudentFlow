import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Skeleton from "react-loading-skeleton";
import Footer from "./Components/Footer";
import { useNavigate } from "react-router-dom";
import { getApiClient } from './utils/apiAuth';
import { useAPISWR } from "./utils/swrConfig";
import { IoMdInformationCircleOutline } from "react-icons/io";
import { CiSquareChevUp, CiSquareChevDown } from "react-icons/ci";
import { secretKey } from "./constants";
import CryptoJS from "crypto-js";
import { Subject } from "@mui/icons-material";
import { Spinner } from "react-bootstrap";
 
interface Day {
  day: number;
  day_key: string;
  date: string;
  topics?: string[];
  practiceMCQ?: { questions?: string | null; score: string };
  practiceCoding?: { questions?: string | null; score: string };
  testScore?: { score: string };
  status: string;
}
 
interface Week {
  weekNumber: number;
  startDate: string;
  endDate: string;
  totalHours?: string;
  topics?: string;
  days?: Day[];
}

interface StaticWeek {
  week: number;
  startDate: string;
  endDate: string;
  totalHours: number | null;
  days?: {
    day: string;
    day_key: string;
    date: string;
    week: number;
    topics: string;
    videos: number;
    notes: number;
    mcq: number;
    coding: number;
    mcq_total_score: number;
    coding_total_score: number;
  }[];
  topics: string | null;
}

interface StudentWeek {
  week: number;
  days: {
    day: number;
    topics: string;
    practiceMCQ: {
      questions: string;
      score: string;
    };
    practiceCoding: {
      questions: string;
      score: string;
    };
    status: string;
  }[];
}
 
const SubjectOverview: React.FC = () => {
  const navigate = useNavigate();
  const encryptedStudentId = sessionStorage.getItem('StudentId');
  const decryptedStudentId = CryptoJS.AES.decrypt(encryptedStudentId!, secretKey).toString(CryptoJS.enc.Utf8);
  const studentId = decryptedStudentId;
  const encryptedCourseId = sessionStorage.getItem('CourseId');
  const decryptedCourseId = CryptoJS.AES.decrypt(encryptedCourseId!, secretKey).toString(CryptoJS.enc.Utf8);
  const courseId = decryptedCourseId;
  const encryptedSubjectId = sessionStorage.getItem('SubjectId');
  const decryptedSubjectId = CryptoJS.AES.decrypt(encryptedSubjectId!, secretKey).toString(CryptoJS.enc.Utf8);
  const subjectId = decryptedSubjectId;
  const encryptedSubject = sessionStorage.getItem('Subject');
  const decryptedSubject = CryptoJS.AES.decrypt(encryptedSubject!, secretKey).toString(CryptoJS.enc.Utf8);
  const encryptedBatchId = sessionStorage.getItem('BatchId');
  const decryptedBatchId = CryptoJS.AES.decrypt(encryptedBatchId!, secretKey).toString(CryptoJS.enc.Utf8);
  const batchId = decryptedBatchId;
  const [data, setData] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);
  const [btnClickLoading, setBtnClickLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
    const [openWeeks, setOpenWeeks] = useState<Set<number>>(new Set());
  const actualStudentId = CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualEmail = CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualName = CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);

  // Use SWR for static roadmap data with 10-minute cache
  const staticRoadmapUrl = `${process.env.REACT_APP_BACKEND_URL}api/roadmap_static/${courseId}/${batchId}/${subjectId}/`;
  const { data: staticRoadmapData, error: staticRoadmapError } = useAPISWR<{ course_roadmap: StaticWeek[] }>(staticRoadmapUrl);

  // Use regular API call for student-specific data (no caching)
  const [studentData, setStudentData] = useState<StudentWeek[]>([]);
  const [studentDataLoading, setStudentDataLoading] = useState(true);
  const [studentDataError, setStudentDataError] = useState<any>(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setStudentDataLoading(true);
        const url = `${process.env.REACT_APP_BACKEND_URL}api/roadmap_students_data/${studentId}/${courseId}/${batchId}/${subjectId}/`;
        const response = await getApiClient().get(url);
        setStudentData(response.data.weeks);
        setStudentDataError(null);
      } catch (error: any) {
        setStudentDataError(error);
        console.error("Error fetching student data:", error);
      } finally {
        setStudentDataLoading(false);
      }
    };

    fetchStudentData();
  }, [studentId, courseId, batchId, subjectId]);

  useEffect(() => {
    if (staticRoadmapData && studentData.length > 0) {
      try {
        setLoading(true);
        
        const staticData = staticRoadmapData.course_roadmap;
        
        // Merge the data
        const mergedData = staticData.map((staticWeek: StaticWeek) => {
          const studentWeek = studentData.find((sw: StudentWeek) => sw.week === staticWeek.week);
          
          const mergedDays = staticWeek.days?.map((staticDay) => {
            
            const studentDay = studentWeek?.days?.find((sd: { day: number }) => sd.day.toString() === staticDay.day);
            
            // Format practice MCQ and coding data based on static data
            const mcqQuestions = staticDay.mcq > 0 ? `${studentDay?.practiceMCQ?.questions?.split('/')[0] || "0"}/${staticDay.mcq}` : "0/0";
            const mcqScore = staticDay.mcq_total_score > 0 ? `${studentDay?.practiceMCQ?.score?.split('/')[0] || "0"}/${staticDay.mcq_total_score}` : "0/0";
            
            const codingQuestions = staticDay.coding > 0 ? `${studentDay?.practiceCoding?.questions?.split('/')[0] || "0"}/${staticDay.coding}` : "0/0";
            const codingScore = staticDay.coding_total_score > 0 ? `${studentDay?.practiceCoding?.score?.split('/')[0] || "0"}/${staticDay.coding_total_score}` : "0/0";
            
            return {
              day: parseInt(staticDay.day),
              day_key: staticDay.day_key,
              date: staticDay.date,
              topics: staticDay.topics ? [staticDay.topics] : undefined,
              practiceMCQ: {
                questions: mcqQuestions,
                score: mcqScore
              },
              practiceCoding: {
                questions: codingQuestions,
                score: codingScore
              },
              status: studentDay?.status || "",
            };
          }).filter(Boolean) as Day[] || [];
          
          return {
            weekNumber: staticWeek.week,
            startDate: staticWeek.startDate,
            endDate: staticWeek.endDate,
            totalHours: staticWeek.totalHours ? staticWeek.totalHours.toString() : undefined,
            topics: staticWeek.topics || undefined,
            days: mergedDays,
          };
        }).filter(Boolean) as Week[];
        
        setData(mergedData);
        setError(null);
      } catch (innerError: any) {
        setError('No data found');
        console.error("Error processing subject overview data:", innerError);
      } finally {
        setLoading(false);
      }
    }
  }, [staticRoadmapData, studentData]);

  // Handle errors from SWR and regular API calls
  useEffect(() => {
    if (staticRoadmapError || studentDataError) {
      setError('No data found');
      console.error("Error fetching subject overview data:", staticRoadmapError || studentDataError);
    }
  }, [staticRoadmapError, studentDataError]);
 
  useEffect(() => {
    const newOpenWeeks = new Set<number>();
 
    // Find the current week (week with Start or Resume status)
    let currentWeekNumber = null;
    for (const week of data) {
      const hasStartOrResume = week.days?.some((day) =>
        ["Resume", "Start"].includes(day.status)
      );
      if (hasStartOrResume) {
        currentWeekNumber = week.weekNumber;
        break;
      }
    }
 
    // Only open the current week if found
    if (currentWeekNumber !== null) {
      newOpenWeeks.add(currentWeekNumber);
    }
 
    setOpenWeeks(newOpenWeeks);
 
    data.forEach((week) => {
      week.days?.forEach((day) => {
        if (["Start", "Completed"].includes(day.status)) {
          sessionStorage.setItem('lastContentType', '');
          sessionStorage.setItem('lastSubTopicIndex', '');
        }
      });
    });
  }, [data]);
 
  const toggleWeek = (weekNumber: number) => {
    const newOpenWeeks = new Set(openWeeks);
    if (newOpenWeeks.has(weekNumber)) {
      newOpenWeeks.delete(weekNumber);
    } else {
      newOpenWeeks.add(weekNumber);
    }
    setOpenWeeks(newOpenWeeks);
  };
 
  const handleStartButtonClickVideo = async (
    day_key: string,
    weekNumber: number,
    day_status: string,
    topics: string[] | undefined
  ) => {
    setBtnClickLoading(true);
 
    const encryptedDayKey = CryptoJS.AES.encrypt(day_key, secretKey).toString();
    const encryptedWeekNumber = CryptoJS.AES.encrypt(weekNumber.toString(), secretKey).toString();
    sessionStorage.setItem("DayNumber", encryptedDayKey);
    sessionStorage.setItem("WeekNumber", encryptedWeekNumber);
    const url = `${process.env.REACT_APP_BACKEND_URL}api/student/test/weekly/${studentId}/${weekNumber}/${subjectId}`;
    const url1 = `${process.env.REACT_APP_BACKEND_URL}api/student/add/days/`;
    try {
      if (topics && topics.includes("Weekly Test")) {
        const response = await getApiClient().get(url);
 
        if (response.data.test_id) {
          const encryptedTestId = CryptoJS.AES.encrypt(response.data.test_id, secretKey).toString();
          sessionStorage.setItem("TestId", encryptedTestId);
          sessionStorage.setItem("TestType", "Weekly Test");
          const encryptedTestSubjectId = CryptoJS.AES.encrypt(subjectId, secretKey).toString();
          sessionStorage.setItem("TestSubjectId", encryptedTestSubjectId);
          
          // Store test status for button text in test introduction
          const buttonText = day_status === "Resume" ? "Resume" : "Start";
          sessionStorage.setItem('TestButtonStatus', buttonText);
        }
 
        navigate("/test-introduction", { replace: true });
      } else {
        if (day_status === "Start") {
          await getApiClient().post(url1, {
            student_id: studentId,
            subject: decryptedSubject,
            subject_id: subjectId,
            week_number: weekNumber,
            day_number: day_key,
          });
        }
 
        navigate("/Subject-Roadmap", { replace: true });
      }
    } catch (error) {
      console.error("Error in handleStartButtonClickVideo:", error);
    } finally {
      setBtnClickLoading(false);
    }
  };
 
  if (loading) {
    return (
      <div className="bg-white mt-2 border rounded-1 pt-2 p- px-2 me-2" style={{ backgroundColor: "#F2EEEE", height: `calc(100vh - 58px)`, overflowY: "auto" }}>
        <div className="table-container p-1 mb-3 mt-4 border rounded-1">
          <Skeleton height={35} style={{ backgroundColor: "#D7DCFF" }} />
        </div>
        <div className="table-container p-1 mb-3 border rounded-1">
          <Skeleton height={35} style={{ backgroundColor: "#D7DCFF" }} />
        </div>
        <div className="table-container p-1 mb-3 border rounded-1">
          <Skeleton height={35} style={{ backgroundColor: "#D7DCFF" }} />
        </div>
        <div className="table-container p-1 mb-3 border rounded-1">
          <Skeleton height={35} style={{ backgroundColor: "#D7DCFF" }} />
        </div>
        <div className="table-container p-1 mb-3 border rounded-1">
          <Skeleton height={35} style={{ backgroundColor: "#D7DCFF" }} />
        </div>
        <div className="table-container p-1 mb-3 border rounded-1">
          <Skeleton height={35} style={{ backgroundColor: "#D7DCFF" }} />
        </div>
        <div className="table-container p-1 mb-3 border rounded-1">
          <Skeleton height={35} style={{ backgroundColor: "#D7DCFF" }} />
        </div>
        <div className="table-container p-1 mb-3 border rounded-1">
          <Skeleton height={35} style={{ backgroundColor: "#D7DCFF" }} />
        </div>
        <div className="table-container p-1 mb-3 border rounded-1">
          <Skeleton height={35} style={{ backgroundColor: "#D7DCFF" }} />
        </div>
      </div>
    );
  }
 
  if (error) return <div>Error fetching data!</div>;
 
  return (
    <div className="" style={{ backgroundColor: "#F2EEEE", height: `calc(100vh - 90px)` }}>
      <div className="p-0 my-0 me-2" style={{ backgroundColor: "#F2EEEE" }}>
        <div className="container-fluid bg-white mt-2 rounded-1 pt-2" style={{ height: `calc(100vh - 58px)`, overflowY: "auto", border: '1px solid #ABABAB', paddingTop: '8px', paddingBottom: '8px' }}>
          {data.map((week) => (
            <div className="mb-2 rounded p-1" key={week.weekNumber} style={{ border: '1px solid #ABABAB' }}>
              <div className="p-2 rounded-2 d-flex justify-content-between align-items-center" style={{ backgroundColor: "#D7DCFF" }}>
                <div className="d-flex p-0 justify-content-between flex-wrap" style={{ cursor: 'default' }}>
                  {week.topics ? (
                    <h5 className="m-0 p-0 pe-5">{week.topics}</h5>
                  ) : (
                    <h5 className="m-0 p-0 pe-3">Week {week.weekNumber}</h5>
                  )}
                  {openWeeks.has(week.weekNumber) && !week.topics && (
                    <>
                      {week.days && (
                        <p className="m-0 p-0 text-sm" title={`You are going to learn ${[
                          ...new Set(
                            week.days
                              .filter((day) => day.topics)
                              .flatMap((day) => day.topics)
                          ),
                        ].reduce((str, topic, index, arr) => {
                          if (index === 0) return topic;
                          if (index === arr.length - 1)
                            return `${str} and ${topic}`;
                          return `${str}, ${topic}`;
                        }, "")}.`}>
                          {(() => {
                            const topics = [
                              ...new Set(
                                week.days
                                  .filter((day) => day.topics)
                                  .flatMap((day) => day.topics)
                              ),
                            ].reduce((str, topic, index, arr) => {
                              if (index === 0) return topic;
                              if (index === arr.length - 1)
                                return `${str} and ${topic}`;
                              return `${str}, ${topic}`;
                            }, "");
 
                            const text = `You are going to learn ${topics}.`;
                            return text.length >
                              (window.innerWidth < 600
                                ? 50
                                : window.innerWidth < 1024
                                  ? 80
                                  : 100)
                              ? text.slice(
                                0,
                                window.innerWidth < 1000
                                  ? 50
                                  : window.innerWidth < 1200
                                    ? 80
                                    : window.innerWidth < 1400 ? 100 : 140
                              ) + "..."
                              : text;
                          })()}
                        </p>
                      )}
                    </>
                  )}
 
                  {week.topics && (
                    <>
                      <h5 className="m-0 p-0 pe-5">{week.startDate}</h5>
                      <h5 className="m-0 p-0">{week.endDate}</h5>
                    </>
                  )}
                </div>
                <div className="d-flex justify-content-between">
                  {openWeeks.has(week.weekNumber) && (
                    <>
                      {week.totalHours && (
                        <div className="d-flex align-items-center justify-content-start">
                          <h5 className="m-0 p-0 pe-2">{week.totalHours}hrs</h5>
                          <span role="button" title={`${week.totalHours} learning ${parseFloat(week.totalHours) >1 ? "contents" : "content"} has been assigned for the week ${week.weekNumber} and you are expected to spend minimum 2 hours per day`} style={{ fontSize: "20px", cursor: "default" }} className="mb-1">
                            <IoMdInformationCircleOutline />
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  <h5 className="m-0 p-0 pe-5"></h5>
 
                  <button
                    className="btn btn-sm p-0 px-1 fw-bold"
                    onClick={() => toggleWeek(week.weekNumber)}
                    disabled={week.days && week.days.length === 0}
                    style={{ border: "none", outline: "none", boxShadow: "none" }}
                  >
                    {openWeeks.has(week.weekNumber) ? (
                      <CiSquareChevDown fontSize={25} className="ms-2" />
                    ) : (
                      <CiSquareChevUp fontSize={25} className="ms-2" />
                    )}
                  </button>
                </div>
              </div>
              {openWeeks.has(week.weekNumber) && week.days ? (
                <div className="">
                  <div className="py-1 d-flex justify-content-between align-items-center">
                    <div className="me-3" style={{ padding: "0px 0px 0px 60px" }}></div>
                    <div className="d-flex justify-content-between flex-grow-1">
                      <div className="d-flex align-items-center" style={{ width: '70px' }}></div>
                      <div className="text-start d-flex align-items-center" role="button" style={{ fontSize: "14px", cursor: "default", width: window.innerWidth >= 1280 ? "500px" : window.innerWidth >= 1024 ? "300px" : window.innerWidth >= 768 ? "200px" : "120px" }}></div>
                      <div className="" style={{ fontSize: '15px', color: '#000', paddingLeft: '30px', width: '150px' }}>Practice MCQ</div>
                      <div className="" style={{ fontSize: '15px', color: '#000', paddingLeft: '10px', width: '150px' }}>Practice Coding</div>
                      <div style={{ width: "85px" }}></div>
                    </div>
                  </div>
                  {week.days.map((day) => (
                    <div className="mb-2 d-flex justify-content-between align-items-center" key={day.day}>
                      <div className="border-end border-1 border-black me-3" style={{ padding: "10px", cursor: "default", width: "80px" }}>
                        Day {day.day}
                      </div>
                      <div className="d-flex justify-content-between flex-grow-1 rounded-2 ps-3 p-1" style={{ border: '1px solid #ABABAB' }}>
                        {day.date && <div className="d-flex align-items-center" style={{ width: '100px', cursor: "default" }}>{day.date}</div>}
                        {day.topics && (
                          <div
                            className="text-start d-flex align-items-center"
                            role="button"
                            title={day.topics ? day.topics.map((topic) => `${topic}`).join(" | ") : ""}
                            style={{
                              fontSize: "14px",
                              cursor: "default",
                              width: window.innerWidth >= 1280 ? "500px" : window.innerWidth >= 1024 ? "300px" : window.innerWidth >= 768 ? "200px" : "120px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {(() => {
                              const topicsString = day.topics?.map((topic) => `${topic}`).join(" | ") || "";
                              return topicsString.length > 60 ? topicsString.substring(0, 40) + "..." : topicsString;
                            })()}
                          </div>
                        )}
 
                        <div style={{ fontSize: "12px", cursor: "default", width: '150px' }}>
                          {day.practiceMCQ && !["Internship", "Semester Exam", "Preparation Day", "Festivals", "Weekly Test","Onsite Workshop","Internals"].some(topic => day.topics?.includes(topic)) && (
                            <>
                              {day.practiceMCQ.questions && (
                                <p className="m-0 d-flex justify-content-start">
                                  Questions: {day.practiceMCQ.questions}
                                </p>
                              )}
                              {day.practiceMCQ.score && (
                                <p className="m-0 d-flex justify-content-start">
                                  Score: {day.practiceMCQ.score}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                        <div style={{ fontSize: "12px", cursor: "default", width: '150px' }}>
                          {day.practiceCoding && !["Internship", "Semester Exam", "Preparation Day", "Festivals", "Weekly Test","Onsite Workshop","Internals"].some(topic => day.topics?.includes(topic)) && (
                            <>
                              {day.practiceCoding.questions && (
                                <p className="m-0 d-flex justify-content-start">
                                  Questions: {day.practiceCoding.questions}
                                </p>
                              )}
                              {day.practiceCoding.score && (
                                <p className="m-0 d-flex justify-content-start">
                                  Score: {day.practiceCoding.score}
                                </p>
                              )}
                            </>
                          )}
                          {day.testScore && day.testScore.score && (
                          <div className="py-2 d-flex align-items-center" style={{ fontSize: '14px', cursor: "default" }}>
                            Score: {day.testScore.score}
                          </div>
                        )}
                        </div>
 
                        {/* {day.testScore && day.testScore.score && (
                          <div className="py-2 ps-5 d-flex align-items-center" style={{ fontSize: '14px', cursor: "default" }}>
                            Score: {day.testScore.score}
                          </div>
                        )} */}
                        {day.status && (
                          <div>
                            <button
                              style={{ 
                                width: "85px", 
                                height: "30px", 
                                backgroundColor: "#E9EBFF", 
                                boxShadow: "0px 6px 6px rgba(0, 0, 0, 0.3)",
                                cursor: (day.status === "Completed" && day.topics?.includes("Weekly Test")) ? "not-allowed" : "pointer",
                                opacity: (day.status === "Completed" && day.topics?.includes("Weekly Test")) ? 0.6 : 1,
                              }}
                              className="btn btn-sm"
                              onClick={() => handleStartButtonClickVideo(day.day_key, week.weekNumber, day.status, day.topics)}
                              disabled={day.status === "Completed" && day.topics?.includes("Weekly Test")}
                            >
                              {day.status}
                            </button>
                          </div>
                        )}
 
                        {!day.status && <div style={{ width: "85px" }}></div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      {btnClickLoading && (
        <div className="loading-overlay">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      )}
    </div>
  );
};
 
export default SubjectOverview;