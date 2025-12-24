import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Spinner } from "react-bootstrap";
import { getApiClient } from "./utils/apiAuth";
import CryptoJS from "crypto-js";
import { secretKey } from "./constants";
import ProjectSidebar from "./Components/ProjectSidebar";
import { ProjectProvider, useProjectContext } from "./Components/ProjectContext";
import { setProjectIds } from "./utils/projectStorageUtils";

// Data structure interfaces
interface TaskData {
  id?: string;
  time?: string;
  type: "video" | "notes" | "coding" | "mcq";
  topic_id?: string;
  subject_id?: string;
  is_mandatory: boolean;
  sub_topic_id?: string;
  subtask_name: string;
  subtask_id: string;
  count?: {
    level1: string;
    level2: string;
    level3: string;
  };
  selected?: {
    level1: string;
    level2: string;
    level3: string;
  };
}

interface Task {
  data: TaskData[];
  task_name: string;
  task_id: string;
}

interface Part {
  tasks: Task[];
  part_name: string;
  days: string;
  part_id: string;
}

interface Phase {
  parts: Part[];
  phase_name: string;
  phase_id: string;
}

interface ProjectSidebarResponse {
  start_date: string;
  project_name: string;
  content: Phase[];
}

const ProjectRoadmapContent: React.FC = () => {
  const navigate = useNavigate();
  const { setProjectData, selectedPart, setSelectedPart } = useProjectContext();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [projectData, setLocalProjectData] = useState<ProjectSidebarResponse | null>(null);

  const encryptedStudentId = sessionStorage.getItem("StudentId") || "";
  const decryptedStudentId = CryptoJS.AES.decrypt(
    encryptedStudentId,
    secretKey
  ).toString(CryptoJS.enc.Utf8);
  const studentId = decryptedStudentId;

  const encryptedBatchId = sessionStorage.getItem("BatchId") || "";
  const decryptedBatchId = CryptoJS.AES.decrypt(
    encryptedBatchId,
    secretKey
  ).toString(CryptoJS.enc.Utf8);
  const batchId = decryptedBatchId;

  useEffect(() => {
    const fetchProjectData = async () => {
      // Get project_id from sessionStorage (stored when navigating from Courses)
      const project_id = sessionStorage.getItem("currentProjectId");
      
      if (!project_id) {
        setError("Project ID not found. Please navigate from Dashboard.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const url = `${process.env.REACT_APP_BACKEND_URL}api/student/project-sidebar/${batchId}/${project_id}`;
        const response = await getApiClient().get(url);
        setLocalProjectData(response.data);
        
        // Store project_id and project_name in sessionStorage
        sessionStorage.setItem("currentProjectId", project_id);
        sessionStorage.setItem("currentProjectName", response.data.project_name);
        // Store full project data for navigation between tasks
        sessionStorage.setItem("currentProjectData", JSON.stringify(response.data));
        
        // Set project data in context
        setProjectData({
          project_name: response.data.project_name,
          start_date: response.data.start_date,
          content: response.data.content,
        });

        // Auto-select first part
        if (response.data.content && response.data.content.length > 0) {
          const firstPhase = response.data.content[0];
          if (firstPhase.parts && firstPhase.parts.length > 0) {
            const firstPart = firstPhase.parts[0];
            setSelectedPart({
              phaseName: firstPhase.phase_name,
              partName: firstPart.part_name,
              tasks: firstPart.tasks,
            });
          }
        }
      } catch (err: any) {
        console.error("Error fetching project data:", err);
        setError("Failed to load project data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, []);

  const handleTaskClick = async (task: Task, taskIndex: number) => {
    try {
      // Find phase and part to get their IDs
      const phase = projectData?.content?.find(
        (p) => p.phase_name === selectedPart?.phaseName
      );
      const part = phase?.parts?.find(
        (p) => p.part_name === selectedPart?.partName
      );
      
      // Validate phase and part exist
      if (!phase || !part) {
        console.error("Phase or part not found");
        setError("Missing required project information. Please try again.");
        return;
      }
      
      // Get IDs - these are mandatory, not optional
      const projectId = sessionStorage.getItem("currentProjectId") || "";
      const phaseId = phase.phase_id;
      const partId = part.part_id;
      const taskId = task.task_id;
      
      // Validate that all required IDs are present
      if (!phaseId || !partId || !taskId) {
        console.error("Missing required IDs:", { phaseId, partId, taskId });
        setError("Missing required project information. Please try again.");
        return;
      }
      
      // Call the learning modules API to check if user has started this task
      const learningModulesUrl = `${process.env.REACT_APP_BACKEND_URL}api/student/project/learningmodules/${studentId}/${projectId}/${phaseId}/${partId}/${taskId}/`;
      let currentSubTaskId: string | null = null;
      
      try {
        const response = await getApiClient().get(learningModulesUrl);
        if (response.data?.current_sub_task_id) {
          currentSubTaskId = response.data.current_sub_task_id;
        }
      } catch (err) {
        console.error("Error fetching learning modules:", err);
        // Continue even if API fails
      }
      
      // Always use the first subtask ID when clicking on a task (changing task)
      const firstSubtaskId = task?.data?.[0]?.subtask_id || "";
      
      // Store all IDs in session storage using utility function
      setProjectIds({
        projectId,
        phaseId,
        partId,
        taskId,
        subtaskId: firstSubtaskId, // Always use first subtask when changing tasks
        currentSubTaskId: currentSubTaskId || undefined, // Keep for progress tracking
      });
      
      // Store task data in sessionStorage for TaskView
      sessionStorage.setItem("currentTask", JSON.stringify({
        task,
        taskIndex,
        taskName: task.task_name,
        phaseName: selectedPart?.phaseName,
        partName: selectedPart?.partName,
        projectName: projectData?.project_name,
        phaseId,
        partId,
        taskId,
        currentSubTaskId, // Store the current subtask ID if available
      }));
      
      // Navigate to project tasks page (no parameters, data stored in sessionStorage)
      navigate(`/project-tasks`, { replace: true });
    } catch (error) {
      console.error("Error handling task click:", error);
      // Still navigate even if there's an error
      sessionStorage.setItem("currentTask", JSON.stringify({
        task,
        taskIndex,
        taskName: task.task_name,
        phaseName: selectedPart?.phaseName,
        partName: selectedPart?.partName,
        projectName: projectData?.project_name,
      }));
      navigate(`/project-tasks`, { replace: true });
    }
  };

  const renderTasks = () => {
    if (!selectedPart || !projectData) {
      return (
        <div className="d-flex justify-content-center align-items-center h-100">
          <p className="text-muted">Select a part to view tasks</p>
        </div>
      );
    }

    // Find the part from projectData
    const phase = projectData.content.find(
      (p) => p.phase_name === selectedPart.phaseName
    );
    if (!phase) return null;

    const part = phase.parts.find(
      (p) => p.part_name === selectedPart.partName
    );
    if (!part) return null;

    return (
      <div
        className=" d-flex flex-column"
        style={{
          height: "100%",
          overflow: "auto",
          backgroundColor: "transparent",
        }}
      >
        <div className="border-bottom border-muted px-3 py-2">
          <h6 className="mb-0 fw-semibold">
            {projectData?.project_name} / {selectedPart?.phaseName} / {selectedPart?.partName}
          </h6>
        </div>
        <div className="flex-grow-1 p-3" style={{ overflow: "auto" }}>
          {part.tasks.map((task, taskIndex) => (
            <div
              key={taskIndex}
              className="border border-muted rounded-2 p-3 mb-3"
              style={{
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#F5F5F5";
                e.currentTarget.style.boxShadow = "0px 2px 8px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.boxShadow = "none";
              }}
              onClick={() => handleTaskClick(task, taskIndex)}
            >
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="mb-1 fw-semibold">Task {taskIndex + 1}: {task.task_name}</h6>
                  <div className="text-muted small">
                    {task.data.length} item{task.data.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <div className="text-primary">
                  <span style={{ fontSize: "20px" }}>→</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center bg-white"
        style={{ height: "100vh" }}
      >
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "100vh" }}
      >
        <div className="text-center">
          <p className="text-danger">{error}</p>
        </div>
      </div>
    );
  }

  return (
              <div
                className="bg-white border border-muted rounded-2 my-2 me-2"
                style={{
                  height: "calc(100vh - 70px)",
                  overflow: "hidden",
                }}
              >
                <div
                  className="d-flex"
                >
                  <ProjectSidebar projectId={sessionStorage.getItem("currentProjectId") || undefined} projectName={projectData?.project_name} />
                  <div
                    className="flex-grow-1 d-flex flex-column"
                    style={{ height: "100%" }}
                  >
                    {renderTasks()}
                  </div>
                </div>
              </div>
  );
};

const ProjectRoadmap: React.FC = () => {
  return (
    <ProjectProvider>
      <ProjectRoadmapContent />
    </ProjectProvider>
  );
};

export default ProjectRoadmap;

