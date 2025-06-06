import React, { useState, useEffect } from "react";
import DashBoardProfile from "./Components/DashBoardProfile";
import Progress from "./Components/Progress";
import Courses from "./Components/Courses";
import Activity from "./Components/Activity";
import Upcoming from "./Components/Upcoming";
import Calendar from "./Components/Calendar";

interface SkeletonProps {
  width: string;
  height: string;
  className?: string; 
}

const Dashboard: React.FC = () => {
  const [isCoursesLoaded, setIsCoursesLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCoursesLoaded(true);
    }, 1000);

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

  return (
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
  );
};

export default Dashboard;
