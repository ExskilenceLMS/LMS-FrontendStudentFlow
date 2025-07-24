import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import './Login.css';
import GoogleLogo from './Components/images/search.png';
import CryptoJS from 'crypto-js';
import { secretKey } from './constants';
import { createAxiosWithActivityTracking, performLogout } from './utils/apiAuth';

// const Logo = process.env.PUBLIC_URL + '/Fav-icon.png';

interface UserData {
  access_token: string;
}

interface GoogleUserInfo {
  name: string;
  email: string;
  picture: string;
}

interface LoginResponse {
  student_id: string;
  course_id: string;
  batch_id: string;
  access_token: string;
  token_type: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(null);
  const [email] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [verifyingSession, setVerifyingSession] = useState<boolean>(false);
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const sessionCheckExecuted = useRef<boolean>(false);

  const handleCloseAlert = (): void => setShowAlert(false);

  const handleLogin = useGoogleLogin({
    onSuccess: (codeResponse: UserData) => setUser(codeResponse),
    onError: (error: any) => {
      console.error('Login Failed:', error);
      setAlertMessage('Login Failed');
      setShowAlert(true);
    }
  });

  useEffect(() => {
    if (!user) return;

    const fetchUserProfile = async (): Promise<void> => {
      setLoading(true);
      try {
        const { data } = await axios.get<GoogleUserInfo>(
          `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${user.access_token}`,
          {
            headers: {
              Authorization: `Bearer ${user.access_token}`,
            },
          }
        );


        const { name, email, picture } = data;

        const encryptedName = CryptoJS.AES.encrypt(name, secretKey).toString();
        const encryptedEmail = CryptoJS.AES.encrypt(email, secretKey).toString();
        const encryptedPicture = CryptoJS.AES.encrypt(picture, secretKey).toString();


        sessionStorage.setItem("Name", encryptedName);
        sessionStorage.setItem("Email", encryptedEmail);
        sessionStorage.setItem("Picture", encryptedPicture);
        
        const json = {
          "email": CryptoJS.enc.Utf8.parse(email).toString(),
          "access_token": CryptoJS.enc.Utf8.parse(user.access_token).toString(),
        }
        
        const url = `${process.env.REACT_APP_BACKEND_URL}api/new-login/`
        
        const axiosWithTracking = createAxiosWithActivityTracking();

        try {
          const response = await axiosWithTracking.post<LoginResponse>(url, json);

          const encryptedStudentId = CryptoJS.AES.encrypt(response.data.student_id, secretKey).toString();
          const encryptedCourseId = CryptoJS.AES.encrypt(response.data.course_id, secretKey).toString();
          const encryptedBatchId = CryptoJS.AES.encrypt(response.data.batch_id, secretKey).toString();

          sessionStorage.setItem("StudentId", encryptedStudentId);
          sessionStorage.setItem("CourseId", encryptedCourseId);
          sessionStorage.setItem("BatchId", encryptedBatchId);

          if (response.data.access_token) {
            sessionStorage.setItem("access_token", response.data.access_token);
          }
          try {
            localStorage.setItem("LMS_access_token", response.data.access_token);
            localStorage.setItem("LMS_StudentId", encryptedStudentId);
            localStorage.setItem("LMS_CourseId", encryptedCourseId);
            localStorage.setItem("LMS_BatchId", encryptedBatchId);
            localStorage.setItem("LMS_Email", encryptedEmail);
            localStorage.setItem("LMS_Name", encryptedName);
            localStorage.setItem("LMS_Picture", encryptedPicture);
            localStorage.setItem("LMS_timestamp", Date.now().toString());
            localStorage.setItem("LMS_lastActivityTime", Date.now().toString());
          } catch (error) {
            console.error("❌ localStorage update failed:", error);
            // Continue with login even if localStorage fails
          }

          // Check if login was successful by checking if we have the required data
          if (response.data.student_id && response.data.course_id && response.data.batch_id) {
            navigate("/Dashboard");
          } else {
            setAlertMessage("User not found");
            setShowAlert(true);
          }
        } catch (innerError: any) {
          const decryptedStudentId = CryptoJS.AES.decrypt(
            sessionStorage.getItem("StudentId") || "",
            secretKey
          ).toString(CryptoJS.enc.Utf8);

          if (innerError.response?.status === 401) {
            setAlertMessage("Invalid credentials");
          } else if (innerError.response?.status === 404) {
            setAlertMessage("User not found");
          } else {
            setAlertMessage("Login failed. Please try again.");
          }
          setShowAlert(true);
        }
      } catch (error: any) {
        setAlertMessage("Failed to fetch user profile");
        setShowAlert(true);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user, navigate]);

  useEffect(() => {
    let isMounted = true;

    const checkExistingSession = async () => {
      const executionId = Math.random().toString(36).substr(2, 9);
      
      try {
        setVerifyingSession(true);
        sessionCheckExecuted.current = true;
        
        const sessionData = {
          access_token: localStorage.getItem("LMS_access_token") || "",
          StudentId: localStorage.getItem("LMS_StudentId") || "",
          CourseId: localStorage.getItem("LMS_CourseId") || "",
          BatchId: localStorage.getItem("LMS_BatchId") || "",
          Email: localStorage.getItem("LMS_Email") || "",
          Name: localStorage.getItem("LMS_Name") || "",
          Picture: localStorage.getItem("LMS_Picture") || "",
          timestamp: parseInt(localStorage.getItem("LMS_timestamp") || "0") || 0,
          lastActivityTime: parseInt(localStorage.getItem("LMS_lastActivityTime") || "0") || 0
        };
        
        if (sessionData.access_token) {
          // Check if session is not too old (e.g., 24 hours)
          const sessionAge = Date.now() - sessionData.timestamp;
          const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
          
          if (sessionAge < maxSessionAge) {
            // First check last activity time before making API call
            const lastActivityTime = parseInt(localStorage.getItem("LMS_lastActivityTime") || "0");
            const currentTime = Date.now();
            const rawSessionTimeout = process.env.REACT_APP_SESSION_TIMEOUT_MINUTES;
            const sessionTimeoutMinutes = parseInt(rawSessionTimeout || "2");
            const sessionTimeoutMs = sessionTimeoutMinutes * 60 * 1000; 
            
            const timeSinceLastActivity = currentTime - lastActivityTime;
            
            
            if (timeSinceLastActivity <= sessionTimeoutMs && lastActivityTime > 0) {
              
              try {
                const axiosWithTracking = createAxiosWithActivityTracking();
                const response = await axiosWithTracking.get(`${process.env.REACT_APP_BACKEND_URL}api/validate-session/`);
                
                if (response.status === 200 && isMounted) {
                  const responseData = response.data;
                  
                  if (responseData.authorized === true) {
                    sessionStorage.setItem("access_token", sessionData.access_token);
                    sessionStorage.setItem("StudentId", sessionData.StudentId);
                    sessionStorage.setItem("CourseId", sessionData.CourseId);
                    sessionStorage.setItem("BatchId", sessionData.BatchId);
                    sessionStorage.setItem("Email", sessionData.Email);
                    sessionStorage.setItem("Name", sessionData.Name);
                    sessionStorage.setItem("Picture", sessionData.Picture);

                    localStorage.setItem("LMS_lastActivityTime", Date.now().toString());

                    try {
                      navigate("/Dashboard");
                    } catch (navError) {
                      console.error("Navigation failed:", navError);
                    }
                    
                    return;
                  } else {
                    const existingSessionData = {
                      access_token: localStorage.getItem("LMS_access_token") || "",
                      StudentId: localStorage.getItem("LMS_StudentId") || "",
                      CourseId: localStorage.getItem("LMS_CourseId") || "",
                      BatchId: localStorage.getItem("LMS_BatchId") || "",
                      Email: localStorage.getItem("LMS_Email") || "",
                      Name: localStorage.getItem("LMS_Name") || "",
                      Picture: localStorage.getItem("LMS_Picture") || "",
                      timestamp: parseInt(localStorage.getItem("LMS_timestamp") || "0") || 0,
                      lastActivityTime: parseInt(localStorage.getItem("LMS_lastActivityTime") || "0") || 0
                    };
                    if (existingSessionData.access_token && isMounted) {
                      try {
                        const decryptedStudentId = CryptoJS.AES.decrypt(existingSessionData.StudentId, secretKey).toString(CryptoJS.enc.Utf8);
                        const axiosWithTracking = createAxiosWithActivityTracking();
                        await performLogout(decryptedStudentId, false, true); // Force logout for unauthorized session
                      } catch (logoutError) {
                        console.error("Session logout API call failed:", logoutError);
                      }
                    }
                    localStorage.removeItem("LMS_access_token");
                    localStorage.removeItem("LMS_StudentId");
                    localStorage.removeItem("LMS_CourseId");
                    localStorage.removeItem("LMS_BatchId");
                    localStorage.removeItem("LMS_Email");
                    localStorage.removeItem("LMS_Name");
                    localStorage.removeItem("LMS_Picture");
                    localStorage.removeItem("LMS_timestamp");
                    localStorage.removeItem("LMS_lastActivityTime");
                    return;
                  }
                } 
              } catch (error: any) {
                if (isMounted) {
                  
                  if (error.response?.status === 401 || error.response?.status === 403) {
                    const existingSessionData = {
                      access_token: localStorage.getItem("LMS_access_token") || "",
                      StudentId: localStorage.getItem("LMS_StudentId") || "",
                      CourseId: localStorage.getItem("LMS_CourseId") || "",
                      BatchId: localStorage.getItem("LMS_BatchId") || "",
                      Email: localStorage.getItem("LMS_Email") || "",
                      Name: localStorage.getItem("LMS_Name") || "",
                      Picture: localStorage.getItem("LMS_Picture") || "",
                      timestamp: parseInt(localStorage.getItem("LMS_timestamp") || "0") || 0,
                      lastActivityTime: parseInt(localStorage.getItem("LMS_lastActivityTime") || "0") || 0
                    };
                    if (existingSessionData.access_token && isMounted) {
                      try {
                        const decryptedStudentId = CryptoJS.AES.decrypt(existingSessionData.StudentId, secretKey).toString(CryptoJS.enc.Utf8);
                        const axiosWithTracking = createAxiosWithActivityTracking();
                        await performLogout(decryptedStudentId, false, true); // Force logout for session check failure
                      } catch (logoutError) {
                        console.error("Session timeout API call failed:", logoutError);
                      }
                    }
                    localStorage.removeItem("LMS_access_token");
                    localStorage.removeItem("LMS_StudentId");
                    localStorage.removeItem("LMS_CourseId");
                    localStorage.removeItem("LMS_BatchId");
                    localStorage.removeItem("LMS_Email");
                    localStorage.removeItem("LMS_Name");
                    localStorage.removeItem("LMS_Picture");
                    localStorage.removeItem("LMS_timestamp");
                    localStorage.removeItem("LMS_lastActivityTime");
                  }
                }
              }
            }
            
            localStorage.removeItem("LMS_access_token");
            localStorage.removeItem("LMS_StudentId");
            localStorage.removeItem("LMS_CourseId");
            localStorage.removeItem("LMS_BatchId");
            localStorage.removeItem("LMS_Email");
            localStorage.removeItem("LMS_Name");
            localStorage.removeItem("LMS_Picture");
            localStorage.removeItem("LMS_timestamp");
            localStorage.removeItem("LMS_lastActivityTime");
            return;
          } else if (isMounted) {
            localStorage.removeItem("LMS_access_token");
            localStorage.removeItem("LMS_StudentId");
            localStorage.removeItem("LMS_CourseId");
            localStorage.removeItem("LMS_BatchId");
            localStorage.removeItem("LMS_Email");
            localStorage.removeItem("LMS_Name");
            localStorage.removeItem("LMS_Picture");
            localStorage.removeItem("LMS_timestamp");
            localStorage.removeItem("LMS_lastActivityTime");
          }
        } 

      } catch (error:any) {
        if (isMounted) {
          console.error("Error checking existing session:", error);
          if (error.message?.includes('network') || error.message?.includes('timeout')) {
            return;
          }
          localStorage.removeItem("LMS_access_token");
          localStorage.removeItem("LMS_StudentId");
          localStorage.removeItem("LMS_CourseId");
          localStorage.removeItem("LMS_BatchId");
          localStorage.removeItem("LMS_Email");
          localStorage.removeItem("LMS_Name");
          localStorage.removeItem("LMS_Picture");
          localStorage.removeItem("LMS_timestamp");
          localStorage.removeItem("LMS_lastActivityTime");
        }
      } finally {
        if (isMounted) {
          setVerifyingSession(false);
        }
      }
    };

    if (!sessionCheckExecuted.current) {
      checkExistingSession();
    }

    return () => {
      isMounted = false;
    };
  }, []); 
 
  return (
    <div className='login container-fluid h-100 d-flex align-items-center justify-content-center'>
      <div className="row w-100 justify-content-center">
        {/* Login Card - Shows first on small screens, second on large screens */}
                  <div className="col-12 col-lg-4 order-1 order-lg-2 d-flex justify-content-center align-items-center px-3 py-4">
            <div className="card" style={{ 
              border: 'none', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
              borderRadius: '12px',
              maxWidth: '400px',
              width: '100%'
            }}>
              <div className="card-body p-4 d-flex flex-column align-items-center justify-content-center">
                <h4 className="text-center mb-4" style={{ color: '#333', fontWeight: '600' }}>Login with your Google account</h4>
                <div className="text-center w-100">
                  {loading ? (
                    <div className="d-flex justify-content-center align-items-center">
                      <Spinner color="#6f42c1" size="sm" className='me-2' /> Signing in...
                    </div>
                  ) : verifyingSession ? (
                    <div className="d-flex justify-content-center align-items-center">
                      <Spinner color="#6f42c1" size="sm" className='me-2' /> Verifying...
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleLogin()} 
                      className="btn w-100" 
                      style={{ 
                        backgroundColor: '#4168a3', 
                        color: 'white', 
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px 24px',
                        fontWeight: '500',
                        fontSize: '16px'
                      }}
                    >
                      Sign in with Google
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        
                  {/* Welcome Text - Shows second on small screens, first on large screens */}
          <div className="col-12 col-lg-8 order-2 order-lg-1 d-flex align-items-center justify-content-center">
            <div className="">
              <span className="block text-start fw-bolder" style={{ color: '#fff', fontSize: '60px' }}>Exskilence</span>
              <p className='ps-5 text-start mb-3'  style={{
        background: "linear-gradient(to right, #f5d547, #48e28f)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        fontWeight: "bold",
        fontStyle: "italic",
        fontSize: "24px",
        fontFamily:'Poppins, sans-serif'
      }}><i>...Because Opportunity is a Right</i></p>
              <div style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto' }}>
                <p style={{ fontSize: '18px', lineHeight: '1.8', marginBottom: '1.5rem', color: '#fff', fontFamily:'Poppins, sans-serif' }}>
                  We are a Social Enterprise focused on providing Skilling and Placement Assistance to undergraduate students, from Computer Science Engineering and related streams, particularly from Tier 2 and Tier 3 colleges.
                </p>
                <p style={{ fontSize: '18px', lineHeight: '1.8', color: '#fff', fontFamily:'Poppins, sans-serif' }}>
                  At Exskilence, we are on a mission to empower individuals, transform careers, and unlock potential. We believe that quality tech education and real-world experience should be within everyone's reach, regardless of their background.
                </p>
              </div>
            </div>
          </div>
      </div>
      <Modal show={showAlert} onHide={handleCloseAlert} aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Header closeButton className='bg-primary'>
          <Modal.Title>Alert</Modal.Title>
        </Modal.Header>
        <Modal.Body>{alertMessage}</Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={handleCloseAlert}>Okay</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Login; 