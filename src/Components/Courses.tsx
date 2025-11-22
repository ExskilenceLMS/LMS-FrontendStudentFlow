import React, { useEffect, useState, useRef } from "react";
import { Card, ProgressBar, Button } from "react-bootstrap";
import { FaClock } from "react-icons/fa";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleRight, faExchangeAlt } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import CryptoJS from "crypto-js";
import { secretKey } from "../constants";
import './Courses.css';
import CourseImage from "../Components/images/CourseImage.png";
import { useApiLoading } from "../Dashboard";
import ProjectSelectionModal from "./ProjectSelectionModal";

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

interface Internship {
  title: string;
  image: string;
  duration: string;
  status: string;
  progress?: {
    student_progress: number;
    progress: number;
  };
  can_change?: string;
  time_left?: string;
}

interface CoursesResponse {
  subjects: Course[];
  internships: Internship[];
}

interface LearningCardProps {
  keyProp: string;
  image: string;
  title: string;
  titleTooltip?: string;
  duration: string;
  progress?: {
    student_progress: number;
    progress: number;
  };
  status?: string;
  cardColor: string;
  onClick?: () => void;
  extraRow?: React.ReactNode;
  actionArea?: React.ReactNode;
  imageAlt: string;
}

const Courses: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState<Internship | null>(null);
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
    navigate("/SubjectOverview", { 
      state: { title: courseTitle },
      replace: true 
    });
  };

  const handleInternshipClick = (internship: Internship) => {
    if (internship.status === "select") {
      // Open modal for project selection
      setSelectedInternship(internship);
      setShowProjectModal(true);
    } else if (internship.status === "Open") {
      // Navigate to task-description page
      // TODO: Update with actual route when available
      navigate("/task-description", {
        state: { internship },
        replace: true
      });
    }
  };

  const handleChangeProject = (internship: Internship, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setSelectedInternship(internship);
    setShowProjectModal(true);
  };

  const handleCloseModal = () => {
    setShowProjectModal(false);
    setSelectedInternship(null);
  };

  // Use the context instead of making our own API call
  const { coursesData, coursesError, isCoursesApiLoaded } = useApiLoading();

  useEffect(() => {
    if (coursesData && isCoursesApiLoaded) {
      const availableColors = ["#B6BAFE","#F0DC54","#B5FEB5","#B6FEB5","#B6BAFE","#FFB5B5"];
      // Assign different colors to each course, cycling through the color array
      const courseData = (coursesData?.subjects || []).map((course: any, index: number) => ({
        ...course,
        color: availableColors[index % availableColors.length],
      }));

      setCourses(courseData);
      
      // Set internships data
      setInternships(coursesData?.internships || []);

      setTimeout(checkScrollStatus, 100);
    }
  }, [coursesData, isCoursesApiLoaded]);

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
  }, [courses.length, internships.length]);

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

  const renderLearningCard = ({
    keyProp,
    image,
    title,
    titleTooltip,
    duration,
    progress,
    status,
    cardColor,
    onClick,
    extraRow,
    actionArea,
    imageAlt
  }: LearningCardProps) => (
    <Card
      key={keyProp}
      className={`${status === "Open" ? "open-course" : "closed-course"} mb-2`}
      style={{
        width: "350px",
        height: "150px",
        minWidth: "350px",
        marginRight: "1rem",
        boxShadow: "8px 8px 8px rgba(0, 0, 0, 0.2)",
        cursor: onClick ? "pointer" : "default"
      }}
      onClick={onClick}
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
                src={image}
                alt={imageAlt}
                className="img"
                style={{
                  objectFit: "cover",
                  width: "100%",
                  height: "100%",
                }}
              />
            </div>
          </div>
          <div
            className="d-flex flex-column justify-content-between h-100 w-100"
            style={{ minHeight: "130px" }}
          >
            <h6
              className="p-1 mt-2 d-flex justify-content-between"
              style={{
                backgroundColor: cardColor,
                color: "black",
                borderRadius: "4px",
                width: "200px",
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
              }}
              title={titleTooltip && titleTooltip.length > 20 ? titleTooltip : ""}
            >
              {title}
              <FontAwesomeIcon
                icon={faCircleRight}
                style={{
                  color: "#009dff",
                  fontSize: "18px"
                }}
              />
            </h6>
            <div className="text-dark small w-100">
              <div className="d-flex align-items-center gap-2">
                <FaClock className="mb-1" />
                <span className="text-secondary">Duration</span>
              </div>
              <div className="fw-normal">{duration}</div>
              {extraRow}
            </div>
            {progress && (
              <div className="mt-2" style={{ width: "200px" }}>
                <ProgressBar
                  className="border-dark border rounded-1"
                  style={{
                    width: "200px",
                    height: "10px",
                    borderRadius: "4px",
                    borderColor: "#74C0FC",
                    backgroundColor: "white",
                  }}
                >
                  <ProgressBar
                    style={{ color: "#37D447", background: "#37D447" }}
                    now={progress.student_progress}
                    key={1}
                  />
                  <ProgressBar
                    now={progress.progress - progress.student_progress}
                    key={2}
                    style={{ backgroundColor: "white" }}
                  />
                </ProgressBar>
                {progress.student_progress === 0 && (
                  <span className="d-flex justify-content-center align-items-center text-center pt-1 text-muted" style={{ fontSize: "0.7rem" }}>
                    Not Started
                  </span>
                )}
              </div>
            )}
            {actionArea}
          </div>
        </div>
      </Card.Body>
    </Card>
  );

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
        {!courses.length && !internships.length ? (
          <div className="d-flex flex-nowrap justify-content-around">
            {dummyCourses.map((dummyCourse, i) =>
              renderLearningCard({
                keyProp: `dummy-${i}`,
                image: dummyCourse.image,
                title: dummyCourse.subject,
                titleTooltip: dummyCourse.title,
                duration: dummyCourse.duration,
                progress: dummyCourse.progress,
                status: dummyCourse.status,
                cardColor: dummyCourse.color,
                imageAlt: `${dummyCourse.title} Preview`,
              })
            )}
          </div>
        ) : (
          <>
            {/* Render Subjects */}
            {courses.map((course, index) => {
              const displayCourseTitle = course.subject?.trim() ? course.subject : course.title;
              const truncatedCourseTitle =
                displayCourseTitle.length > 20 ? `${displayCourseTitle.slice(0, 20)}...` : displayCourseTitle;

              return renderLearningCard({
                keyProp: `course-${index}`,
                image: course.image,
                title: truncatedCourseTitle,
                titleTooltip: course.title,
                duration: course.duration,
                progress: course.progress,
                status: course.status,
                cardColor: course.color,
                onClick: course.status === "Open" ? () => handleCourseClick(course.subject_id, course.subject, course.title) : undefined,
                imageAlt: `${course.title} Preview`,
              });
            })}
            
            {/* Render Internships */}
            {internships.map((internship, index) => {
              const availableColors = ["#B6BAFE","#F0DC54","#B5FEB5","#B6FEB5","#B6BAFE","#FFB5B5"];
              const internshipColor = availableColors[(courses.length + index) % availableColors.length];
              const isLastItem = index === internships.length - 1 && courses.length === 0;
              const displayInternshipTitle =
                internship.title?.trim()
                  ? internship.title
                  : (internship as any).subject?.trim() || "Internship";
              const truncatedInternshipTitle =
                displayInternshipTitle.length > 20
                  ? `${displayInternshipTitle.slice(0, 20)}...`
                  : displayInternshipTitle;
              const extraRow =
                (internship.time_left || internship.can_change === "true") ? (
                  <div className="d-flex justify-content-between align-items-center" style={{ width: "200px" }}>
                    {internship.time_left ? (
                      <span className="text-danger fw-semibold">
                        {internship.time_left}
                      </span>
                    ) : (
                      <span></span>
                    )}
                    {internship.can_change === "true" && (
                      <FontAwesomeIcon
                        icon={faExchangeAlt}
                        role="button"
                        onClick={(e) => handleChangeProject(internship, e)}
                        title="Change Project"
                        className="text-primary"
                      />
                    )}
                  </div>
                ) : null;

              const actionArea = internship.status === "select" ? (
                <div className="mt-2" style={{ width: "200px" }}>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInternshipClick(internship);
                    }}
                  >
                    Select Project
                  </Button>
                </div>
              ) : undefined;
              
              return renderLearningCard({
                keyProp: `internship-${index}`,
                image: internship.image,
                title: truncatedInternshipTitle,
                titleTooltip: internship.title,
                duration: internship.duration,
                progress: internship.progress,
                status: internship.status,
                cardColor: internshipColor,
                onClick: internship.status === "Open" || internship.status === "select" ? () => handleInternshipClick(internship) : undefined,
                extraRow,
                actionArea,
                imageAlt: `${internship.title} Preview`,
              });
            })}
          </>
        )}
      </div>
      
      <ProjectSelectionModal
        show={showProjectModal}
        internship={selectedInternship}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default Courses;
