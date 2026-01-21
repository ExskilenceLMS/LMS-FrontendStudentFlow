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

  const pathsToHideSidebar = ["/coding-temp", "/test-section", "/mcq-temp", "/SQL-MCQ-Testing", "/dynamic-coding-editor"];
  const pathsWithTestHeader = ["/coding-temp", "/test-section", "/mcq-temp"];
  
  // Check if current path includes dynamic coding editor
  const isDynamicCodingEditor = location.pathname.includes('dynamic-coding');
  
  // Check if current path is a project-related route
  const isProjectRoute = location.pathname.includes("/project");

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
        {(isTestPage || isDynamicCodingEditor) ? (
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
