import React, { useEffect, useState, useRef } from "react";
import { Card, ProgressBar, Button } from "react-bootstrap";
import { FaClock } from "react-icons/fa";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleRight, faExchangeAlt, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import CryptoJS from "crypto-js";
import { secretKey } from "../constants";
import './Courses.css';
import CourseImage from "../Components/images/CourseImage.png";
import { useApiLoading } from "../Dashboard";
import ProjectSelectionModal from "./ProjectSelectionModal";
import { trackActivity } from "../utils/activityApi";

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
  can_change?: boolean | null;
  time_left?: string | null;
  project_id?: number | string | null; // Project ID for navigation to project roadmap
  subject_id?: string; // For internships that come from subjects array
  slots_open_time?: string | null;
  slots_close_time?: string | null;
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
    // Track subject activity
    trackActivity({ subjectId: subject_id });
    
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
      // Navigate to project roadmap if project_id is available
      if (internship.project_id) {
        // Track project activity
        trackActivity({ subjectId: internship.project_id.toString() });
        
        // Store project_id and project_name in sessionStorage for API calls
        sessionStorage.setItem("currentProjectId", internship.project_id.toString());
        sessionStorage.setItem("currentProjectName", internship.title || "Project");
        navigate(`/project-roadmap`, {
          replace: true
        });
      }
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
      
      const allSubjects = coursesData?.subjects || [];

      const allItemsWithColors = allSubjects.map((item: any, index: number) => ({
        ...item,
        color: availableColors[index % availableColors.length],
        isInternship: item.project_id !== null || item.subject_id?.startsWith("project_") || item.status === "select"
      }));

      const subjects = allItemsWithColors.filter((item: any) => !item.isInternship);
      const internships = allItemsWithColors.filter((item: any) => item.isInternship);

      setCourses(subjects);
      setInternships(internships);

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
        height: "155px",
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
            className="d-flex flex-column h-100 w-100"
            style={{ minHeight: "130px" }}
          >
                <h6
                  className="p-1 mt-2 d-flex justify-content-between align-items-center"
                  style={{
                    backgroundColor: cardColor,
                    color: "black",
                    borderRadius: "4px",
                    width: "200px",
                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={titleTooltip || title}
                >
                  <span style={{ display: 'block', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
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
            {actionArea}
            {progress && (
              <div className="mt-auto" style={{ width: "200px" }}>
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
                    className="progress-color"
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
                title: dummyCourse.title,
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
            {/* Render all items in original API order */}
            {coursesData?.subjects?.map((item: any, index: number) => {
              const availableColors = ["#B6BAFE","#F0DC54","#B5FEB5","#B6FEB5","#B6BAFE","#FFB5B5"];
              const itemColor = availableColors[index % availableColors.length];
              const isInternship = item.project_id !== null || item.subject_id?.startsWith("project_") || item.status === "select";
              
              const displayTitle = item.title;

              if (isInternship) {
                // Render as internship
                const extraRow = (item.can_change === true) ? (
                  <div className="d-flex justify-content-between align-items-center" style={{ width: "200px" }}>
                    {item.time_left && item.can_change === true ? (
                      <span className="text-danger fw-semibold">
                        {item.time_left}
                        <FontAwesomeIcon
                        className="ms-1 text-black"
                      icon={faInfoCircle}
                      style={{ cursor: 'pointer' }}
                      title="Select Project"
                    />
                      </span>
                    ) : (
                      <span></span>
                    )}
                    <FontAwesomeIcon
                      icon={faExchangeAlt}
                      role="button"
                      onClick={(e) => handleChangeProject(item, e)}
                      title="Change Project"
                      className="text-primary"
                    />
                  </div>
                ) : null;

                const actionArea = item.status === "select" ? (
                  <div style={{ width: "200px" }}>
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInternshipClick(item);
                      }}
                    >
                      Select Project
                    </Button>
                  </div>
                ) : undefined;

                return renderLearningCard({
                  keyProp: `item-${index}`,
                  image: item.image,
                  title: displayTitle,
                  titleTooltip: item.title,
                  duration: item.duration,
                  progress: item.status === "select" ? undefined : item.progress,
                  status: item.status,
                  cardColor: itemColor,
                  onClick: item.status === "Open" || item.status === "select" ? () => handleInternshipClick(item) : undefined,
                  extraRow,
                  actionArea,
                  imageAlt: `${item.title} Preview`,
                });
              } else {
                // Render as regular course
                return renderLearningCard({
                  keyProp: `item-${index}`,
                  image: item.image,
                  title: displayTitle,
                  titleTooltip: item.title,
                  duration: item.duration,
                  progress: item.progress,
                  status: item.status,
                  cardColor: itemColor,
                  onClick: item.status === "Open" ? () => handleCourseClick(item.subject_id, item.subject, item.title) : undefined,
                  imageAlt: `${item.title} Preview`,
                });
              }
            })}
          </>
        )}
      </div>
      
      <ProjectSelectionModal
        show={showProjectModal}
        internship={selectedInternship}
        onClose={handleCloseModal}
        initialSelectedProjectId={selectedInternship?.project_id ?? undefined}
      />
    </div>
  );
};

export default Courses;
