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
  CircularProgress
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
 
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const url = `${process.env.REACT_APP_BACKEND_URL}api/student/live-sessions/${studentId}/1/10`;
        const response = await apiClient.get(url);
        
        if (response.data && response.data.sessions) {
          setSessions(response.data.sessions);
        } else {
          setSessions([]);
        }
      } catch (error: any) {
        console.error("Error fetching sessions data:", error);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      fetchSessions();
    }
  }, [studentId]);

  return (
    <>
      <div className="container-fluid p-0 me-2 my-2 bg-white" style={{ height: "calc(100vh - 90px)", overflowY: "scroll"  }}>
          <div
            className="container-fluid bg-white border rounded-1"
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
                              {index + 1}
                            </TableCell>
                            <TableCell sx={{ fontSize: '14px', fontWeight: 'medium' }}>
                              {session.session_name}
                            </TableCell>
                            <TableCell sx={{ fontSize: '14px' }}>
                              {session.date}
                            </TableCell>
                            <TableCell sx={{ fontSize: '14px' }}>
                              {session.time}
                            </TableCell>
                            <TableCell>
                              {session.status === "ended" ? (
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
                              {session.status === "ended" ? "Completed" : session.status}
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
                </TableContainer>
              </Box>
            )}
          </div>
        
      </div>
    </>
  );
};

export default OnlineSession;
