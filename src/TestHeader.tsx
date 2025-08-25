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
import { cleanupTestSessionData } from './utils/sessionCleanup';
import { IoArrowBackCircleOutline } from "react-icons/io5";
import { getBackNavigationPath, isBackNavigationAllowed } from './utils/navigationRules';

const TestHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
    const [timeInSeconds, setTimeInSeconds] = useState<number>(() => {
    // Try to get encrypted duration first
    const encryptedDuration = sessionStorage.getItem("testDuration");
    if (encryptedDuration) {
      try {
        const decryptedDuration = CryptoJS.AES.decrypt(encryptedDuration, secretKey).toString(CryptoJS.enc.Utf8);
        return parseInt(decryptedDuration) || 0;
      } catch (error) {
        console.error("Error decrypting duration:", error);
        return 0;
      }
    }
    // Return 0 if no encrypted duration found
    return 0;
  });
  const [showModal, setShowModal] = useState(false);
  const [isTimerLoading, setIsTimerLoading] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(false);

  const pathSegments = useMemo(() => location.pathname.split('/').filter(Boolean), [location.pathname]);
  const encryptedStudentId = sessionStorage.getItem('StudentId');
  const decryptedStudentId = useMemo(() => CryptoJS.AES.decrypt(encryptedStudentId!, secretKey).toString(CryptoJS.enc.Utf8), [encryptedStudentId]);
  const studentId = decryptedStudentId;
  const encryptedTestId = sessionStorage.getItem("TestId") || "";
  const decryptedTestId = useMemo(() => {
    if (!encryptedTestId) return "";
    try {
      return CryptoJS.AES.decrypt(encryptedTestId, secretKey).toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error("Error decrypting testId:", error);
      return "";
    }
  }, [encryptedTestId]);
  const testId = decryptedTestId;

  // Check if testId is available, if not navigate to tests page
  useEffect(() => {
    if (!testId && (location.pathname === '/test-section' || location.pathname === '/test-introduction' || location.pathname === '/mcq-temp' || location.pathname === '/coding-temp' || location.pathname.includes('dynamic-coding'))) {
      navigate('/test', { replace: true });
    }
  }, [testId, location.pathname, navigate]);
  const actualStudentId= CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualEmail= CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualName= CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);

  // Function to update timer asynchronously (for next button clicks)
  const updateTimerAsync = useCallback(async () => {
    try {
      const url = `${process.env.REACT_APP_BACKEND_URL}api/student/test/duration/${studentId}/${testId}/`;
      const response = await getApiClient().patch(url);
      const { time_left } = response.data;
      
      // Check API response status
      if (response.data.status === "Test Already Completed" || response.data.status === "Completed") {
        navigate('/test', { replace: true });
        return;
      }
      
      if (time_left !== undefined && time_left >= 0) {
        setTimeInSeconds(time_left);
        sessionStorage.setItem("timer", time_left.toString());
        const encryptedDuration = CryptoJS.AES.encrypt(time_left.toString(), secretKey).toString();
        sessionStorage.setItem("testDuration", encryptedDuration);

      }
    } catch (error: any) {
      if (error.response?.status === 500) {
        alert("Test Already Completed");
        navigate('/test', { replace: true });
        return;
      }
    }
  }, [studentId, testId]);

  // Function to update timer synchronously with loading (for page refresh)
  const updateTimerSync = useCallback(async () => {
    setIsTimerLoading(true);
    try {
      const url = `${process.env.REACT_APP_BACKEND_URL}api/student/test/duration/${studentId}/${testId}/`;
      const response = await getApiClient().patch(url);
      const { time_left } = response.data;
      
      if (response.data.status === "Test Already Completed" || response.data.status === "Completed" || response.status !== 200) {
        navigate('/test', { replace: true });
        return;
      }
      
      if (time_left !== undefined && time_left >= 0) {
        setTimeInSeconds(time_left);
        sessionStorage.setItem("timer", time_left.toString());
        const encryptedDuration = CryptoJS.AES.encrypt(time_left.toString(), secretKey).toString();
        sessionStorage.setItem("testDuration", encryptedDuration);

      }
    } catch (error: any) {
      if (error.response?.status === 500) {
        alert("Test Already Completed");
        navigate('/test', { replace: true });
        return;
      }
    } finally {
      setIsTimerLoading(false);
    }
  }, [studentId, testId]);

  // Expose functions globally for other components to use
  useEffect(() => {
    (window as any).updateTimerAsync = updateTimerAsync;
    (window as any).updateTimerSync = updateTimerSync;
    
    return () => {
      delete (window as any).updateTimerAsync;
      delete (window as any).updateTimerSync;
    };
  }, [updateTimerAsync, updateTimerSync]);
 
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

//   useEffect(() => {
//     isMounted.current = true;
//     const currentPath = location.pathname;
//     if (studentId && testId  && !testCompleted && (currentPath === '/test-section' || currentPath === '/mcq-temp' || currentPath === '/coding-temp')) {
//       const fetchTimeLeft = async () => {
//   const url = `${process.env.REACT_APP_BACKEND_URL}api/student/duration/${studentId}/${testId}/`;

//   try {
//             const response = await getApiClient().get(url);
//     const { time_left } = response.data;
//     setTimeInSeconds(time_left);
//     sessionStorage.setItem("timer", time_left);
//   } catch (innerError: any) {
//     console.error("Error fetching test header data:", innerError);
//   }
// };


//       if (isMounted.current) {
//         fetchTimeLeft();
//       }

//       const intervalId = setInterval(fetchTimeLeft, 60000);

//       return () => {
//         clearInterval(intervalId);
//         isMounted.current = false;
//       };
//     }
//   }, [studentId, testId, location.pathname, testCompleted]);

useEffect(() => {
  if (timeInSeconds > 0 && !testCompleted) {
    const intervalId = setInterval(() => {
      setTimeInSeconds((prevTime) => {
        const newTime = prevTime - 1;
        
        // Update both timer and encrypted duration in session storage
        sessionStorage.setItem("timer", newTime.toString());
        
        // Update encrypted duration
        const encryptedDuration = CryptoJS.AES.encrypt(newTime.toString(), secretKey).toString();
        sessionStorage.setItem("testDuration", encryptedDuration);

        if (newTime <= 0) {
          clearInterval(intervalId);
          sessionStorage.setItem("timer", "0");
          const encryptedZero = CryptoJS.AES.encrypt("0", secretKey).toString();
          sessionStorage.setItem("testDuration", encryptedZero);
          
          const currentPath = location.pathname;

          if (
            currentPath === '/test-section' ||
            currentPath === '/mcq-temp' ||
            currentPath === '/coding-temp' ||
            currentPath.includes('dynamic-coding')
          ) {
            setShowModal(true);
          }

          setTestCompleted(true);

          const submitTest = async () => {
            const url=`${process.env.REACT_APP_BACKEND_URL}api/student/test/submit/${studentId}/${testId}/`
            try {
              await getApiClient().post(
                url
              );
              
              // Clean up all test-related session storage data
              cleanupTestSessionData(testId);
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


  const formatTime = useCallback((seconds: number): { hours: string; minutes: string; seconds: string } => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return {
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: remainingSeconds.toString().padStart(2, '0')
    };
  }, []);

  const handleViewProfile = useCallback(() => {
    navigate('/Profile', { replace: true });
    setShowUserMenu(false);
  }, [navigate]);

  const handleLogout = useCallback(async (isInactivityLogout: boolean = false) => {
    try {
      // Call logout function (session will be cleared immediately)
      performLogout(studentId, isInactivityLogout, false);
      // Navigate immediately without waiting for API call
      localStorage.clear()
      sessionStorage.clear()
      navigate('/', { replace: true });
      setShowUserMenu(false);
    } catch (error) {
      console.error("Logout error:", error);
      // Still navigate even if logout fails
      navigate('/', { replace: true });
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
    navigate('/test-report', { replace: true });
  }, [navigate]);

  const handleBackBtn = useCallback(() => {
    const currentPath = location.pathname;
    
    // Check if back navigation is allowed for current path
    if (!isBackNavigationAllowed(currentPath)) {
      return;
    }
    
    // Get the target path for back navigation
    const targetPath = getBackNavigationPath(currentPath);
    
    // Special handling for test pages that need to preserve test data
    if (currentPath.toLowerCase().includes('/mcq-temp') || 
        currentPath.toLowerCase().includes('/coding-temp') || 
        currentPath.toLowerCase().includes('/dynamic-coding-editor')) {
      
      // Try to get test data from session storage
      const encryptedTestData = sessionStorage.getItem('testSectionData');
      let sectionData = null;
      
      if (encryptedTestData) {
        try {
          sectionData = JSON.parse(CryptoJS.AES.decrypt(encryptedTestData, secretKey).toString(CryptoJS.enc.Utf8));
        } catch (error) {
          console.error("Error decrypting test data for navigation:", error);
        }
      }
      
      // Navigate with preserved test data
      navigate(targetPath, { 
        state: { 
          sectionData: sectionData 
        },
        replace: true
      });
    } else {
      // Regular navigation for other test pages
      navigate(targetPath, { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <div className='pe-2'>
      <div className="container-fluid bg-white border rounded-2 p-2 d-flex justify-content-between align-items-center">
        <span className="text-center fs-6">
        <IoArrowBackCircleOutline size={30} className="me-1 pb-1 cursor-pointer" onClick={handleBackBtn} style={{ cursor: 'pointer'}} />
          
          {formattedTitle === "Test Section" || formattedTitle === "Mcq Temp" || formattedTitle === "Coding Temp" || location.pathname.includes("dynamic-coding") ?
            <> <span className='fw-bold'>{sessionStorage.getItem("TestType") || ""}</span> {sessionStorage.getItem("TestName")?<> &gt; <span className='fw-bold'>{sessionStorage.getItem("TestName")}</span> </> : ""} </>
            :
            <></>}
        </span>
        <span className="text-center fs-6">
          {formattedTitle === "Test Section" || formattedTitle === "Mcq Temp" || formattedTitle === "Coding Temp" || location.pathname.includes("dynamic-coding") ?
            <div className="card p-0 m-0" style={{ minWidth: '260px' }}>
              <div className="card-body p-1 me-0">
                <div className="row text-center align-items-center m-0">
                  <div className="col-3">
                    <h4 className="text-danger mb-0">
                      {timeInSeconds > 0 ? formatTime(timeInSeconds).hours : "--"}
                    </h4>
                    <p className="small mb-0">Hours</p>
                  </div>
                  <div className="col-1 d-flex align-items-center justify-content-center">
                    <h4 className="text-danger mb-0">:</h4>
                  </div>
                  <div className="col-3">
                    <h4 className="text-danger mb-0">
                      {timeInSeconds > 0 ? formatTime(timeInSeconds).minutes : "--"}
                    </h4>
                    <p className="small mb-0">Mins</p>
                  </div>
                  <div className="col-1 d-flex align-items-center justify-content-center">
                    <h4 className="text-danger mb-0">:</h4>
                  </div>
                  <div className="col-3">
                    <h4 className="text-danger mb-0">
                      {timeInSeconds > 0 ? formatTime(timeInSeconds).seconds : "--"}
                    </h4>
                    <p className="small mb-0">Sec</p>
                  </div>
                </div>
              </div>
            </div>
            :
            <>
              {/* <HiOutlineBellAlert size={25} className="me-1 cursor-pointer" style={{ cursor: 'pointer'}} /> */}
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
