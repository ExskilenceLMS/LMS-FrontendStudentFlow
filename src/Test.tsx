import React, { useState, useEffect } from "react";
import { getApiClient } from "./utils/apiAuth";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { HiOutlineClipboardDocumentList } from "react-icons/hi2";
import CryptoJS from "crypto-js";
import { secretKey } from './constants';

interface TestDetail {
  testtype: string;
  test_id: string;
  test_status: string;
  score: string;
  topic: string;
  subject: string;
  subject_id: string;
  startdate: string;
  starttime: string;
  enddate: string;
  endtime: string;
  title: string;
  status: string;
}

interface FilterState {
  testType: string;
  subject: string;
  testStatus: string;
  topic: string;
  startDate: string;
  endDate: string;
}

interface CurrentTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  seconds: number;
  dateTime: string;
  date: string;
  time: string;
  timeZone: string;
  dayOfWeek: string;
  dstActive: boolean;
}

const statusMapping: { [key: string]: string } = {
  Started: "Ongoing",
  Pending: "Ongoing",
  Upcomming: "Upcoming",
  Ongoing: "Ongoing",
  Completed: "Completed"
};

const Test: React.FC = () => {
  const navigate = useNavigate();
  const [testDetails, setTestDetails] = useState<TestDetail[]>([]);
  const [filteredDetails, setFilteredDetails] = useState<TestDetail[]>([]);
  const [filterState, setFilterState] = useState<FilterState>({
    testType: "",
    subject: "",
    testStatus: "",
    topic: "",
    startDate: "",
    endDate: "",
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<CurrentTime | null>(null);
  const encryptedStudentId = sessionStorage.getItem('StudentId');
  const decryptedStudentId = encryptedStudentId ? CryptoJS.AES.decrypt(encryptedStudentId, process.env.REACT_APP_SECRET_KEY || '').toString(CryptoJS.enc.Utf8) : '';
  const studentId = decryptedStudentId;
    const actualStudentId= CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
    const actualEmail= CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
    const actualName= CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);

  useEffect(() => {
    sessionStorage.removeItem('TestId');
  }, []);

  useEffect(() => {
    const fetchTestDetails = async () => {
      const url = `${process.env.REACT_APP_BACKEND_URL}api/student/testdetails/${studentId}/`
      try {
        const response = await getApiClient().get(url);
        setTestDetails(response.data.test_details);
        setFilteredDetails(response.data.test_details);
        setLoading(false);
      } catch (innerError: any) {
        console.error("Error fetching test details:", innerError);
        setLoading(false);
      }
    };
    fetchTestDetails();
  }, [studentId]);

  useEffect(() => {
    const fetchCurrentTime = async () => {
      try {
        const response = await axios.get(`https://timeapi.io/api/time/current/zone?timeZone=Asia/Kolkata`);
        setCurrentTime(response.data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchCurrentTime();
    const interval = setInterval(fetchCurrentTime, 10000); 

    return () => clearInterval(interval); 
  }, []);

  useEffect(() => {
    if (currentTime && testDetails.length > 0) {
      let hasChanges = false;
      const updatedDetails = testDetails.map(detail => {
        const mappedStatus = statusMapping[detail.status] || detail.status;
        if (mappedStatus === "Upcoming" && isTestTimeMatch(detail)) {
          hasChanges = true;
          return { ...detail, status: "Ongoing" };
        }
        return detail;
      });
      
      if (hasChanges) {
        setTestDetails(updatedDetails);
        setFilteredDetails(prevFiltered => {
          return prevFiltered.map(detail => {
            const mappedStatus = statusMapping[detail.status] || detail.status;
            if (mappedStatus === "Upcoming" && isTestTimeMatch(detail)) {
              return { ...detail, status: "Ongoing" };
            }
            return detail;
          });
        });
      }
    }
  }, [currentTime]); 

  const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = event.target;
    setFilterState((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyFilter = () => {
    const filtered = testDetails.filter((detail) => {
      const mappedStatus = statusMapping[detail.status] || detail.status;
      return (
        (filterState.testType === "" || detail.testtype === filterState.testType) &&
        (filterState.subject === "" || detail.subject === filterState.subject) &&
        (filterState.testStatus === "" || mappedStatus === filterState.testStatus) &&
        (filterState.topic === "" || detail.topic === filterState.topic) &&
        (filterState.startDate === "" || detail.startdate >= filterState.startDate) &&
        (filterState.endDate === "" || detail.enddate <= filterState.endDate)
      );
    });
    setFilteredDetails(filtered);
  };

  const handleTest = (data: TestDetail) => {
    const mappedStatus = statusMapping[data.status] || data.status;
    if (mappedStatus === "Ongoing") {
      const encryptedTestId = CryptoJS.AES.encrypt(data.test_id, process.env.REACT_APP_SECRET_KEY || '').toString();
      sessionStorage.setItem("TestId", encryptedTestId);
      const encryptedTestSubjectId = CryptoJS.AES.encrypt(data.subject_id, process.env.REACT_APP_SECRET_KEY || '').toString();
      sessionStorage.setItem("TestSubjectId", encryptedTestSubjectId);
      navigate("/test-introduction");
    } else if (mappedStatus === "Completed") {
      const encryptedTestId = CryptoJS.AES.encrypt(data.test_id, process.env.REACT_APP_SECRET_KEY || '').toString();
      sessionStorage.setItem("TestId", encryptedTestId);
      const encryptedTestSubject = CryptoJS.AES.encrypt(data.subject_id, process.env.REACT_APP_SECRET_KEY || '').toString();
      sessionStorage.setItem("TestSubjectId", encryptedTestSubject);
      navigate("/test-report");
    }
  };
  // const handleTest1 = () => {
  //  const encryptedTestId = CryptoJS.AES.encrypt("Test1", process.env.REACT_APP_SECRET_KEY || '').toString();
  //   sessionStorage.setItem("TestId", encryptedTestId);
  //   navigate("/test-introduction");
  // };

  const convertTo24HourFormat = (timeStr: string) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);


    if (modifier === 'PM' && hours !== 12) {
      hours += 12;
    } else if (modifier === 'AM' && hours === 12) {
      hours = 0;
    }

    return { hours, minutes };
  };

const isTestTimeMatch = (test: TestDetail) => {
  if (!currentTime) {
    return false;
  }

  const { hours: startHour, minutes: startMinute } = convertTo24HourFormat(test.starttime);

  const currentHour = currentTime.hour;
  const currentMinute = currentTime.minute;

  const currentDateParts = currentTime.date.split('/');
  const currentDateFormatted = `${currentDateParts[2]}-${currentDateParts[0].padStart(2, '0')}-${currentDateParts[1].padStart(2, '0')}`;

  const isSameDate = test.startdate === currentDateFormatted;

  if (!isSameDate) {
    return false;
  }

  const testStartTotalMinutes = startHour * 60 + startMinute;
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const isTimeMatch = currentTotalMinutes >= testStartTotalMinutes;

  if (isTimeMatch) {
  } else {
    const minutesLeft = testStartTotalMinutes - currentTotalMinutes;
  }

  return isTimeMatch;
};

  const SkeletonLoader = () => {
    return (
      <div className="table-responsive py-3">
        <table className="table">
          <thead className="table-header border border-secondary rounded-1 fs-5 fw-normal" style={{ backgroundColor: "#f8f9fa" }}>
            <tr>
              <th className="text-center">S.no</th>
              <th className="text-center">Test name</th>
              <th className="text-center">Subject</th>
              <th className="text-center">Start Date</th>
              <th className="text-center">End Date</th>
              <th className="text-center">Score</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((_, index) => (
              <tr key={index}>
                <td className="text-center"><div className="skeleton-box" style={{ width: "20px", height: "20px" }}></div></td>
                <td className="text-center"><div className="skeleton-box" style={{ width: "100px", height: "20px" }}></div></td>
                <td className="text-center"><div className="skeleton-box" style={{ width: "100px", height: "20px" }}></div></td>
                <td className="text-center"><div className="skeleton-box" style={{ width: "100px", height: "20px" }}></div></td>
                <td className="text-center"><div className="skeleton-box" style={{ width: "100px", height: "20px" }}></div></td>
                <td className="text-center"><div className="skeleton-box" style={{ width: "50px", height: "20px" }}></div></td>
                <td className="text-center"><div className="skeleton-box" style={{ width: "50px", height: "20px" }}></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: "#F2EEEE" }}>
      <div className="p-0 my-0 me-2" style={{ backgroundColor: "#F2EEEE" }}>
        <div className="container-fluid bg-white mt-2 border rounded-1" style={{ maxWidth: "100%", overflowX: "hidden", overflowY: "auto", backgroundColor: "#f2eeee", height: `calc(100vh - 75px)` }}>
          <div className="row">
            <div className="col-md-3 col-lg-2">
              <div className="row p-2">
                <div className="col border rounded-1 mt-2 pt-2">
                  <h5 className="text-center">Filter</h5>
                  <label className="form-label m-0 p-0 pt-2 ps-1">Test Type</label>
                  <select className="form-select" name="testType" value={filterState.testType} onChange={handleFilterChange}>
                    <option value="">All</option>
                    <option value="Weekly Test">Weekly Test</option>
                    <option value="Practice Test">Practice Test</option>
                    <option value="Final Test">Final Test</option>
                  </select>
                  <label className="form-label m-0 p-0 pt-2 ps-1">Subject</label>
                  <select className="form-select" name="subject" value={filterState.subject} onChange={handleFilterChange}>
                    <option value="">All</option>
                    <option value="SQL">SQL</option>
                    <option value="Python">Python</option>
                  </select>
                  <label className="form-label m-0 p-0 pt-2 ps-1">Test Status</label>
                  <select className="form-select" name="testStatus" value={filterState.testStatus} onChange={handleFilterChange}>
                    <option value="">All</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Completed">Completed</option>
                  </select>
                  <label className="form-label m-0 p-0 pt-2 ps-1">Topic</label>
                  <select className="form-select" name="topic" value={filterState.topic} onChange={handleFilterChange}>
                    <option value="">All</option>
                    <option value="TEST">TEST</option>
                  </select>
                  <label className="form-label m-0 p-0 pt-2 ps-1">Start Date</label>
                  <input type="date" className="form-control" name="startDate" value={filterState.startDate} onChange={handleFilterChange} />
                  <label className="form-label m-0 p-0 pt-2 ps-1">End Date</label>
                  <input type="date" className="form-control" name="endDate" value={filterState.endDate} onChange={handleFilterChange} />
                  <div className="d-flex justify-content-center my-4">
                    <button className="btn border-black btn-sm" style={{ backgroundColor: "#E4F0FF", width: "90px" }} onClick={handleApplyFilter}>
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-9 col-lg-10">
              <div className="row">
                <div className="col">
                  {loading ? (
                    <SkeletonLoader />
                  ) : (
                    <div className="table-responsive py-3">
                      <table className="table">
                        <thead className="table-header border border-secondary rounded-2 fs-5 fw-normal" style={{ backgroundColor: "#f8f9fa", boxShadow: "#00000033 0px 4px 8px" }}>
                          <tr>
                            <th className="text-center">S.no</th>
                            <th className="text-center">Test name</th>
                            <th className="text-center">Subject</th>
                            <th className="text-center">Start Date</th>
                            <th className="text-center">End Date</th>
                            <th className="text-center">Score</th>
                            <th className="text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDetails.length > 0 ? (
                            filteredDetails.map((data, index) => {
                              const mappedStatus = statusMapping[data.status] || data.status;
                              const isOngoing = mappedStatus === "Ongoing" || (mappedStatus === "Upcoming" && isTestTimeMatch(data));
                              
                              return (
                                <tr key={index} className="border rounded-2">
                                  <td className="text-center" style={{ alignContent: 'center' }}>{index + 1}</td>
                                  <td className="text-center" style={{ alignContent: 'center' }}>{data.title}</td>
                                  <td className="text-center" style={{ alignContent: 'center' }}>{data.subject}</td>
                                  <td className="text-center" style={{ alignContent: 'center' }}>
                                    {data.startdate} <br /> {data.starttime}
                                  </td>
                                  <td className="text-center">
                                    {data.enddate} <br /> {data.endtime}
                                  </td>
                                  <td className="text-center" style={{ alignContent: 'center' }}>{data.score}</td>
                                  <td className="text-center" style={{ alignContent: 'center' }}>
                                    {isOngoing ? (
                                      <button
                                        className="btn border-black btn-sm"
                                        onClick={() => { handleTest(data); sessionStorage.setItem('TestType', data.testtype); }}
                                        style={{ width: "80px", backgroundColor: "#E5EBFF" }}
                                      >
                                        Start
                                      </button>
                                    ) : mappedStatus === "Completed" ? (
                                      <HiOutlineClipboardDocumentList
                                        onClick={() => { handleTest(data); sessionStorage.setItem('TestType', data.testtype); }}
                                        style={{ width: "30px", height: "30px", cursor: "pointer" }}
                                      />
                                    ) : (
                                      <button
                                        className="btn border-black btn-sm"
                                        disabled
                                        style={{ width: "80px", backgroundColor: "#E5EBFF" }}
                                      >
                                        Start
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={7} className="text-center">
                                <p className="text-muted fs-6">No data found.</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                        {/* <button className="btn border-black btn-sm" onClick={() => handleTest1()}>Test1</button> */}
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Test;