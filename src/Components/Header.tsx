import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import { secretKey } from '../constants';
import CryptoJS from 'crypto-js';
import { IoArrowBackCircleOutline } from "react-icons/io5";
import { HiOutlineBellAlert } from "react-icons/hi2";
import { PiUserCircleLight } from "react-icons/pi";
import { RiUserSharedLine } from "react-icons/ri";
import { CiLogout } from "react-icons/ci";
import 'bootstrap/dist/css/bootstrap.min.css';
import apiClient from "../utils/apiAuth";
import { performLogout } from '../utils/apiAuth';
import { getBackNavigationPath, isBackNavigationAllowed } from '../utils/navigationRules';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const encryptedStudentId = sessionStorage.getItem('StudentId') || "";
  const decryptedStudentId = CryptoJS.AES.decrypt(encryptedStudentId!, secretKey).toString(CryptoJS.enc.Utf8);
  const studentId = decryptedStudentId;
  const pathSegments = useMemo(() => location.pathname.split('/').filter(Boolean), [location.pathname]);
  const encryptedSubject = sessionStorage.getItem("Subject") || "";
  const decryptedSubject = useMemo(() => CryptoJS.AES.decrypt(encryptedSubject!, secretKey).toString(CryptoJS.enc.Utf8), [encryptedSubject]);
  const subject = decryptedSubject;
  const encryptedDayNumber = sessionStorage.getItem('DayNumber') || "";
  const decryptedDayNumber = useMemo(() => CryptoJS.AES.decrypt(encryptedDayNumber!, secretKey).toString(CryptoJS.enc.Utf8), [encryptedDayNumber]);
  const dayNumber = decryptedDayNumber;
  const actualStudentId= CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualEmail= CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualName= CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);


  const formattedTitle = useMemo(() => pathSegments
    .map((segment) =>
      segment.replace("-", " ")
        .toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase())
    )
    .join(' > '), [pathSegments]);

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
    } catch (innerError: any) {console.error("Error during logout:", innerError);
      // Still navigate even if error logging fails
      navigate('/');
      setShowUserMenu(false);
    }
  }, [navigate, studentId, actualStudentId, actualEmail, actualName]);

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

  const handleBackBtn = useCallback(() => {
    const currentPath = location.pathname;
    
    // Check if back navigation is allowed for current path
    if (!isBackNavigationAllowed(currentPath)) {
      console.log('Back navigation not allowed for:', currentPath);
      return;
    }
    
    // Get the target path for back navigation
    const targetPath = getBackNavigationPath(currentPath);
    
    // Navigate to the target path
    navigate(targetPath);
  }, [location.pathname, navigate]);

  return (
    <div className='pe-2'>
      <div className="container-fluid bg-white border rounded-2 p-2 d-flex justify-content-between align-items-center me-5">
        <span className="text-center fs-6">
          <IoArrowBackCircleOutline size={30} className="me-1 pb-1 cursor-pointer" onClick={handleBackBtn} style={{ cursor: 'pointer'}} />
          <span className="">
          {formattedTitle === "Subjectoverview" ? subject :
          formattedTitle === "Subject Roadmap" ? "Day " + dayNumber :
          formattedTitle === "Sql Editor" ? subject + " > Practice Coding" :
          formattedTitle === "Py Editor" ? subject + " > Practice Coding" :
          formattedTitle === "Html Css-Editor" ? subject + " > Practice Coding" :
          formattedTitle === "Js Editor" ? subject + " > Practice Coding" :
          formattedTitle === "Profile" ? "Profile" :
          formattedTitle === "Editprofile" ? "Edit Profile" :
          formattedTitle === "Test Section" ? "Test" :
          formattedTitle}
          </span>
        </span>
        <span className="text-center fs-6">
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
                      <span className="fw-medium">< CiLogout size={20} className="me-1" /> Logout</span>
                    </button>
                  </div>
                )}
              </div>
        </span>
      </div>
    </div>
  );
}

export default Header;
