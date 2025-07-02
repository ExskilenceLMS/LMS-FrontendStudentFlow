import React, { useState, useEffect } from "react";
import Sidebar from "./Components/Sidebar";
import { useNavigate } from "react-router-dom";
import Footer from "./Components/Footer";
import apiClient from "./utils/apiAuth";
import Skeleton from "react-loading-skeleton";
import { secretKey } from "./constants";
import CryptoJS from "crypto-js";

interface Sessions {
  id: string;
  name: string;
  date: string;
  time: string;
  meet_link: string;
  attendance: string;
  video_link: string;
  ended: boolean;
  status: string;
}

interface ApiSession {
  name: string;
  date: string;
  time: string;
  meet_link: string;
  attendance: number;
  video_link: string;
  ended: boolean;
  status: string;
}

const OnlineSession: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Sessions[]>([]);
  const [loading, setLoading] = useState(true);
  const encryptedStudentId = sessionStorage.getItem('StudentId') || "";
  const decryptedStudentId = CryptoJS.AES.decrypt(encryptedStudentId!, secretKey).toString(CryptoJS.enc.Utf8);
  const studentId = decryptedStudentId;
  const actualStudentId= CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualEmail= CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualName= CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);
 
  useEffect(() => {
    const fetchSessions = async () => {
      const url= `${process.env.REACT_APP_BACKEND_URL}api/student/sessions/${studentId}/`
      try {
        const response = await apiClient.get(
         url
        );
        const apiSessions = response.data as ApiSession[];

        const formattedSessions = apiSessions.map((session, index) => ({
          id: (index + 1).toString(),
          name: session.name,
          date: session.date,
          time: session.time,
          meet_link: session.meet_link,
          attendance: session.attendance.toString() + "%",
          video_link: session.video_link,
          ended: session.ended,
          status: session.status,
        }));

        setSessions(formattedSessions);
        setLoading(false);
      } catch (innerError: any) {
            setLoading(false);console.error("Error fetching Online sessions data:", innerError);
            }
    };

    fetchSessions();
  }, []);

  return (
    <>
      <div style={{ backgroundColor: "#F2EEEE"}}>
        <div className="p-0 my-0 me-2" style={{ backgroundColor: "#F2EEEE" }}>
          <div
            className="container-fluid bg-white mt-2 border rounded-1"
            style={{
              height: `calc(100vh - 70px)` ,
              overflowY: "auto",
              backgroundColor: "white",
            }}
          >
            {loading ? (
              <div className="table-container py-3">
                <Skeleton height={50} />
                <Skeleton height={5} />
                <Skeleton count={15} height={25} />
              </div>
            ) : (
              <div className="table-container py-3">
                {/* Table Headers Always Visible */}
                <div className="table-header d-flex p-0 pb-3 border-bottom border-black fs-5 fw-normal">
                  <div className="col">Sl No</div>
                  <div className="col">Session Name</div>
                  <div className="col">Date</div>
                  <div className="col">Time</div>
                  <div className="col">Link</div>
                  <div className="col">Time Attended</div>
                  <div className="col">Video</div>
                  <div className="col">Status</div>
                </div>

                <div className="table-body">
                  {sessions.length > 0 ? (
                    sessions.map((session) => (
                      <div key={session.id} className="table-row d-flex p-2">
                        <div className="col">{session.id}</div>
                        <div className="col">{session.name}</div>
                        <div className="col">{session.date}</div>
                        <div className="col">{session.time}</div>
                        <div className="col">
                          {session.ended ? (
                            "Expired"
                          ) : (
                            <a
                              href={session.meet_link}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Join
                            </a>
                          )}
                        </div>
                        <div className="col">
                          {session.attendance ? session.attendance : "--"}
                        </div>
                        <div className="col">
                          {session.video_link ? (
                            <a
                              href={session.video_link}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Watch
                            </a>
                          ) : (
                            "N/A"
                          )}
                        </div>
                        <div className="col">{session.status}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">No sessions found.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* <div style={{ cursor: "pointer" }}>
          <Footer />
        </div> */}
      </div>
    </>
  );
};

export default OnlineSession;
