import { useState, useEffect, useRef, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Detector } from "react-detect-offline";
import apiClient from "./utils/apiAuth";
import { Modal } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import 'react-loading-skeleton/dist/skeleton.css';
import "./App.css";
import { secretKey } from './constants';
import CryptoJS from 'crypto-js';
import AppRoutes from "./AppRoutes";
import { performLogout } from './utils/apiAuth';
import Layout from "./Components/Layout";
import InternetInfo from "./Components/InternetInfo";

function App() {
  return (
    <Detector
      polling={{
        url: '/internet_info',
        enabled: true,
        timeout: 2000,
        interval: 10000
      }}
      render={({ online }) =>
        online ? (
          <Router>
            <AppContent />
          </Router>
        ) : (
          <Router>
            <Routes>
              <Route path="/InternetInfo" element={<Layout><InternetInfo /></Layout>} />
              <Route path="*" element={<Layout><InternetInfo /></Layout>} />
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
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const encryptedStudentId = sessionStorage.getItem('StudentId') || "";
  const decryptedStudentId = CryptoJS.AES.decrypt(encryptedStudentId!, secretKey).toString(CryptoJS.enc.Utf8);
  const studentId = decryptedStudentId;
  // const actualStudentId= CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
  // const actualEmail= CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
  // const actualName= CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);

  // Check if user is on login page
  const isOnLoginPage = () => {
    const currentPath = location.pathname;
    const isLogin = currentPath === '/' 
    return isLogin;
  };

  const handleLogout = useCallback(async (isInactivityLogout: boolean = false) => {
    try {
      // Use the standardized performLogout function
      await performLogout(studentId, isInactivityLogout, false);
      window.location.href = '/'; 
    }
    catch (error){
      console.error("Logout error:", error);
      // Still redirect even if API call fails
      window.location.href = '/';
    }
  }, [studentId]);

  // Global right-click disable
  const disableRightClick = useCallback((e: MouseEvent) => {
    e.preventDefault();
    return false;
  }, []);

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

  const resetTimer = useCallback(async () => {
    // Don't start timer if user is on login page
    if (isOnLoginPage()) {
      return;
    }

    // Check if user has valid session data from localStorage
    try {
      const accessToken = localStorage.getItem('LMS_access_token');
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
      timerRef.current = setTimeout(() => {
        // Final check before showing warning
        if (isOnLoginPage()) {
          return;
        }
        setShowLogoutWarning(true);
        setCountdown(60);
        startCountdown();
      }, (parseInt(process.env.REACT_APP_SESSION_TIMEOUT_MINUTES || "2") * 60 * 1000)); // Use environment variable for session timeout
    } catch (error) {
      console.error("Error checking session data from localStorage:", error);
    }
  }, [startCountdown, location.pathname]);

  useEffect(() => {
    // Add global right-click disable for all pages including login
    window.addEventListener('contextmenu', disableRightClick);

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

    // Check if user has valid session data from localStorage
    const checkSessionAndSetupTimer = async () => {
      try {
        const accessToken = localStorage.getItem('LMS_access_token');
        const hasSessionData = accessToken && studentId;
        
        if (!hasSessionData) {
          return;
        }

        const events = ['mousemove', 'keypress', 'scroll', 'click'];
        const handleActivity = () => {
          // Double-check we're not on login page before resetting timer
          if (isOnLoginPage()) {
            return;
          }
          resetTimer();
        };

        events.forEach((event) => {
          window.addEventListener(event, handleActivity);
        });

        resetTimer();

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
        };
      } catch (error) {
        console.error("Error checking session data from localStorage:", error);
      }
    };

    checkSessionAndSetupTimer();

    // Cleanup function for the entire useEffect
    return () => {
      // Remove global right-click disable
      window.removeEventListener('contextmenu', disableRightClick);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [resetTimer, location.pathname, disableRightClick]);

  return (
    <>
      <AppRoutes />
   
      <Modal show={showLogoutWarning} onHide={resetTimer}>
        <Modal.Header closeButton>
          <Modal.Title>Session Timeout Warning</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          You will be logged out in {countdown} seconds due to in-active.
        </Modal.Body>
      </Modal>
    </>
  );
}

export default App;
