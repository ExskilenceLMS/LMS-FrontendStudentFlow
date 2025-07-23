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
          <div className="loginCard glow card">
            <div className="loginCardBody card-body d-flex flex-column align-items-center justify-content-center p-0">
              <div className="text-center">
                {/* <img src={Logo} alt="Exskilence Logo" style={{ width: '50px', height: '50px', marginBottom: '12px' }} /> */}
                <h4 className="card-title text-center pb-2 mx-1">Login with your Google account</h4>
              </div>
              <div className="text-center">
                {loading ? (
                  <div className="d-flex justify-content-center text-center align-items-center">
                    <Spinner color="#0d6efd" size="sm" className='me-2' /> Signing in...
                  </div>
                ) : verifyingSession ? (
                  <div className="d-flex justify-content-center text-center align-items-center">
                    <Spinner color="#0d6efd" size="sm" className='me-2' /> Verifying...
                  </div>
                ) : (
                  <button 
                    onClick={() => handleLogin()} 
                    className="btn d-flex justify-content-center align-items-center" 
                    style={{ 
                      color: 'white', 
                      fontWeight: 'bold', 
                      borderRadius: '100%', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ 
                        backgroundColor: '#6f42c1', 
                        color: 'white', 
                        padding: '20px', 
                        textAlign: 'center', 
                        borderRadius: '20px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%' 
                      }}>
                        {/* <img className='me-3' src={GoogleLogo} alt="Google Logo" height={32} width={32} style={{backgroundColor:'white',borderRadius:'0px',padding:"5px"}} /> */}
                        Sign in with Google
                      </span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Welcome Text - Shows second on small screens, first on large screens */}
        <div className="col-12 col-lg-8 order-2 order-lg-1 d-flex align-items-center justify-content-center px-3 py-4">
          <div className="text-center" style={{ borderRadius: '15px', color: '#003e80', backgroundColor: 'transparent' }}>
            <h2 className="font-weight-bold mb-4">Welcome to Exskilence Upskilling Program</h2>
            <p style={{ fontSize: '1.25rem', lineHeight: '1.8', textAlign:'justify' }}>
              Upskilling refers to the process of acquiring new skills or enhancing existing ones to stay relevant in the ever-evolving job market. As industries rapidly change due to technological advancements and shifting economic landscapes, continuous learning has become essential for career growth and adaptability. By engaging in upskilling, individuals can improve their expertise, increase job opportunities, and remain competitive in their field. For organizations, investing in employee upskilling fosters innovation, boosts productivity, and helps retain top talent, ensuring that the workforce remains agile and future-ready.
            </p>
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