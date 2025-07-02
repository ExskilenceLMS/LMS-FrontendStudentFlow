import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import { secretKey } from './constants';
import CryptoJS from 'crypto-js';
import { HiOutlineBellAlert } from "react-icons/hi2";
import { PiUserCircleLight } from "react-icons/pi";
import { RiUserSharedLine } from "react-icons/ri";
import { CiLogout } from "react-icons/ci";
import { Modal, Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { getApiClient } from './utils/apiAuth';
import { performLogout } from './utils/apiAuth';

const TestHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [timeInSeconds, setTimeInSeconds] = useState<number>(Number(sessionStorage.getItem("timer")) || 0);
  const [showModal, setShowModal] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(false);

  const pathSegments = useMemo(() => location.pathname.split('/').filter(Boolean), [location.pathname]);
  const encryptedStudentId = sessionStorage.getItem('StudentId');
  const decryptedStudentId = useMemo(() => CryptoJS.AES.decrypt(encryptedStudentId!, secretKey).toString(CryptoJS.enc.Utf8), [encryptedStudentId]);
  const studentId = decryptedStudentId;
  const encryptedTestId = sessionStorage.getItem("TestId") || "";
  const decryptedTestId = useMemo(() => CryptoJS.AES.decrypt(encryptedTestId!, secretKey).toString(CryptoJS.enc.Utf8), [encryptedTestId]);
  const testId = decryptedTestId;
  const actualStudentId= CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualEmail= CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualName= CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);
 
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key;

    const blockedKeys = ['v', 'c', 'a'];

    if (key === 'F12') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    if ((e.ctrlKey || e.metaKey) && blockedKeys.includes(key.toLowerCase())) {
      e.preventDefault();
    }

    if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(key.toLowerCase())) {
      e.preventDefault();
    }
  };

  const disableRightClick = (e: MouseEvent) => {
    e.preventDefault();
  };

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("contextmenu", disableRightClick);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("contextmenu", disableRightClick);
  };
}, []);

  const formattedTitle = useMemo(() => pathSegments
    .map((segment) =>
      segment.replace("-", " ")
        .toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase())
    )
    .join(' > '), [pathSegments]);

  useEffect(() => {
    isMounted.current = true;
    const currentPath = location.pathname;
    if (studentId && testId  && !testCompleted && (currentPath === '/test-section' || currentPath === '/mcq-temp' || currentPath === '/coding-temp')) {
      const fetchTimeLeft = async () => {
  const url = `${process.env.REACT_APP_BACKEND_URL}api/student/duration/${studentId}/${testId}/`;

  try {
            const response = await getApiClient().get(url);
    const { time_left } = response.data;
    setTimeInSeconds(time_left);
    sessionStorage.setItem("timer", time_left);
  } catch (innerError: any) {
    console.error("Error fetching test header data:", innerError);
  }
};


      if (isMounted.current) {
        fetchTimeLeft();
      }

      const intervalId = setInterval(fetchTimeLeft, 60000);

      return () => {
        clearInterval(intervalId);
        isMounted.current = false;
      };
    }
  }, [studentId, testId, location.pathname, testCompleted]);

useEffect(() => {
  if (timeInSeconds > 0 && !testCompleted) {
    const intervalId = setInterval(() => {
      setTimeInSeconds((prevTime) => {
        const newTime = prevTime - 1;
        sessionStorage.setItem("timer", newTime.toString());

        if (newTime <= 0) {
          clearInterval(intervalId);
          sessionStorage.setItem("timer", "0");
          const currentPath = location.pathname;

          if (
            currentPath === '/test-section' ||
            currentPath === '/mcq-temp' ||
            currentPath === '/coding-temp'
          ) {
            setShowModal(true);
          }

          setTestCompleted(true);

          const submitTest = async () => {
            const url=`${process.env.REACT_APP_BACKEND_URL}api/student/test/submit/${studentId}/${testId}/`
            try {
              await getApiClient().get(
                url
              );
              sessionStorage.removeItem("timer");
            } catch (error) {
              console.error("Error submitting test:", error);
            }
          };

          submitTest(); // Call the async function

          return 0;
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }
}, [timeInSeconds, navigate, studentId, testId, testCompleted, location.pathname]);


  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (seconds < 60) {
      return `${remainingSeconds} sec`;
    }

    let timeString = '';
    if (hours > 0) {
      timeString += `${hours} hr `;
    }
    if (minutes > 0 || hours > 0) {
      timeString += `${minutes} min `;
    }

    return timeString.trim();
  }, []);

  const handleViewProfile = useCallback(() => {
    navigate('/Profile');
    setShowUserMenu(false);
  }, [navigate]);

  const handleLogout = useCallback(async (isInactivityLogout: boolean = false) => {
    try {
      // Call logout function (session will be cleared immediately)
      performLogout(studentId, isInactivityLogout, false);
      // Navigate immediately without waiting for API call
      navigate('/');
      setShowUserMenu(false);
    } catch (error) {
      console.error("Logout error:", error);
      // Still navigate even if logout fails
      navigate('/');
      setShowUserMenu(false);
    }
  }, [navigate, studentId]);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowUserMenu(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setShowUserMenu(false);
    }, 300);
  }, []);

  const handleViewReport = useCallback(() => {
    setShowModal(false);
    navigate('/test-report');
  }, [navigate]);

  return (
    <div className='pe-2'>
      <div className="container-fluid bg-white border rounded-2 p-2 d-flex justify-content-between align-items-center me-5">
        <span className="text-center fs-6">
          {formattedTitle === "Test Section" || formattedTitle === "Mcq Temp" || formattedTitle === "Coding Temp" ?
            <> <span className='fw-bold'>{sessionStorage.getItem("TestType") || ""}</span> </>
            :
            <></>}
        </span>
        <span className="text-center fs-6">
          {formattedTitle === "Test Section" || formattedTitle === "Mcq Temp" || formattedTitle === "Coding Temp" ?
            <span className="text-danger pe-3 fw-bold">
              {/* Time Left: {formatTime(timeInSeconds) > 0 ? formatTime(timeInSeconds) : "00:00:00"} */}
              Time Left: {timeInSeconds > 0 ? formatTime(timeInSeconds) : "Loading..."}
            </span>
            :
            <>
              <HiOutlineBellAlert size={25} className="me-1 cursor-pointer" style={{ cursor: 'pointer'}} />
              <div
                className="position-relative d-inline-block"
                ref={userMenuRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <PiUserCircleLight
                  size={30}
                  className="me-1 cursor-pointer"
                  style={{ cursor: 'pointer'}}
                />
                {showUserMenu && (
                  <div
                    className="position-absolute end-0 mt-1 bg-white shadow rounded-2"
                    style={{
                      width: '180px',
                      zIndex: 1000,
                      border: '1px solid rgba(0,0,0,0.1)',
                      transition: 'all 0.2s ease-in-out',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
                    }}
                  >
                    <button
                      className="btn w-100 text-start ps-3 py-2 border-0"
                      onClick={handleViewProfile}
                      style={{
                        transition: 'background-color 0.2s',
                        backgroundColor: 'transparent'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <span className="fw-medium"><RiUserSharedLine size={20} className="me-1" /> View Profile</span>
                    </button>
                    <hr className="my-1 mx-2" style={{ backgroundColor: '#e0e0e0' }} />
                    <button
                      className="btn w-100 text-start ps-3 py-2 border-0"
                      onClick={() => handleLogout(false)}
                      style={{
                        transition: 'background-color 0.2s',
                        backgroundColor: 'transparent'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <span className="fw-medium"><CiLogout size={20} className="me-1" /> Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          }
        </span>
      </div>
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Time Over</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Your test time is up! The test has been finished.</p>
          {/* <p>Submitting your test...</p> */}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={handleViewReport}>
            View Report
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default TestHeader;
