import React, { useState, useEffect } from "react";
import Sidebar from "./Components/Sidebar";
import { useNavigate, useLocation } from "react-router-dom";
import Footer from "./Components/Footer";
import apiClient from "./utils/apiAuth";
import Skeleton from "react-loading-skeleton";
import { secretKey } from "./constants";
import CryptoJS from "crypto-js";
import { getBackNavigationPath, isBackNavigationAllowed } from "./utils/navigationRules";
import { FaArrowLeft } from "react-icons/fa";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Typography,
  Box,
  Chip,
  CircularProgress,
  TablePagination
} from '@mui/material';
import { OpenInNew, PlayArrow, ArrowUpward, ArrowDownward } from '@mui/icons-material';

interface Session {
  session_id: number;
  session_name: string;
  date: string;
  time: string;
  link: string;
  attended: number;
  video: string;
  status: string;
  session_duration: number;
  attended_duration: number;
  actual_start_date: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
}

interface SessionsResponse {
  sessions: Session[];
  total: number;
  page: number;
  page_size: number;
}

const OnlineSession: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalSessions, setTotalSessions] = useState(0);
  const encryptedStudentId = sessionStorage.getItem('StudentId') || "";
  const decryptedStudentId = CryptoJS.AES.decrypt(encryptedStudentId!, secretKey).toString(CryptoJS.enc.Utf8);
  const studentId = decryptedStudentId;
  const actualStudentId= CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualEmail= CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualName= CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);

  // Navigation handler
  const handleBackNavigation = () => {
    const targetPath = getBackNavigationPath(location.pathname);
    navigate(targetPath, { replace: true });
  };

  const canGoBack = isBackNavigationAllowed(location.pathname);

  // Sorting handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort sessions based on current sort field and direction
  const sortedSessions = [...sessions].sort((a, b) => {
    if (!sortField) return 0;
    
    let aValue: any = a[sortField as keyof Session];
    let bValue: any = b[sortField as keyof Session];
    
    // Handle different data types
    if (sortField === 'attended' || sortField === 'session_duration' || sortField === 'attended_duration') {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    } else if (sortField === 'date') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    } else {
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
 
  // Helper functions for date/time display and session status
  const getDisplayDate = (session: Session): string => {
    // If actual_start_date is null, show the scheduled date
    return session.actual_start_date || session.date;
  };

  const getDisplayTime = (session: Session): string => {
    // If actual_start_time is null, show the scheduled time
    return session.actual_start_time || session.time;
  };

  const isSessionExpired = (session: Session): boolean => {
    // If actual_end_time is not null OR status is "Completed", the session has ended
    return session.actual_end_time !== null || session.status === "Completed";
  };

  // Pagination handlers
  const handleChangePage = (event: unknown, newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPageSize(parseInt(event.target.value, 10));
    setCurrentPage(0);
  };

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const url = `${process.env.REACT_APP_BACKEND_URL}api/student/live-sessions/`;
        
        const requestBody = {
          student_id: studentId,
          page: currentPage + 1, // API expects 1-based page numbers
          page_size: pageSize,
          session_status: ""
        };

        const response = await apiClient.post(url, requestBody);
        
        if (response.data && response.data.sessions) {
          setSessions(response.data.sessions);
          setTotalSessions(response.data.total || 0);
        } else {
          setSessions([]);
          setTotalSessions(0);
        }
      } catch (error: any) {
        console.error("Error fetching sessions data:", error);
        setSessions([]);
        setTotalSessions(0);
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      fetchSessions();
    }
  }, [studentId, currentPage, pageSize]);

  return (
    <>
      <div className="container-fluid p-0 me-2 my-2 bg-white" style={{ height: "calc(100vh - 90px)", overflowY: "scroll"  }}>
          <div
            className="container-fluid bg-white border rounded-1 p-0"
          >
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ p: 2 }}>
                <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                  <Table sx={{ minWidth: 650 }} aria-label="sessions table">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '14px' }}>Sl No</TableCell>
                        <TableCell 
                          sx={{ 
                            fontWeight: 'bold', 
                            fontSize: '14px', 
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: '#e0e0e0' }
                          }}
                          onClick={() => handleSort('session_name')}
                        >
                          <Box display="flex" alignItems="center" gap={1}>
                            Session Name
                            {sortField === 'session_name' && (
                              sortDirection === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell 
                          sx={{ 
                            fontWeight: 'bold', 
                            fontSize: '14px', 
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: '#e0e0e0' }
                          }}
                          onClick={() => handleSort('date')}
                        >
                          <Box display="flex" alignItems="center" gap={1}>
                            Date
                            {sortField === 'date' && (
                              sortDirection === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell 
                          sx={{ 
                            fontWeight: 'bold', 
                            fontSize: '14px', 
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: '#e0e0e0' }
                          }}
                          onClick={() => handleSort('time')}
                        >
                          <Box display="flex" alignItems="center" gap={1}>
                            Time
                            {sortField === 'time' && (
                              sortDirection === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '14px' }}>Link</TableCell>
                        <TableCell 
                          sx={{ 
                            fontWeight: 'bold', 
                            fontSize: '14px', 
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: '#e0e0e0' }
                          }}
                          onClick={() => handleSort('attended')}
                        >
                          <Box display="flex" alignItems="center" gap={1}>
                            Time Attended
                            {sortField === 'attended' && (
                              sortDirection === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '14px' }}>Video</TableCell>
                        <TableCell 
                          sx={{ 
                            fontWeight: 'bold', 
                            fontSize: '14px', 
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: '#e0e0e0' }
                          }}
                          onClick={() => handleSort('status')}
                        >
                          <Box display="flex" alignItems="center" gap={1}>
                            Status
                            {sortField === 'status' && (
                              sortDirection === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedSessions.length > 0 ? (
                        sortedSessions.map((session, index) => (
                          <TableRow 
                            key={session.session_id} 
                            sx={{ 
                              '&:last-child td, &:last-child th': { border: 0 },
                              '&:hover': { backgroundColor: '#f9f9f9' }
                            }}
                          >
                            <TableCell component="th" scope="row" sx={{ fontSize: '14px' }}>
                              {currentPage * pageSize + index + 1}
                            </TableCell>
                            <TableCell sx={{ fontSize: '14px', fontWeight: 'medium' }}>
                              {session.session_name}
                            </TableCell>
                            <TableCell sx={{ fontSize: '14px' }}>
                              {getDisplayDate(session)}
                            </TableCell>
                            <TableCell sx={{ fontSize: '14px' }}>
                              {getDisplayTime(session)}
                            </TableCell>
                            <TableCell>
                              {isSessionExpired(session) ? (
                                <Typography variant="body2" color="text.secondary">
                                  Expired
                                </Typography>
                              ) : (
                                <Button
                                  variant="text"
                                  color="primary"
                                  size="small"
                                  startIcon={<OpenInNew />}
                                  onClick={() => window.open(session.link, '_blank')}
                                  sx={{ 
                                    textTransform: 'none',
                                    fontSize: '14px',
                                    fontWeight: 'medium'
                                  }}
                            >
                              Join
                                </Button>
                              )}
                            </TableCell>
                            <TableCell sx={{ fontSize: '14px' }}>
                              {session.attended > 0 ? `${session.attended}%` : "--"}
                            </TableCell>
                            <TableCell>
                              {session.video ? (
                                <Button
                                  variant="text"
                                  color="primary"
                                  size="small"
                                  startIcon={<PlayArrow />}
                                  onClick={() => window.open(session.video, '_blank')}
                                  sx={{ 
                                    textTransform: 'none',
                                    fontSize: '14px',
                                    fontWeight: 'medium'
                                  }}
                            >
                              Watch
                                </Button>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  N/A
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell sx={{ fontSize: '14px' }}>
                              {isSessionExpired(session) ? "Completed" : session.status}
                            </TableCell>
                          </TableRow>
                    ))
                  ) : (
                        <TableRow>
                          <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                            <Typography variant="body1" color="text.secondary">
                              No sessions found.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component="div"
                    count={totalSessions}
                    rowsPerPage={pageSize}
                    page={currentPage}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    sx={{
                      borderTop: '1px solid #e0e0e0',
                      '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                        fontSize: '14px',
                      }
                    }}
                  />
                </TableContainer>
              </Box>
            )}
          </div>
        
      </div>
    </>
  );
};

export default OnlineSession;
