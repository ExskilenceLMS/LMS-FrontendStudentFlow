import { useState, useEffect, useRef, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Detector } from "react-detect-offline";
import axios from "axios";
import { Modal } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import 'react-loading-skeleton/dist/skeleton.css';
import "./App.css";
import { secretKey } from './constants';
import CryptoJS from 'crypto-js';
import AppRoutes from "./AppRoutes";
import Layout from "./Components/Layout";
import InternetInfo from "./Components/InternetInfo";

function App() {
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
console.log(process.env.REACT_APP_PROJECT_NAME)
console.log(process.env.REACT_APP_BACKEND_URL)

  // Check if user is on login page
  const isOnLoginPage = () => {
    return window.location.pathname === '/' ;
  };

  const resetTimer = useCallback(() => {
    // Don't start timer if user is on login page
    if (isOnLoginPage()) {
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
      setShowLogoutWarning(true);
      setCountdown(60);
      startCountdown();
    }, (Number(process.env.REACT_APP_SESSION_TIMEOUT_MINUTES) || 5) * 60 * 1000); 
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
  }, []);

  const handleLogout = useCallback(async (isInactivityLogout: boolean = false) => {
    const url=`${process.env.REACT_APP_BACKEND_URL}api/logout/${studentId}/${isInactivityLogout}/`
    try{
      axios.get(url);
    sessionStorage.clear();
    window.location.href = '/'; 
    }
    catch (error){
      console.error("Login error")
    }
  }, [studentId]);

  useEffect(() => {
    // Don't set up timer events if user is on login page
    if (isOnLoginPage()) {
      return;
    }

    const events = ['mousemove', 'keypress', 'scroll', 'click'];
    const handleActivity = () => {
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
  }, [resetTimer]);

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
            <AppRoutes />
            <Modal show={showLogoutWarning} onHide={resetTimer}>
              <Modal.Header closeButton>
                <Modal.Title>Session Timeout Warning</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                You will be logged out in {countdown} seconds due to in-active.
              </Modal.Body>
            </Modal>
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

export default App;
