import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import TestHeader from '../TestHeader';
import InternetInfo from './InternetInfo';
import ProjectLayout from './ProjectLayout';
import { useLocation } from 'react-router-dom';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showSidebar, setShowSidebar] = useState<boolean>(false);
  const location = useLocation();

  const pathsToHideSidebar = ["/coding-temp", "/test-section", "/mcq-temp", "/SQL-MCQ-Testing", "/test/coding"];
  const pathsWithTestHeader = ["/coding-temp", "/test-section", "/mcq-temp", "/test/coding"];
  
  // Check if current path is a project-related route
  const isProjectRoute = location.pathname.includes("/project");

  useEffect(() => {
    const shouldHide = pathsToHideSidebar.some(path => location.pathname.startsWith(path));
    if (shouldHide) {
      setShowSidebar(false);
    }
  }, [location.pathname]);

  const toggleSidebar = () => setShowSidebar((prev) => !prev);

  const shouldHideSidebar = pathsToHideSidebar.some(path => location.pathname.startsWith(path));
  const isTestPage = pathsWithTestHeader.some(path => location.pathname.startsWith(path));

  return (
    <div style={{ backgroundColor: "#f0f0f0", minHeight: "100vh" }}>
      <InternetInfo />
      {!shouldHideSidebar && (
        <Sidebar show={showSidebar} toggleSidebar={toggleSidebar} />
      )}
      <div
        style={{
          marginLeft: shouldHideSidebar ? "10px" : showSidebar ? "178px" : "68px",
          backgroundColor: "#f0f0f0",
        }}
      >
        {isTestPage ? (
          <TestHeader />
        ) : (
          location.pathname !== "/Dashboard" && <Header />
        )}
        {isProjectRoute ? (
          <ProjectLayout>
            {children}
          </ProjectLayout>
        ) : (
          children
        )}
      </div>
    </div>
  );
};
export default Layout;
