import React, { useState, useEffect } from "react";
import { getApiClient } from "./utils/apiAuth";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { HiOutlineClipboardDocumentList } from "react-icons/hi2";
import CryptoJS from "crypto-js";
import { secretKey } from './constants';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Card, 
  CardContent, 
  Button, 
  Chip, 
  Skeleton, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  IconButton,
  Tooltip
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

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
  teststatus: string;
}

interface FilterState {
  testType: string;
  subject: string;
  testStatus: string;
  topic: string;
  startDate: string;
  endDate: string;
}

interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

interface CurrentTime {
  datetime: string;
  timezone: string;
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
    testStatus: "Ongoing",
    topic: "",
    startDate: "",
    endDate: "",
  });
  const [sortState, setSortState] = useState<SortState>({
    column: 'startdate',
    direction: 'desc'
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<CurrentTime | null>(null);
  const encryptedStudentId = sessionStorage.getItem('StudentId');
  const decryptedStudentId = encryptedStudentId ? CryptoJS.AES.decrypt(encryptedStudentId, process.env.REACT_APP_SECRET_KEY || '').toString(CryptoJS.enc.Utf8) : '';
  const studentId = decryptedStudentId;

  useEffect(() => {
    sessionStorage.removeItem('TestId');
  }, []);

  useEffect(() => {
    const fetchTestDetails = async () => {
      const url = `${process.env.REACT_APP_BACKEND_URL}api/student/testdetails/${studentId}/`
      try {
        const response = await getApiClient().get(url);
        setTestDetails(response.data.test_details);
        // Apply initial filter to show only ongoing tests
        const ongoingTests = response.data.test_details.filter((detail: TestDetail) => {
          const mappedStatus = statusMapping[detail.status] || detail.status;
          return mappedStatus === "Ongoing";
        });
        
        // Apply initial sorting by start date descending
        const sortedTests = sortData(ongoingTests);
        setFilteredDetails(sortedTests);
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
        const response = await getApiClient().get(`${process.env.REACT_APP_BACKEND_URL}api/current-time-ist`);
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
        // Only change to Ongoing if the test time has actually started
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
    
    // Apply sorting if a column is selected
    const sorted = sortData(filtered);
    setFilteredDetails(sorted);
  };

  const sortData = (data: TestDetail[]) => {
    if (!sortState.column) return data;
    
    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortState.column) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'subject':
          aValue = a.subject.toLowerCase();
          bValue = b.subject.toLowerCase();
          break;
        case 'startdate':
          aValue = new Date(a.startdate);
          bValue = new Date(b.startdate);
          break;
        case 'enddate':
          aValue = new Date(a.enddate);
          bValue = new Date(b.enddate);
          break;
        case 'score':
          aValue = parseFloat(a.score) || 0;
          bValue = parseFloat(b.score) || 0;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) {
        return sortState.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortState.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const handleSort = (column: string) => {
    setSortState(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Apply sorting when sortState changes
  useEffect(() => {
    if (filteredDetails.length > 0) {
      const sorted = sortData(filteredDetails);
      setFilteredDetails(sorted);
    }
  }, [sortState]);

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
  if (!currentTime) return false;

  const { hours: startHour, minutes: startMinute } = convertTo24HourFormat(test.starttime);
  const { hours: endHour, minutes: endMinute } = convertTo24HourFormat(test.endtime);

  // Parse datetime string: "2025-07-25T18:10:32.671284+05:30"
  const datetimeParts = currentTime.datetime.split('T');
  const datePart = datetimeParts[0]; // "2025-07-25"
  const timePart = datetimeParts[1].split('.')[0]; // "18:10:32"
  const timeComponents = timePart.split(':');
  
  const currentHour = parseInt(timeComponents[0]);
  const currentMinute = parseInt(timeComponents[1]);

  const currentDateFormatted = datePart; // Already in YYYY-MM-DD format

  // Check if current date is between start and end dates
  const isDateInRange = currentDateFormatted >= test.startdate && currentDateFormatted <= test.enddate;

  if (!isDateInRange) {
    return false;
  }

  // If we're on the start date, check if current time is after start time
  if (currentDateFormatted === test.startdate) {
    const testStartTotalMinutes = startHour * 60 + startMinute;
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const isTimeMatch = currentTotalMinutes >= testStartTotalMinutes;
    return isTimeMatch;
  }

  // If we're on the end date, check if current time is before end time
  if (currentDateFormatted === test.enddate) {
    const testEndTotalMinutes = endHour * 60 + endMinute;
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const isTimeMatch = currentTotalMinutes <= testEndTotalMinutes;
    return isTimeMatch;
  }

  return true;
};

  const SkeletonLoader = () => {
    return (
      <Box sx={{ py: 3 }}>
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                <TableCell align="center">S.no</TableCell>
                <TableCell align="center">Test name</TableCell>
                <TableCell align="center">Subject</TableCell>
                <TableCell align="center">Start Date</TableCell>
                <TableCell align="center">End Date</TableCell>
                <TableCell align="center">Score</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[1, 2, 3, 4, 5].map((_, index) => (
                <TableRow key={index}>
                  <TableCell align="center"><Skeleton width={20} height={20} /></TableCell>
                  <TableCell align="center"><Skeleton width={100} height={20} /></TableCell>
                  <TableCell align="center"><Skeleton width={100} height={20} /></TableCell>
                  <TableCell align="center"><Skeleton width={100} height={20} /></TableCell>
                  <TableCell align="center"><Skeleton width={100} height={20} /></TableCell>
                  <TableCell align="center"><Skeleton width={50} height={20} /></TableCell>
                  <TableCell align="center"><Skeleton width={50} height={20} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  return (
    <div style={{ backgroundColor: "#F2EEEE" }}>
      <div className="p-0 my-0 me-2" style={{ backgroundColor: "#F2EEEE" }}>
        <div className="container-fluid bg-white mt-2 border rounded-1" style={{ maxWidth: "100%", overflowX: "hidden", backgroundColor: "#f2eeee" }}>
          <div className="row">
            <div className="col-md-3 col-lg-2">
              <div className="row p-2">
                <div className="col border rounded-1 mt-2 pt-2" style={{ height: "calc(100vh - 100px)", overflowY: "auto" }}>
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
              <Box sx={{ height: "calc(100vh - 100px)", overflowY: "auto", py: 3 }}>
                {loading ? (
                  <SkeletonLoader />
                ) : (
                  <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2 }}>
                    <Table>
                                              <TableHead>
                          <TableRow sx={{ 
                            backgroundColor: '#f8f9fa', 
                            boxShadow: '0px 4px 8px rgba(0,0,0,0.2)',
                            '& th': { 
                              fontWeight: 'normal',
                              fontSize: '1.25rem'
                            }
                          }}>
                            <TableCell align="center">S.no</TableCell>
                            <TableCell 
                              align="center" 
                              sx={{ 
                                cursor: 'pointer',
                                '&:hover': { backgroundColor: '#e3f2fd' }
                              }}
                              onClick={() => handleSort('title')}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                Test name
                                {sortState.column === 'title' && (
                                  sortState.direction === 'asc' ? 
                                    <ArrowUpwardIcon sx={{ ml: 0.5, fontSize: '1rem' }} /> : 
                                    <ArrowDownwardIcon sx={{ ml: 0.5, fontSize: '1rem' }} />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell 
                              align="center" 
                              sx={{ 
                                cursor: 'pointer',
                                '&:hover': { backgroundColor: '#e3f2fd' }
                              }}
                              onClick={() => handleSort('subject')}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                Subject
                                {sortState.column === 'subject' && (
                                  sortState.direction === 'asc' ? 
                                    <ArrowUpwardIcon sx={{ ml: 0.5, fontSize: '1rem' }} /> : 
                                    <ArrowDownwardIcon sx={{ ml: 0.5, fontSize: '1rem' }} />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell 
                              align="center" 
                              sx={{ 
                                cursor: 'pointer',
                                '&:hover': { backgroundColor: '#e3f2fd' }
                              }}
                              onClick={() => handleSort('startdate')}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                Start Date
                                {sortState.column === 'startdate' && (
                                  sortState.direction === 'asc' ? 
                                    <ArrowUpwardIcon sx={{ ml: 0.5, fontSize: '1rem' }} /> : 
                                    <ArrowDownwardIcon sx={{ ml: 0.5, fontSize: '1rem' }} />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell 
                              align="center" 
                              sx={{ 
                                cursor: 'pointer',
                                '&:hover': { backgroundColor: '#e3f2fd' }
                              }}
                              onClick={() => handleSort('enddate')}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                End Date
                                {sortState.column === 'enddate' && (
                                  sortState.direction === 'asc' ? 
                                    <ArrowUpwardIcon sx={{ ml: 0.5, fontSize: '1rem' }} /> : 
                                    <ArrowDownwardIcon sx={{ ml: 0.5, fontSize: '1rem' }} />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell 
                              align="center" 
                              sx={{ 
                                cursor: 'pointer',
                                '&:hover': { backgroundColor: '#e3f2fd' }
                              }}
                              onClick={() => handleSort('score')}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                Score
                                {sortState.column === 'score' && (
                                  sortState.direction === 'asc' ? 
                                    <ArrowUpwardIcon sx={{ ml: 0.5, fontSize: '1rem' }} /> : 
                                    <ArrowDownwardIcon sx={{ ml: 0.5, fontSize: '1rem' }} />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell align="center">Action</TableCell>
                          </TableRow>
                        </TableHead>
                      <TableBody>
                        {filteredDetails.length > 0 ? (
                          filteredDetails.map((data, index) => {
                            const mappedStatus = statusMapping[data.status] || data.status;
                            // Check if test time has actually started, regardless of status
                            const isTimeStarted = isTestTimeMatch(data);
                            const isOngoing = (mappedStatus === "Ongoing" && isTimeStarted) || (mappedStatus === "Upcoming" && isTimeStarted);
                            
                            return (
                              <TableRow key={index} sx={{ 
                                border: '1px solid #dee2e6',
                                borderRadius: 2,
                                '&:hover': { backgroundColor: '#f8f9fa' }
                              }}>
                                <TableCell align="center">{index + 1}</TableCell>
                                <TableCell align="center" style={{ alignContent: 'center' }}>{data.title}</TableCell>
                                <TableCell align="center" style={{ alignContent: 'center' }}>{data.subject}</TableCell>
                                <TableCell align="center" style={{ alignContent: 'center' }}>
                                  {data.startdate} <br /> {data.starttime}
                                </TableCell>
                                <TableCell align="center">
                                  {data.enddate} <br /> {data.endtime}
                                </TableCell>
                                <TableCell align="center" style={{ alignContent: 'center' }}>{data.score}</TableCell>
                                <TableCell align="center">
                                  {isOngoing ? (
                                    <button
                                      className="btn border-black btn-sm"
                                      onClick={() => { handleTest(data); sessionStorage.setItem('TestType', data.testtype); sessionStorage.setItem('TestSubject', data.subject); }}
                                      style={{ width: "80px", backgroundColor: "#28a745", color: "white" }}
                                    >
                                      {data.teststatus? data.teststatus ==="Pending" ? "Start" :data.teststatus==="Started" ? "Resume" : "Start" : "Start"}
                                    </button>
                                  ) : mappedStatus === "Completed" ? (
                                    <HiOutlineClipboardDocumentList
                                      onClick={() => { handleTest(data); sessionStorage.setItem('TestType', data.testtype); sessionStorage.setItem('TestSubject', data.subject); }}
                                      style={{ width: "30px", height: "30px", cursor: "pointer" }}
                                    />
                                  ) : (
                                    <div
                                      className="btn border-black btn-sm"
                                      style={{ 
                                        width: "80px", 
                                        backgroundColor: "#E5EBFF", 
                                        opacity: "0.6",
                                        cursor: "not-allowed"
                                      }}
                                    >
                                      Start
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} align="center">
                              <Box sx={{ py: 4 }}>
                                <Typography variant="body1" color="textSecondary">
                                  No {filterState.testStatus.toLowerCase()} tests found
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Test;