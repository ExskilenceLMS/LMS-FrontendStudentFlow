import React, { useEffect, useState, useRef } from "react";
import { Card, ProgressBar } from "react-bootstrap";
import { FaClock } from "react-icons/fa";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleRight } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import { useDashboardSWR } from "../utils/swrConfig";
import { AxiosError } from "axios";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import CryptoJS from "crypto-js";
import { secretKey } from "../constants";
import './Courses.css';
import CourseImage from "../Components/images/CourseImage.png";

interface Course {
  title: string;
  subject: string;
  subject_id: string;
  color: string;
  image: string;
  duration: string;
  progress: {
    student_progress: number;
    progress: number;
  };
  student_progress: number;
  status: string;
}

interface CoursesResponse {
  subjects: Course[];
}

const Courses: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [scrollPosition, setScrollPosition] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const encryptedStudentId = sessionStorage.getItem('StudentId');
  const decryptedStudentId = encryptedStudentId ? CryptoJS.AES.decrypt(encryptedStudentId, secretKey).toString(CryptoJS.enc.Utf8) : '';
  const studentId = decryptedStudentId;
  const actualStudentId = sessionStorage.getItem('StudentId') ? CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8) : '';
  const actualEmail = sessionStorage.getItem('Email') ? CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8) : '';
  const actualName = sessionStorage.getItem('Name') ? CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8) : '';

  const dummyCourses = [
    {
      title: "Loading Course Title...",
      subject: "Loading Subject...",
      subject_id: "0",
      color: "#FFB5B5",
      image: CourseImage,
      duration: "00:00",
      progress: {
        student_progress: 0,
        progress: 0,
      },
      status: "Loading",
    }
  ];

  const handleCourseClick = (subject_id: string, subject: string, courseTitle: string) => {
    const encryptedSubjectId = CryptoJS.AES.encrypt(subject_id, secretKey).toString();
    const encryptedSubject = CryptoJS.AES.encrypt(subject, secretKey).toString();
    sessionStorage.setItem('SubjectId', encryptedSubjectId);
    sessionStorage.setItem("Subject", encryptedSubject);
    navigate("/SubjectOverview", { state: { title: courseTitle } });
  };

  const { data: coursesData, error: coursesError } = useDashboardSWR<CoursesResponse>(`${process.env.REACT_APP_BACKEND_URL}api/studentdashboard/mycourses/${studentId}`);

  useEffect(() => {
    if (coursesData) {
      const colorMapping: { [key: string]: string } = {
        "HTML CSS": "#B6BAFE",
        "JavaScript": "#F0DC54",
        "Python": "#B5FEB5",
        "Python8": "#B5FEB5",
        "Data Structures with C++ and Object-Oriented Programming with C++": "#B6FEB5",
        "Data Structures and Algorithms": "#B6BAFE",
        "SQL": "#FFB5B5",
        "SQL8": "#FFB5B5",
      };

      const courseData = (coursesData.subjects || []).map((course: Course) => ({
        ...course,
        color: colorMapping[course.title] || "#D3D3D3",
      }));

      setCourses(courseData);

      setTimeout(checkScrollStatus, 100);
    }
  }, [coursesData]);

  const checkScrollStatus = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;

      const hasRightScroll = Math.ceil(scrollLeft + clientWidth) < scrollWidth - 2;

      setScrollPosition({
        canScrollLeft: scrollLeft > 0,
        canScrollRight: hasRightScroll
      });
    }
  };

  useEffect(() => {
    checkScrollStatus();

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScrollStatus);

      setTimeout(checkScrollStatus, 100);

      window.addEventListener('resize', checkScrollStatus);
    }

    return () => {
      if (container) {
        container.removeEventListener("scroll", checkScrollStatus);
      }
      window.removeEventListener('resize', checkScrollStatus);
    };
  }, [courses.length]);

  const scrollLeft = () => {
    if (scrollContainerRef.current && scrollPosition.canScrollLeft) {
      const container = scrollContainerRef.current;
      container.scrollBy({
        left: -container.clientWidth / 2,
        behavior: "smooth",
      });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current && scrollPosition.canScrollRight) {
      const container = scrollContainerRef.current;
      container.scrollBy({
        left: container.clientWidth / 2,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="row rounded-2">
      <div className="d-flex justify-content-end py-1" style={{ fontSize: "14px" }}>
        <div className="text-dark">
          <ChevronLeft
            onClick={scrollLeft}
            className={`arrow left ${
              !scrollPosition.canScrollLeft ? "disabled" : ""
            }`}
            style={{
              cursor: scrollPosition.canScrollLeft ? "pointer" : "pointer",
              color: !scrollPosition.canScrollLeft ? "#7F7F7F" : "inherit",
            }}
          />
          <ChevronRight
            onClick={scrollRight}
            className={`arrow right ${
              !scrollPosition.canScrollRight ? "disabled" : ""
            }`}
            style={{
              cursor: scrollPosition.canScrollRight ? "pointer" : "pointer",
              color: !scrollPosition.canScrollRight ? "#7F7F7F" : "inherit",
            }}
          />
        </div>
      </div>
      <div
        className="course-container d-flex text-dark pb-3 pt-1 flex-nowrap"
        ref={scrollContainerRef}
        style={{
          overflowX: "auto",
          overflowY: "hidden",
          scrollbarWidth: "none",
          width: "100%",
        }}
        onLoad={checkScrollStatus}
      >
        {!courses.length ? (
          <div className="d-flex flex-nowrap justify-content-around">
            {dummyCourses.map((dummyCourse, i) => (
              <Card
                key={i}
                className="closed-course mb-2"
                style={{
                  width: "350px",
                  height: "150px",
                  minWidth: "350px",
                  marginRight: i !== dummyCourses.length - 1 ? "1rem" : "0",
                  boxShadow: "8px 8px 8px rgba(0, 0, 0, 0.2)",
                }}
              >
                <Card.Body className="p-1 rounded-2">
                  <div className="d-flex p-0">
                    <div className="d-flex flex-column align-items-center me-3">
                      <div
                        className="preview-image ms-2 mt-1 mb-2 border rounded-2"
                        style={{
                          width: "90px",
                          height: "130px",
                          overflow: "hidden",
                        }}
                      >
                        <img
                          src={dummyCourse.image}
                          alt={`${dummyCourse.title} Preview`}
                          className="img"
                          style={{
                            objectFit: "cover",
                            width: "100%",
                            height: "100%",
                          }}
                        />
                      </div>
                    </div>
                    <div className="d-flex flex-column">
                      <h6
                        className="p-1 mt-2 me-3"
                        style={{
                          backgroundColor: dummyCourse.color,
                          color: "black",
                          borderRadius: "4px",
                          width: "200px",
                          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        {dummyCourse.title}
                        <FontAwesomeIcon
                          icon={faCircleRight}
                          style={{
                            color: "#009dff",
                            fontSize: "18px",
                          }}
                        />
                      </h6>
                      <span style={{ fontSize: "14px", color: "black" }}>
                        <span>
                          <FaClock className="mb-1" />
                          <span className="text-secondary ps-2">Duration</span>
                        </span>
                        <br />
                        <span>{dummyCourse.duration}</span>
                        <ProgressBar
                          className="me-3 border-dark border rounded-1"
                          style={{
                            flexGrow: 1,
                            marginTop: "30px",
                            height: "10px",
                            borderRadius: "4px",
                            borderColor: "#74C0FC",
                            backgroundColor: "white",
                          }}
                        >
                          <ProgressBar
                            style={{ color: "#37D447", background: "#37D447" }}
                            now={dummyCourse.progress.student_progress}
                            key={1}
                          />
                          <ProgressBar
                            now={dummyCourse.progress.progress - dummyCourse.progress.student_progress}
                            key={2}
                            style={{ backgroundColor: "white" }}
                          />
                        </ProgressBar>
                        {dummyCourse.progress.student_progress === 0 && (
                          <span className="d-flex justify-content-center align-items-center text-center pt-1" style={{ fontSize: "8px" }}>
                            Not Started
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
        ) : (
          courses.map((course, index) => (
            <Card
              key={index}
              className={`${course.status === "Open" ? "open-course" : "closed-course"} mb-2`}
              style={{
                width: "350px",
                height: "150px",
                minWidth: "350px",
                marginRight: index !== courses.length - 1 ? "1rem" : "0",
                boxShadow: "8px 8px 8px rgba(0, 0, 0, 0.2)",
              }}
            >
              <Card.Body className="p-1 rounded-2">
                <div className="d-flex p-0">
                  <div className="d-flex flex-column align-items-center me-3">
                    <div
                      className="preview-image ms-2 mt-1 mb-2 border rounded-2"
                      style={{
                        width: "90px",
                        height: "130px",
                        overflow: "hidden",
                      }}
                    >
                      <img
                        src={course.image}
                        alt={`${course.title} Preview`}
                        className="img"
                        style={{
                          objectFit: "cover",
                          width: "100%",
                          height: "100%",
                        }}
                      />
                    </div>
                  </div>
                  <div className="d-flex flex-column">
                    <h6
                      className="p-1 mt-2 me-3"
                      style={{
                        backgroundColor: course.color,
                        color: "black",
                        borderRadius: "4px",
                        width: "200px",
                        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
                        display: "flex",
                        justifyContent: "space-between",
                        cursor: "pointer"
                      }}
                      title={course.title.length > 20 ? course.title : ""}
                      onClick={() => {
                        if (course.status === 'Open') {
                          handleCourseClick(course.subject_id, course.subject, course.title);
                        }
                      }}
                    >
                      {course.title.length > 20
                        ? `${course.title.slice(0, 20)}...`
                        : course.title}
                      <FontAwesomeIcon
                        icon={faCircleRight}
                        style={{
                          color: "#009dff",
                          fontSize: "18px"
                        }}
                      />
                    </h6>
                    <span style={{ fontSize: "14px", color: "black" }}>
                      <span>
                        <FaClock className="mb-1" />
                        <span className="text-secondary ps-2">Duration</span>
                      </span>
                      <br />
                      <span>{course.duration}</span>
                      <ProgressBar
                        className="me-3 border-dark border rounded-1"
                        style={{
                          flexGrow: 1,
                          marginTop: "30px",
                          height: "10px",
                          borderRadius: "4px",
                          borderColor: "#74C0FC",
                          backgroundColor: "white",
                        }}
                      >
                        <ProgressBar
                          style={{ color: "#37D447", background: "#37D447" }}
                          now={course.progress.student_progress}
                          key={1}
                        />
                        <ProgressBar
                          now={course.progress.progress - course.progress.student_progress}
                          key={2}
                          style={{ backgroundColor: "white" }}
                        />
                      </ProgressBar>
                      {course.progress.student_progress === 0 && (
                        <span className="d-flex justify-content-center align-items-center text-center pt-1" style={{ fontSize: "8px" }}>
                          Not Started
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Courses;
