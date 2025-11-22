import React, { useState, useEffect, createContext, useContext } from "react";
import DashBoardProfile from "./Components/DashBoardProfile";
import Progress from "./Components/Progress";
import Courses from "./Components/Courses";
import Activity from "./Components/Activity";
import Upcoming from "./Components/Upcoming";
import Calendar from "./Components/Calendar";
import { useAPISWR } from "./utils/swrConfig";
import CryptoJS from "crypto-js";
import { secretKey } from "./constants";

interface SkeletonProps {
  width: string;
  height: string;
  className?: string; 
}

// Create context for API loading state
interface ApiLoadingContextType {
  isCoursesApiLoaded: boolean;
  coursesData: any;
  coursesError: any;
  studentId: string;
}

const ApiLoadingContext = createContext<ApiLoadingContextType>({
  isCoursesApiLoaded: false,
  coursesData: null,
  coursesError: null,
  studentId: ''
});

export const useApiLoading = () => useContext(ApiLoadingContext);

const Dashboard: React.FC = () => {
  const [isCoursesLoaded, setIsCoursesLoaded] = useState(false);
  
  // Get student ID for API calls
  const encryptedStudentId = sessionStorage.getItem('StudentId');
  const studentId = encryptedStudentId ? CryptoJS.AES.decrypt(encryptedStudentId, secretKey).toString(CryptoJS.enc.Utf8) : '';

  // Hardcoded API response
  const coursesData = {
    "subjects": [
      {
        "title": "Python",
        "subject": "Python",
        "subject_id": "py",
        "image": "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=2069&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "duration": "31st Aug 25 - 1st Sep 25",
        "progress": {
          "student_progress": 0,
          "progress": 100
        },
        "status": "Open"
      }
    ],
    "internships": [
      {
        "title": "Choose Intenship",
        "image": "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=2069&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "duration": "31st Dec 25",
        "status": "select"
      },
      {
        "title": "TODO List",
        "image": "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=2069&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "duration": "31st Dec 25 - 1st Feb 25",
        "progress": {
          "student_progress": 0,
          "progress": 100
        },
        "status": "Open",
        "can_change": "true",
        "time_left": "2 hours left"
      },
      {
        "title": "TODO List",
        "image": "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=2069&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "duration": "31st Dec 25 - 1st Feb 25",
        "progress": {
          "student_progress": 0,
          "progress": 100
        },
        "status": "Open",
        "can_change": "false"
      }
    ]
  };
  const coursesError = null;

  // Call the courses API first - this is the primary API
  // const { data: coursesData, error: coursesError } = useAPISWR<any>(`${process.env.REACT_APP_BACKEND_URL}api/studentdashboard/mycourses/${studentId}`);

  // Only set courses as loaded when the API response is received
  useEffect(() => {
    // Simulate API loading delay
    const timer = setTimeout(() => {
      setIsCoursesLoaded(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const Skeleton: React.FC<SkeletonProps> = ({ width, height, className = "" }) => (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        // backgroundColor: "#e1e1e1",
        borderRadius: "4px",
        margin: "10px 0",
      }}
    ></div>
  );

  // Provide context value
  const contextValue: ApiLoadingContextType = {
    isCoursesApiLoaded: isCoursesLoaded,
    coursesData,
    coursesError,
    studentId
  };

  return (
    <ApiLoadingContext.Provider value={contextValue}>
      <div style={{ backgroundColor: "#F3EDED", minHeight: "100vh" }}>
        <div className="" style={{ backgroundColor: "#F3EDED" }}>
          <div className="container-fluid">
            <div className="row">
              <div
                className="col me-3 mt-3 rounded-3 text-white"
                style={{ backgroundColor: "#111111" }}
              >
                <div className="row me-2 mt-2 mb-2">
                  <div className="col-lg-7 col-md-6 col-xl-8 col-xxl-7">
                    {isCoursesLoaded ? <DashBoardProfile /> : <Skeleton width="100%" height="250px" />}
                  </div>
                  <div className="col-lg-5 col-md-6 col-xl-4 col-xxl-5">
                    {isCoursesLoaded ? <Progress /> : <Skeleton width="100%" height="200px" />}
                  </div>
                </div>
              </div>
            </div>
            <div className="row mt-2 mb-2" style={{ marginRight: "0px" }}>
              <div className="col bg-white rounded-3 px-4">
                <Courses />
              </div>
            </div>
            <div className="row mt-2 mb-2" style={{ marginRight: "0px" }}>
              <div className="col-sm-12 col-md-12 col-lg-5 p-0">
                {isCoursesLoaded ? <Activity /> : <Skeleton width="100%" height="300px" />}
              </div>
              <div className="col-sm-12 col-md-8 col-lg-4 p-0">
                {isCoursesLoaded ? <Upcoming /> : <Skeleton width="100%" height="300px" />}
              </div>
              <div className="col-sm-12 col-md-4 col-lg-3 p-0">
                {isCoursesLoaded ? <Calendar /> : <Skeleton width="100%" height="300px" />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ApiLoadingContext.Provider>
  );
};

export default Dashboard;
