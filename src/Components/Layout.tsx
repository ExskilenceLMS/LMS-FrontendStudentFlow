import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import TestHeader from '../TestHeader';
import { useLocation } from 'react-router-dom';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const location = useLocation();

  const pathsToHideSidebar = ["/coding-temp", "/test-section", "/mcq-temp", "/SQL-MCQ-Testing"];
  const pathsWithTestHeader = ["/coding-temp", "/test-section", "/mcq-temp"];

  useEffect(() => {
    if (pathsToHideSidebar.includes(location.pathname)) {
      setShowSidebar(false);
    }
  }, [location.pathname]);

  const toggleSidebar = () => setShowSidebar((prev) => !prev);

  const shouldHideSidebar = pathsToHideSidebar.includes(location.pathname);
  const isTestPage = pathsWithTestHeader.includes(location.pathname);

  return (
    <div style={{ backgroundColor: "#f0f0f0", minHeight: "100vh" }}>
      {!shouldHideSidebar && (
        <Sidebar show={showSidebar} toggleSidebar={toggleSidebar} />
      )}
      <div
        style={{
          marginLeft: shouldHideSidebar ? "10px" : showSidebar ? "180px" : "70px",
          backgroundColor: "#f0f0f0",
        }}
      >
        {isTestPage ? (
          <TestHeader />
        ) : (
          location.pathname !== "/Dashboard" && <Header />
        )}
        {children}
      </div>
    </div>
  );
};
export default Layout;
