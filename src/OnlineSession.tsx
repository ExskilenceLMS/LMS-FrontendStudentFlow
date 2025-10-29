import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "./Components/Sidebar";
import { useNavigate, useLocation } from "react-router-dom";
import Footer from "./Components/Footer";
import apiClient from "./utils/apiAuth";
import Skeleton from "react-loading-skeleton";
import { secretKey } from "./constants";
import CryptoJS from "crypto-js";
import { getBackNavigationPath, isBackNavigationAllowed } from "./utils/navigationRules";
import { FaArrowLeft } from "react-icons/fa";
import { MaterialReactTable } from "material-react-table";
import { MRT_ColumnDef } from "material-react-table";
import {
  Button,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { OpenInNew, PlayArrow } from '@mui/icons-material';

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
  const [sessionStatus, setSessionStatus] = useState<string>("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [totalSessions, setTotalSessions] = useState<number>(0);
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

  // Handler to start session and redirect to Google Meet
  const handleJoinSession = async (session: Session) => {
    if (!isSessionExpired(session)) {
      try {
        const startSessionUrl = `${process.env.REACT_APP_BACKEND_URL}api/student/start-session/`;
        const startSessionPayload = {
          student_id: studentId,
          session_id: session.session_id.toString()
        };
        
        await apiClient.post(startSessionUrl, startSessionPayload);
        
        // Redirect to Google Meet
        window.open(session.link, '_blank');
      } catch (error: any) {
        console.error("Error starting session:", error);
      }
    }
  };

  // Define columns for MaterialReactTable
  const columns = useMemo<MRT_ColumnDef<Session>[]>(
    () => [
      {
        id: "sl_no",
        header: "Sl No",
        size: 80,
        Cell: ({ row }) => (
          (pagination.pageIndex * pagination.pageSize) + row.index + 1
        ),
      },
      {
        accessorKey: "session_name",
        header: "Session Name",
        size: 200,
      },
      {
        accessorKey: "date",
        header: "Date",
        Cell: ({ row }) => getDisplayDate(row.original),
      },
      {
        accessorKey: "time",
        header: "Time",
        Cell: ({ row }) => getDisplayTime(row.original),
      },
      {
        id: "link",
        header: "Link",
        Cell: ({ row }) => {
          const expired = isSessionExpired(row.original);
          const isEnded = row.original.status === "ended";
          
          if (expired || isEnded) {
            return (
              <Typography variant="body2" color="text.secondary">
                Expired
              </Typography>
            );
          }
          
          return (
            <Button
              variant="text"
              color="primary"
              size="small"
              startIcon={<OpenInNew />}
              onClick={() => handleJoinSession(row.original)}
              sx={{ 
                textTransform: 'none',
                fontSize: '14px',
                fontWeight: 'medium'
              }}
            >
              Join
            </Button>
          );
        },
      },
      {
        accessorKey: "attended",
        header: "Time Attended",
        Cell: ({ row }) => {
          const attended = row.original.attended;
          return attended > 0 ? `${attended}%` : "--";
        },
      },
      {
        id: "video",
        header: "Video",
        Cell: ({ row }) => {
          const video = row.original.video;
          return video ? (
            <Button
              variant="text"
              color="primary"
              size="small"
              startIcon={<PlayArrow />}
              onClick={() => window.open(video, '_blank')}
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
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        Cell: ({ row }) => {
          const expired = isSessionExpired(row.original);
          const status = row.original.status;
          
          if (expired || status === "ended") {
            return "Completed";
          }
          
          return status;
        },
      },
    ],
    [pagination.pageIndex, pagination.pageSize]
  );

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const url = `${process.env.REACT_APP_BACKEND_URL}api/student/live-sessions/`;
        
        const requestBody = {
          student_id: studentId,
          page: pagination.pageIndex + 1,
          page_size: pagination.pageSize,
          session_status: sessionStatus
        };

        const response = await apiClient.post(url, requestBody);
        
        if (response.data && response.data.sessions) {
          setSessions(response.data.sessions);
          setTotalSessions(response.data.total ?? response.data.sessions.length ?? 0);
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
  }, [studentId, sessionStatus, pagination.pageIndex, pagination.pageSize]);

  return (
    <>
      <div className="container-fluid p-0 pe-1 m-0 my-2" style={{ height: "calc(100vh - 70px)", overflowY: "scroll"  }}>
          <div className="container-fluid bg-white border rounded-1 p-0">
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" height="calc(100vh - 80px)">
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ p: 2, height: 'calc(100vh - 80px)' }}>
                <MaterialReactTable
                  columns={columns}
                  data={sessions}
                  rowCount={totalSessions}
                  enableSorting
                  enableColumnFilters
                  enablePagination
                  enableBottomToolbar
                  enableStickyHeader
                  positionPagination="bottom"
                  muiTablePaperProps={{ sx: { height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 'none' } }}
                  muiTableContainerProps={{ sx: { height: 'calc(100% - 125px)' } }}
                  muiPaginationProps={{
                    rowsPerPageOptions: [5, 10, 25, 50],
                  }}
                  manualPagination
                  onPaginationChange={setPagination}
                  renderTopToolbarCustomActions={() => (
                    <Box sx={{ p: 1 }}>
                      <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={sessionStatus}
                          label="Filter by Status"
                          onChange={(e) => {
                            setPagination({ pageIndex: 0, pageSize: pagination.pageSize });
                            setSessionStatus(e.target.value);
                          }}
                        >
                          <MenuItem value="">All</MenuItem>
                          <MenuItem value="upcoming">Upcoming</MenuItem>
                          <MenuItem value="ongoing">Ongoing</MenuItem>
                          <MenuItem value="completed">Completed</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  )}
                  initialState={{ 
                    pagination: { pageSize: pagination.pageSize, pageIndex: pagination.pageIndex } 
                  }}
                />
              </Box>
            )}
          </div>
      </div>
    </>
  );
};

export default OnlineSession;
