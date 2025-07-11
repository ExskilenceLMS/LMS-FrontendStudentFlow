import React, { useState, useEffect } from "react";
import { Card, Dropdown } from "react-bootstrap";
import Skeleton from "react-loading-skeleton";
import { getApiClient } from "../utils/apiAuth";
import { secretKey } from "../constants";
import CryptoJS from "crypto-js";

interface Subject {
  id: string;
  name: string;
}

interface Week {
  id: string;
  name: string;
}

interface ProgressData {
  id: string;
  label: string;
  value: number;
  max: number;
  color: string;
}

interface Delay {
  delay: number;
}

interface ApiResponse {
  filters_subject: string[];
  filters_subject_week: {
    [key: string]: string[];
  };
  mcqScores: {
    [key: string]: {
      [key: string]: string;
    };
  };
  codingScore: {
    [key: string]: {
      [key: string]: string;
    };
  };
  tests: {
    [key: string]: {
      [key: string]: string;
    };
  };
  All: {
    [key: string]: string | { [key: string]: string };
  };
  delay: {
    [key: string]: number;
  };
}

function Progress() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [delay, setDelay] = useState<Delay>({ delay: 0 });
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [selectedWeek, setSelectedWeek] = useState<string>("All");
  const [apiData, setApiData] = useState<ApiResponse | null>(null);
  const encryptedStudentId = sessionStorage.getItem("StudentId") || "";
  const decryptedStudentId = CryptoJS.AES.decrypt(encryptedStudentId!, secretKey).toString(CryptoJS.enc.Utf8);
  const studentId = decryptedStudentId;
  const actualStudentId= CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualEmail= CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualName= CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);


  useEffect(() => {
    const fetchData = async () => {
      const url=`${process.env.REACT_APP_BACKEND_URL}api/studentdashboard/weeklyprogress/${studentId}`
      try {
        const response = await getApiClient().get<ApiResponse>(
          url
        );
        const data = response.data;
        setApiData(data);
        setDelay({ delay: data.delay.All });

        const subjectsData = data.filters_subject.filter(subject => subject !== "All").map((subject) => ({
          id: subject,
          name: subject,
        }));
        setSubjects([{ id: "All", name: "All" }, ...subjectsData]);

        const weeksData = Object.keys(data.All).filter(week => week !== "All").map((week) => ({
          id: week,
          name: week,
        }));
        setWeeks([{ id: "All", name: "All" }, ...weeksData]);

        updateProgressData(data, "All", "All");
      } catch (error) {
        console.error("Error fetching progress data:", error);
      }
    };

    fetchData();
  }, []);

const updateProgressData = (data: ApiResponse, subject: string, week: string) => {
  let filteredData: { [key: string]: string } = {};

  if (subject === "All" && week === "All") {
    const allData = data.All as { [key: string]: string };
    filteredData = { ...allData };
  } else if (subject === "All" && week === "Practice MCQs") {
    filteredData = { "Practice MCQs": data.All["Practice MCQs"] as string };
  } else if (subject === "All" && week === "Practice Codings") {
    filteredData = { "Practice Codings": data.All["Practice Codings"] as string };
  } else if (subject === "All" && week === "Weekly Test") {
    filteredData = { "Weekly Test": data.All["Weekly Test"] as string };
  } else if (subject !== "All" && week === "All") {
    filteredData = {
      "Practice MCQs": data.mcqScores[subject]?.All || "0/0",
      "Practice Codings": data.codingScore[subject]?.All || "0/0",
      "Tests": data.tests[subject]?.All || "0/0",
    };
  } else if (subject !== "All" && week !== "All") {
    const weekData = {
      ...(data.mcqScores[subject]?.[week] && { "Practice MCQs": data.mcqScores[subject][week] }),
      ...(data.codingScore[subject]?.[week] && { "Practice Codings": data.codingScore[subject][week] }),
      ...(data.tests[subject]?.[week] && { "Tests": data.tests[subject][week] }),
    };
    if (Object.keys(weekData).length > 0) {
      filteredData = weekData;
    }
  }

  const progressData = Object.entries(filteredData).map(([label, value], index) => {
    if (typeof value === "string") {
      const [score, max] = value.split("/").map(Number);
      const colors = ["#fff", "#12B500", "#f42a2a"];
      return {
        id: (index + 1).toString(),
        label,
        value: score,
        max,
        color: colors[index % colors.length],
      };
    }
    return null;
  }).filter(Boolean) as ProgressData[];

  setProgressData(progressData);
};

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subject = e.target.value;
    setSelectedSubject(subject);
    setSelectedWeek("All"); 

    if (apiData) {
      if (subject === "All") {
        const weeksData = Object.keys(apiData.All).filter(week => week !== "All").map((week) => ({
          id: week,
          name: week,
        }));
        setWeeks([{ id: "All", name: "All" }, ...weeksData]);
      } else {
        const weeksData = apiData.filters_subject_week[subject].filter(week => week !== "All").map((week) => ({
          id: week,
          name: week,
        }));
        setWeeks([{ id: "All", name: "All" }, ...weeksData]);
      }

      updateProgressData(apiData, subject, "All");
    }
  };
  const handleWeekChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const week = e.target.value;
    setSelectedWeek(week);
    if (apiData) {
      updateProgressData(apiData, selectedSubject, week);
    }
  };

  return (
    <div className="container ms-3">
      <div className="row">
        <div className="col">
          <p>My Progress</p>
        </div>
        <div className="col">
          <select
            style={{ cursor: "pointer", fontSize: "10px" }}
            id="subjectDropdown"
            value={selectedSubject}
            onChange={handleSubjectChange}
            className="bg-dark text-white p-1"
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col">
          <select
            style={{ cursor: "pointer", fontSize: "10px" }}
            id="weekDropdown"
            value={selectedWeek}
            onChange={handleWeekChange}
            className="bg-dark text-white p-1"
          >
            {weeks.map((week) => (
              <option key={week.id} value={week.id}>
                {week.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="row">
        <div className="col-md-6 d-flex justify-content-center">
          <div style={{ position: "relative", width: "200px", height: "200px" }}>
            <svg className="" viewBox="0 0 200 200">
              {progressData.map((data, index) => {
                const strokeWidth = 12;
                const radius = 90 - index * 30;
                const circumference = 2 * Math.PI * radius;
                const dashArray = circumference;
                
                const dashOffset = data.max === 0 ? 
                  circumference : 
                  circumference * (1 - data.value / data.max);

                return (
                  <g key={data.id}>
                    <circle
                      cx="100"
                      cy="100"
                      r={radius}
                      stroke="gray"
                      strokeWidth={strokeWidth}
                      fill="none"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r={radius}
                      stroke={data.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={dashArray}
                      strokeDashoffset={dashOffset}
                      fill="none"
                      style={{
                        transform: "rotate(-90deg)",
                        transformOrigin: "100px 100px",
                      }}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="col-md-6 text-white ps-5 pt-2">
          <ul className="list-unstyled">
            {progressData.map((data) => (
              <li
                key={data.id}
                className="d-flex justify-content-between align-items-center mb-2 ps-2"
                style={{
                  borderLeft: `5px solid ${data.color}`,
                }}
              >
                <div style={{ fontSize: "12px" }}>
                  <p className="mb-0">
                    {data.value}/{data.max}
                  </p>
                  <p className="mb-0">{data.label}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="d-flex justify-content-between border-top mt-2 border-secondary" style={{ fontSize: "12px" }}>
        <span>Delay</span>
        <span>
          <b>{delay.delay}</b> Days
        </span>
      </div>
    </div>
  );
}

export default Progress;