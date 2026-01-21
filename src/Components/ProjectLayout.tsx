import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import ProjectSidebar from "./ProjectSidebar";
import { ProjectProvider, useProjectContext } from "./ProjectContext";
import CryptoJS from "crypto-js";
import { secretKey } from "../constants";

interface ProjectLayoutProps {
  children: React.ReactNode;
}

const ProjectLayoutContent: React.FC<ProjectLayoutProps> = ({ children }) => {
  const location = useLocation();
  const params = useParams();
  const { setProjectData, projectData } = useProjectContext();
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [projectId, setProjectId] = useState<string | undefined>();
  const [projectName, setProjectName] = useState<string | undefined>();
  const [hasLoadedProjectData, setHasLoadedProjectData] = useState<boolean>(false);

  // Determine if we should show the project sidebar based on route
  const shouldShowProjectSidebar = location.pathname.includes("/project/") || 
                                    location.pathname.includes("/task-description");

  useEffect(() => {
    setShowSidebar(shouldShowProjectSidebar);
    
    // Extract project information from various sources
    if (shouldShowProjectSidebar && !hasLoadedProjectData) {
      let foundProjectData = false;
      
      // Try to get from route params
      if (params.projectId) {
        setProjectId(params.projectId);
      }
      
      // Try to get from location state
      const state = location.state as any;
      if (state?.project) {
        setProjectId(state.project.project_id || state.project.id);
        setProjectName(state.project.project_name || state.project.name);
        // Set project data if it includes project_data/content
        if (state.project.project_data || state.project.content) {
          setProjectData(state.project);
          foundProjectData = true;
        }
      } else if (state?.projectName) {
        setProjectName(state.projectName);
      }
      
      // Try to get from sessionStorage
      if (!foundProjectData) {
        try {
          const storedProject = sessionStorage.getItem("selectedProject");
          if (storedProject) {
            const decrypted = CryptoJS.AES.decrypt(storedProject, secretKey).toString(CryptoJS.enc.Utf8);
            const project = JSON.parse(decrypted);
            setProjectId(project.project_id || project.id);
            setProjectName(project.project_name || project.name);
            // Set project data if it includes project_data/content
            if (project.project_data || project.content) {
              setProjectData(project);
              foundProjectData = true;
            }
          }
        } catch (error) {
          console.error("Error reading project from sessionStorage:", error);
        }
      }

      
      setHasLoadedProjectData(true);
    }
  }, [location.pathname, location.state, params, shouldShowProjectSidebar, setProjectData, hasLoadedProjectData, projectName]);

  if (!shouldShowProjectSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="mt-2 me-2 rounded-5 bg-white" style={{ display: "flex", height: "calc(100vh - 70px)" }}>
      {showSidebar && (
        <ProjectSidebar projectId={projectId} projectName={projectName} />
      )}
      <div className="bg-white"
        style={{
          flex: 1,
          overflow: "auto"
        }}
      >
        {children}
      </div>
    </div>
  );
};

const ProjectLayout: React.FC<ProjectLayoutProps> = ({ children }) => {
  const location = useLocation();
  const shouldShowProjectSidebar = location.pathname.includes("/project/") || 
                                    location.pathname.includes("/task-description");

  if (!shouldShowProjectSidebar) {
    return <>{children}</>;
  }

  return (
    <ProjectProvider>
      <ProjectLayoutContent>{children}</ProjectLayoutContent>
    </ProjectProvider>
  );
};

export default ProjectLayout;

