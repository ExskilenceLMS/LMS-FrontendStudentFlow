import { useState, useEffect, useRef, useCallback } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { Detector } from "react-detect-offline";
import apiClient from "./utils/apiAuth";
import { getApiClient } from "./utils/apiAuth";

import { Modal } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-loading-skeleton/dist/skeleton.css";
import "./App.css";
import { secretKey } from "./constants";
import CryptoJS from "crypto-js";
import AppRoutes from "./AppRoutes";
import { performLogout } from "./utils/apiAuth";
import Layout from "./Components/Layout";
import InternetInfo from "./Components/InternetInfo";

// Extend Window interface to include our custom property
declare global {
  interface Window {
    backendCountdownInterval?: NodeJS.Timeout;
  }
}

function App() {
  return (
    <Detector
      polling={{
        url: "/internet_info",
        enabled: true,
        timeout: 2000,
        interval: 10000,
      }}
      render={({ online }) =>
        online ? (
          <Router>
            <AppContent />
          </Router>
        ) : (
          <Router>
            <Routes>
              <Route
                path="/InternetInfo"
                element={
                  <Layout>
                    <InternetInfo />
                  </Layout>
                }
              />
              <Route
                path="*"
                element={
                  <Layout>
                    <InternetInfo />
                  </Layout>
                }
              />
            </Routes>
          </Router>
        )
      }
    />
  );
}

function AppContent() {
  const location = useLocation();
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const sessionValidationFlagRef = useRef(false);
  const validationInProgressRef = useRef(false);



  // Timer references
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Backend API timer references - separate from frontend modal
  const backendApiTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recheckModalTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Video time tracking state and interval
  const [videoTimeTrackingNumber, setVideoTimeTrackingNumber] = useState<{
    videoId: string | null;
    totalPlayed: number;
    timestamp: number;
  } | null>(null);
  const videoTimeCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Debouncing for video activity to prevent multiple rapid timer resets
  const videoActivityDebounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Flag to prevent re-initializing video time check interval
  const videoIntervalInitializedRef = useRef(false);
  
  // Backup ref for video tracking data in case state doesn't work
  const videoTrackingDataRef = useRef<{
    videoId: string | null;
    totalPlayed: number;
    timestamp: number;
  } | null>(null);

  const encryptedStudentId = sessionStorage.getItem("StudentId") || "";
  const decryptedStudentId = CryptoJS.AES.decrypt(
    encryptedStudentId!,
    secretKey
  ).toString(CryptoJS.enc.Utf8);
  const studentId = decryptedStudentId;

  // Check if user is on login page
  const isOnLoginPage = () => {
    const currentPath = location.pathname;
    const showMaintenance = process.env.REACT_APP_SHOW_MAINTENANCE === 'true';
    const loginPath = process.env.REACT_APP_LOGIN_PATH;
    
    if (showMaintenance) {
      return currentPath === `/${loginPath}/login` || currentPath === `/`;
    } else {
      return currentPath === `/`;
    }
  };

  const handleLogout = useCallback(
    async (isInactivityLogout: boolean = false) => {
      try {
        // Use the standardized performLogout function
        await performLogout(studentId, isInactivityLogout, false);
        window.location.href = "/";
      } catch (error) {
        // Still redirect even if API call fails
        window.location.href = "/";
      }
    },
    [studentId]
  );

  const startCountdown = useCallback(() => {
    // Don't start countdown if user is on login page
    if (isOnLoginPage()) {
      return;
    }

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prevCountdown) => {
        if (prevCountdown <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
          }
          handleLogout(true);
          return 0;
        }
        return prevCountdown - 1;
      });
    }, 1000);
  }, [handleLogout, location.pathname]);

  // Backend API session validation - separate from frontend modal
  const validateSessionWithBackend = useCallback(async () => {
    if (validationInProgressRef.current) return;

    validationInProgressRef.current = true;

    try {
      const response = await getApiClient().get(
        `${process.env.REACT_APP_BACKEND_URL}api/validate-session/`
      );
    } catch (error) {
      // If backend validation fails, logout the user
      handleLogout(true);
    } finally {
      sessionValidationFlagRef.current = false;
      validationInProgressRef.current = false;
    }
  }, [handleLogout]);

  // Schedule backend API call based on frontend modal state
  const scheduleBackendApiCall = useCallback(() => {
    if (backendApiTimerRef.current) {
      clearTimeout(backendApiTimerRef.current);
    }

    if (recheckModalTimerRef.current) {
      clearTimeout(recheckModalTimerRef.current);
    }

    // If modal is open, wait 1 minute and recheck
    if (showLogoutWarning) {
      recheckModalTimerRef.current = setTimeout(() => {
        // Recheck if modal is still open
        if (!showLogoutWarning) {
          // Modal is closed, trigger backend API
          validateSessionWithBackend();
        } else {
          // Modal is still open, wait another minute and recheck
          scheduleBackendApiCall();
        }
      }, 60000); // 1 minute
    } else {
      // Modal is not open, trigger backend API after session timeout
      const sessionTimeoutMs =
        parseInt(process.env.REACT_APP_SESSION_TIMEOUT_MINUTES || "2") *
        60 *
        1000;

      // Clear any existing countdown interval first
      if (window.backendCountdownInterval) {
        clearInterval(window.backendCountdownInterval);
      }

      // Add countdown logging for backend API timer
      let backendCountdown = Math.floor(sessionTimeoutMs / 1000);
      window.backendCountdownInterval = setInterval(() => {
        if (backendCountdown <= 0) {
          clearInterval(window.backendCountdownInterval);
          return;
        }
        backendCountdown--;
      }, 1000);

      backendApiTimerRef.current = setTimeout(() => {
        if (window.backendCountdownInterval) {
          clearInterval(window.backendCountdownInterval);
        }
        validateSessionWithBackend();
      }, sessionTimeoutMs);
    }
  }, [showLogoutWarning, validateSessionWithBackend]);

  // Reset backend API timer when any API is triggered from REACT_APP_BACKEND_URL
  const resetBackendApiTimer = useCallback(() => {
    if (backendApiTimerRef.current) {
      clearTimeout(backendApiTimerRef.current);
    }
    if (recheckModalTimerRef.current) {
      clearTimeout(recheckModalTimerRef.current);
    }

    scheduleBackendApiCall();
  }, [scheduleBackendApiCall]);

  // Initialize backend API timer separately from frontend modal
  const initializeBackendApiTimer = useCallback(() => {
    if (isOnLoginPage()) {
      return;
    }

    try {
      const accessToken = localStorage.getItem("LMS_access_token");
      const hasSessionData = accessToken && studentId;

      if (!hasSessionData) {
        return;
      }

      // Schedule backend API call independently
      scheduleBackendApiCall();
    } catch (error) {
      // Error handling without console logging
    }
  }, [scheduleBackendApiCall, location.pathname]);

  // Global right-click disable
  const disableRightClick = useCallback((e: MouseEvent) => {
    e.preventDefault();
    return false;
  }, []);

  const resetTimer = useCallback(async () => {
    // Don't start timer if user is on login page
    if (isOnLoginPage()) {
      return;
    }

    // Check if user has valid session data from localStorage
    try {
      const accessToken = localStorage.getItem("LMS_access_token");
      const hasSessionData = accessToken && studentId;

      if (!hasSessionData) {
        return;
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }

      setShowLogoutWarning(false);
      const sessionTimeoutMs =
        parseInt(process.env.REACT_APP_SESSION_TIMEOUT_MINUTES || "2") *
        60 *
        1000;



      timerRef.current = setTimeout(() => {
        // Final check before showing warning
        if (isOnLoginPage()) {
          return;
        }
        
        // Exit fullscreen mode if user is watching video in fullscreen
        // This ensures the timeout modal is always visible and accessible
        if (typeof window !== 'undefined' && (window as any).exitVideoFullscreen && typeof (window as any).exitVideoFullscreen === 'function') {
          try {
            (window as any).exitVideoFullscreen();
          } catch (error) {
            // Silently handle any errors - fullscreen exit is not critical for session timeout
          }
        }
        
        setShowLogoutWarning(true);
        setCountdown(60);
        startCountdown();
      }, sessionTimeoutMs);
    } catch (error) {}
  }, [startCountdown, location.pathname]);

    // Video time checking function - checks if video time has increased and triggers activity
  const checkVideoTimeActivity = useCallback(() => {
    try {
      const currentVideoData = localStorage.getItem('currentVideoTracking');
      
      if (!currentVideoData) {
        return;
      }

      const parsedData = JSON.parse(currentVideoData);
      const { videoId, totalPlayed, timestamp } = parsedData;

      // Get current video tracking data from ref (more reliable than state in this context)
      const storedTrackingData = videoTrackingDataRef.current;
      
      // Check if this is a video change (different videoId) even if totalPlayed is 0
      const isVideoChange = storedTrackingData && storedTrackingData.videoId !== videoId;
      
      // Skip if video time is 0 AND it's the same video (player not ready yet)
      if (totalPlayed === 0 && !isVideoChange) {
        return;
      }
      
      if (storedTrackingData && storedTrackingData.videoId === videoId) {
        // Only reset timer if same video and totalPlayed increased
        if (totalPlayed > storedTrackingData.totalPlayed) {
          // Debounce video activity to prevent multiple rapid timer resets
          if (videoActivityDebounceRef.current) {
            clearTimeout(videoActivityDebounceRef.current);
          }
          
          videoActivityDebounceRef.current = setTimeout(() => {
            // Trigger activity by calling handleActivity (which will call resetTimer)
            if (typeof window !== 'undefined' && window.dispatchEvent) {
              // Create a custom event to trigger handleActivity
              const activityEvent = new Event('videotimeactivity');
              window.dispatchEvent(activityEvent);
            }
          }, 1000); // Wait 1 second before triggering activity
        }
      } else {
        // Different video detected - this is user activity (switching videos)
        if (storedTrackingData) {
          // Reset timer when user switches to a different video
          if (videoActivityDebounceRef.current) {
            clearTimeout(videoActivityDebounceRef.current);
          }
          
          videoActivityDebounceRef.current = setTimeout(() => {
            // Trigger activity by calling handleActivity (which will call resetTimer)
            if (typeof window !== 'undefined' && window.dispatchEvent) {
              // Create a custom event to trigger handleActivity
              const activityEvent = new Event('videotimeactivity');
              window.dispatchEvent(activityEvent);
            }
          }, 1000); // Wait 1 second before triggering activity
        }
      }

      // Always update stored video tracking data to keep it in sync
      const newTrackingData = {
        videoId,
        totalPlayed,
        timestamp
      };
      
      setVideoTimeTrackingNumber(newTrackingData);
      
      // Also update the ref as backup
      videoTrackingDataRef.current = newTrackingData;
    } catch (error) {
      console.error('Error checking video time activity:', error);
    }
  }, []); // Removed videoTimeTrackingNumber dependency to prevent function recreation

  useEffect(() => {
    if (showLogoutWarning) {
      sessionValidationFlagRef.current = true;
      // When modal opens, reschedule backend API call
      scheduleBackendApiCall();
    } else {
    }
  }, [showLogoutWarning, scheduleBackendApiCall]);

  useEffect(() => {
    // Add global right-click disable for all pages including login
    window.addEventListener("contextmenu", disableRightClick);

    // Don't set up timer events if user is on login page
    if (isOnLoginPage()) {
      // Clear any existing timers if we're on login page
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      setShowLogoutWarning(false);
      return;
    }

    const validateSession = async () => {
      if (validationInProgressRef.current) return; // Prevent multiple calls

      validationInProgressRef.current = true;

      try {
        getApiClient().get(
          `${process.env.REACT_APP_BACKEND_URL}api/validate-session/`
        );
      } catch (error) {
      } finally {
        sessionValidationFlagRef.current = false;
        validationInProgressRef.current = false;
      }
    };

    // Check if user has valid session data from localStorage
    const checkSessionAndSetupTimer = async () => {
      try {
        const accessToken = localStorage.getItem("LMS_access_token");
        const hasSessionData = accessToken && studentId;

        if (!hasSessionData) {
          return;
        }

        const events = ["mousemove", "keypress", "scroll", "click", "videotimeactivity"];
        const handleActivity = (event?: Event) => {
          if (isOnLoginPage()) return;



          if (sessionValidationFlagRef.current) {
            validateSession(); // This will now trigger correctly
          }

          resetTimer();
        };

        events.forEach((event) => {
          window.addEventListener(event, handleActivity);
        });

        // Initialize both timers separately
        resetTimer(); // Frontend modal timer
        initializeBackendApiTimer(); // Backend API timer

        // Video time check interval is now initialized in a separate useEffect

        return () => {
          events.forEach((event) => {
            window.removeEventListener(event, handleActivity);
          });
          if (timerRef.current) {
            clearTimeout(timerRef.current);
          }
          if (warningTimerRef.current) {
            clearTimeout(warningTimerRef.current);
          }
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
          }
          // Clean up backend API timers
          if (backendApiTimerRef.current) {
            clearTimeout(backendApiTimerRef.current);
          }
          if (recheckModalTimerRef.current) {
            clearTimeout(recheckModalTimerRef.current);
          }
          // Clean up countdown interval
          if (window.backendCountdownInterval) {
            clearInterval(window.backendCountdownInterval);
          }
          // Clean up video time check interval
          if (videoTimeCheckIntervalRef.current) {
            clearInterval(videoTimeCheckIntervalRef.current);
          }
          // Clean up video activity debounce
          if (videoActivityDebounceRef.current) {
            clearTimeout(videoActivityDebounceRef.current);
          }
        };
      } catch (error) {}
    };

    checkSessionAndSetupTimer();

    // Cleanup function for the entire useEffect
    return () => {
      // Remove global right-click disable
      window.removeEventListener("contextmenu", disableRightClick);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      // Clean up backend API timers
      if (backendApiTimerRef.current) {
        clearTimeout(backendApiTimerRef.current);
      }
      if (recheckModalTimerRef.current) {
        clearTimeout(recheckModalTimerRef.current);
      }
      // Clean up countdown interval
      if (window.backendCountdownInterval) {
        clearInterval(window.backendCountdownInterval);
      }
      // Clean up video time check interval
      if (videoTimeCheckIntervalRef.current) {
        clearInterval(videoTimeCheckIntervalRef.current);
      }
      // Clean up video activity debounce
      if (videoActivityDebounceRef.current) {
        clearTimeout(videoActivityDebounceRef.current);
      }
    };
  }, [resetTimer, location.pathname, disableRightClick]);

  // Expose resetBackendApiTimer globally so it can be called from other components
  useEffect(() => {
    (window as any).resetBackendApiTimer = resetBackendApiTimer;

    return () => {
      delete (window as any).resetBackendApiTimer;
    };
  }, [resetBackendApiTimer]);

  // Initialize video time check interval independently
  useEffect(() => {
    // Don't set up video time check if user is on login page
    if (isOnLoginPage()) {
      return;
    }

    // Check if user has valid session data
    const accessToken = localStorage.getItem("LMS_access_token");
    const hasSessionData = accessToken && studentId;

    if (!hasSessionData) {
      return;
    }

    // Initialize video tracking state with existing localStorage data
    const existingVideoData = localStorage.getItem('currentVideoTracking');
    if (existingVideoData && !videoTimeTrackingNumber) {
      try {
        const parsedData = JSON.parse(existingVideoData);
        setVideoTimeTrackingNumber(parsedData);
      } catch (error) {
        console.error('Error parsing existing video data:', error);
      }
    }

    // Initialize video time check interval (only once)
    if (!videoIntervalInitializedRef.current) {
      const checkIntervalMinutes = parseInt(process.env.REACT_APP_VIDEO_ACTIVITY_CHECK_INTERVAL_MINUTES || "3");
      const checkIntervalMs = checkIntervalMinutes * 60 * 1000;
      
      videoTimeCheckIntervalRef.current = setInterval(() => {
        checkVideoTimeActivity();
      }, checkIntervalMs);
      
      videoIntervalInitializedRef.current = true;
    }

    // Cleanup function
    return () => {
      if (videoTimeCheckIntervalRef.current) {
        clearInterval(videoTimeCheckIntervalRef.current);
        videoTimeCheckIntervalRef.current = null;
      }
      videoIntervalInitializedRef.current = false;
    };
  }, [studentId, location.pathname]); // Removed checkVideoTimeActivity dependency



  // Function to get current video tracking data (for other parts of the component)
  const getCurrentVideoTrackingData = useCallback(() => {
    return videoTrackingDataRef.current;
  }, []);

  return (
    <>
      <AppRoutes />

      <Modal
        show={showLogoutWarning}
        onHide={resetTimer}
        backdrop="static"
        style={{ backdropFilter: "blur(10px)" }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Still there?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          You’ve been inactive. You’ll be logged out in {countdown} seconds.
          <br />
          Note : Please move your cursor or click any button.
        </Modal.Body>
      </Modal>
    </>
  );
}

export default App;
