import React, { useState, useEffect } from "react";
import { Card } from "react-bootstrap";
import { useAPISWR } from "../utils/swrConfig";
import CryptoJS from "crypto-js";
import { secretKey } from "../constants";
import Skeleton from "react-loading-skeleton";
import { useApiLoading } from "../Dashboard";

interface Discussion {
  title: string;
  week: string;
  date: string;
  time: string;
}

interface Events {
  title: string;
  date: string;
  time: string;
}

interface SessionsResponse {
  sessions: any[];
}

interface EventsResponse {
  events: any[];
}

const Upcoming: React.FC = () => {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [events, setEvents] = useState<Events[]>([]);
  const [loadingDiscussions, setLoadingDiscussions] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const { studentId, isCoursesApiLoaded } = useApiLoading();
  const encryptedCourseId = sessionStorage.getItem('CourseId');
  const decryptedCourseId = CryptoJS.AES.decrypt(encryptedCourseId!, secretKey).toString(CryptoJS.enc.Utf8);
  const courseId = decryptedCourseId;
  const encryptedBatchId = sessionStorage.getItem('BatchId');
  const decryptedBatchId = CryptoJS.AES.decrypt(encryptedBatchId!, secretKey).toString(CryptoJS.enc.Utf8);
  const batchId = decryptedBatchId;

  // Use SWR for upcomming sessions API with 1-hour cache - only call after courses API is loaded
  const { data: sessionsData, error: sessionsError } = useAPISWR<SessionsResponse>(
    isCoursesApiLoaded ? `${process.env.REACT_APP_BACKEND_URL}api/studentdashboard/upcomming/sessions/${studentId}` : null
  );

  // Use SWR for upcomming events API with 3-hour cache - only call after courses API is loaded
  const { data: eventsData, error: eventsError } = useAPISWR<EventsResponse>(
    isCoursesApiLoaded ? `${process.env.REACT_APP_BACKEND_URL}api/studentdashboard/upcomming/events/${courseId}/${batchId}` : null
  );

  useEffect(() => {
    if (sessionsData) {
      if (sessionsData.sessions && Array.isArray(sessionsData.sessions)) {
        setDiscussions(sessionsData.sessions.map((item: any) => ({
          title: item.title,
          week: item.title,
          date: item.date,
          time: item.time,
        })));
      } else {
        console.error("Expected sessions array but got:", typeof sessionsData, sessionsData);
        setDiscussions([]);
      }
      setLoadingDiscussions(false);
    }
  }, [sessionsData]);

  useEffect(() => {
    if (eventsData) {
      if (eventsData.events && Array.isArray(eventsData.events)) {
        setEvents(eventsData.events.map((event: any) => ({
          title: event.title,
          date: event.date,
          time: event.time,
        })));
      } else {
        console.error("Expected events array but got:", typeof eventsData, eventsData);
        setEvents([]);
      }
      setLoadingEvents(false);
    }
  }, [eventsData]);

  return (
    <div className="" style={{marginTop: "1px"}}>
      <div
        className="row bg-white rounded-2 mx-2 mb-2"
        style={{ minWidth: "35px", paddingBottom: "12px" }}
      >
        <p className="fw-light ps-4 pt-2" style={{ fontSize: "12px" }}>
          Upcoming live sessions
        </p>
        <div
            className="ps-4 bg-white pe-auto flex-end"
            style={{
              minWidth: "30px",
              height: "75px",
              overflowY: "auto",
              scrollbarWidth: "thin",
              fontSize: "13px",
            }}
          >
            {loadingDiscussions ? (
              <>
                <Skeleton height={10} width={100} />
                <Skeleton height={10} width={100} />
              </>
            ) : discussions.length > 0 ? (
              discussions.map((discussion, index) => (
                <div
                  key={index}
                  className="d-flex justify-content-between align-items-center"
                >
                  <span>{discussion.title}</span>
                  <span>{`${discussion.date} - ${discussion.time}`}</span>
                </div>
              ))
            ) : (
              <p className="text-center pt-3">No upcoming live sessions</p>
            )}
          </div>
      </div>

      <div
        className="row bg-white rounded-2 mx-2"
        style={{ minWidth: "35px", paddingBottom: "10px" }}
      >
        <p className="fw-light ps-4 pt-2" style={{ fontSize: "12px" }}>
          Upcoming events
        </p>
        <div
          className="ps-4 pe-auto flex-end m-0 divDetails"
          style={{
            minWidth: "30px",
            height: "75px",
            overflowY: "auto",
            scrollbarWidth: "thin",
            fontSize: "13px",
          }}
        >
          {loadingEvents ? (
            <>
              <Skeleton height={10} width={100} />
              <Skeleton height={10} width={100} />
            </>
          ) : (
            events.map((event, index) => (
              <div
                key={index}
                className="d-flex justify-content-between align-items-center  divDetails"
              >
                <span>{event.title}</span>
                <span>{`${event.date} - ${event.time}`}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Upcoming;
