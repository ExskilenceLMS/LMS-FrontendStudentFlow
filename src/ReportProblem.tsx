import React, { useMemo, useEffect, useState } from "react";
import { MaterialReactTable } from "material-react-table";
import { Box } from "@mui/material";
import { Spinner } from "react-bootstrap";
import DetailPanel from "./DetailPanel";
import Notification from "./Components/images/Notification.png";
import Back from "./Components/images/Back.png";
import User from "./Components/images/User.png";
import Footer from "./Components/Footer";
import Sidebar from "./Components/Sidebar";
import { useNavigate } from "react-router-dom";
import Header from "./Components/Header";
import apiClient from "./utils/apiAuth";
import Skeleton from "react-loading-skeleton";
import { secretKey } from "./constants";
import CryptoJS from "crypto-js";

interface Bug {
  sl_id: number;
  Student_id: string;
  Img_path: string;
  BugDescription: string;
  BugStatus: string;
  Issue_type: string;
  Reported: string;
  Resolved: string | null;
  Comments: Record<
    string,
    { role: string; comment: string; timestamp: string }
  >;
  studentname?: string;
  email?: string;
  mob_No?: number;
  college?: string;
  branch?: string;
  student_id?: string;
  image_path?: string;
  issue_description?: string;
  issue_status?: string;
  issue_type?: string;
  reported_time?: string;
  resolved_time?: string | null;
  comments?: Record<
    string,
    { role: string; comment: string; timestamp: string }
  >;
  del_row?: string;
}

interface TicketResponse {
  ticket_details: {
    sl_id: number;
    student_id: string;
    image_path: string;
    issue_description: string;
    issue_status: string;
    issue_type: string;
    reported_time: string;
    resolved_time: string | null;
    comments: Record<
      string,
      { role: string; comment: string; timestamp: string }
    >;
    del_row: string;
  }[];
}

const ReportProblem: React.FC = () => {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const actualStudentId= CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualEmail= CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualName= CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);
 

  useEffect(() => {
    const fetchTickets = async () => {
      const encryptedStudentId = sessionStorage.getItem('StudentId');
      const decryptedStudentId = CryptoJS.AES.decrypt(encryptedStudentId!, secretKey).toString(CryptoJS.enc.Utf8);
      const studentId = decryptedStudentId;
      const url=`${process.env.REACT_APP_BACKEND_URL}api/student/tickets/${studentId}/`
      try {
        setLoading(true);
        const response = await apiClient.get<TicketResponse>(
          url
        );
        
        const formattedBugs = response.data.ticket_details.map(ticket => ({
          sl_id: ticket.sl_id,
          Student_id: ticket.student_id,
          Img_path: ticket.image_path,
          BugDescription: ticket.issue_description,
          BugStatus: ticket.issue_status,
          Issue_type: ticket.issue_type,
          Reported: ticket.reported_time,
          Resolved: ticket.resolved_time,
          Comments: ticket.comments,
          student_id: ticket.student_id,
          image_path: ticket.image_path,
          issue_description: ticket.issue_description,
          issue_status: ticket.issue_status,
          issue_type: ticket.issue_type,
          reported_time: ticket.reported_time,
          resolved_time: ticket.resolved_time,
          comments: ticket.comments,
          del_row: ticket.del_row
        }));
        
        setBugs(formattedBugs);
      } catch (error) {
        console.error("Error fetching tickets:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  const columns = useMemo(
    () => [
      {
        accessorKey: "sl_id",
        header: "Ticket Number",
      },
      {
        accessorKey: "Issue_type", 
        header: "Support Type",
      },
      {
        accessorKey: "Reported", 
        header: "Reported Date",
        Cell: ({ cell }: { cell: { getValue: () => string } }) =>
          new Date(cell.getValue()).toLocaleDateString(),
      },
      {
        accessorKey: "Resolved", 
        header: "Responded Date",
        Cell: ({ cell }: { cell: { getValue: () => string | null } }) => {
          const value = cell.getValue();
          return value ? new Date(value).toLocaleDateString() : "Not resolved";
        },
      },
      {
        accessorKey: "BugStatus", 
        header: "Status",
        Cell: ({ cell }: { cell: { getValue: () => string } }) => (
          <Box
            component="span"
            sx={{
              color: cell.getValue() === "Pending" ? "red" : "green",
              fontWeight: "bold",
            }}
          >
            {cell.getValue()}
          </Box>
        ),
      },
    ],
    []
  );

  const table = {
    columns,
    data: bugs,
    enableExpanding: true,
    renderDetailPanel: ({ row }: { row: any }) => (
      <DetailPanel row={row} onCommentAdded={() => {}} />
    ),
  };

  return (
    <div style={{ backgroundColor: "#F2EEEE", height: `calc(100vh - 90px)` }}>
      <div
        className="p-0 my-0 me-2"
        style={{ backgroundColor: "#F2EEEE"}}
      >
        <div className="container-fluid p-0 px-3 mt-3 pt-3 pb-4 " style={{maxWidth: "100%", minHeight: "calc(100vh - 100px)", height:"calc(100vh - 80px)", overflowX: "hidden", overflowY: "auto", backgroundColor: "white"}}>
          {loading ? (
        <div className="table-body">
        {[1, 2, 3, 4, 5].map((_, index) => (
          <div
            key={index}
            className="d-flex align-items-center border border-secondary rounded-1 p-2 flex-wrap"
          >
            {Array(7)
              .fill(0)
              .map((_, i) => (
                <div className="col text-center" key={i}>
                  <div className="skeleton-box" style={{ width: "100px", height: "30px" }}></div>
                </div>
              ))}
          </div>
        ))}
      </div>
          ) : (
            <Box>
              <MaterialReactTable {...table} />
            </Box>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportProblem;