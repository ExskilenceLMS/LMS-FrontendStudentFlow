import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Spinner, Button } from "react-bootstrap";
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

interface RoadmapStatus {
  current_phase_id: string;
  current_part_id: string;
  current_task_id: string;
  current_subtask_id: string;
  status: "start" | "resume" | "completed";
}

const ProjectRoadmapContent: React.FC = () => {
  const navigate = useNavigate();
  const { setProjectData, selectedPart, setSelectedPart } = useProjectContext();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [projectData, setLocalProjectData] = useState<ProjectSidebarResponse | null>(null);
  const [roadmapStatus, setRoadmapStatus] = useState<RoadmapStatus | null>(null);
  const [taskLoading, setTaskLoading] = useState<string | null>(null);

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

  const fetchRoadmapStatus = async (projectId: string, projectContent?: Phase[]): Promise<RoadmapStatus | null> => {
    try {
      const url = `${process.env.REACT_APP_BACKEND_URL}api/student/project/roadmap/status/${studentId}/${projectId}`;
      const response = await getApiClient().get(url);
      if (response.data) {
        let status = response.data;
        
        // If all IDs are empty and status is "start", default to first phase/part/task
        if (
          status.status === "start" &&
          (!status.current_phase_id || status.current_phase_id === "") &&
          (!status.current_part_id || status.current_part_id === "") &&
          (!status.current_task_id || status.current_task_id === "") &&
          projectContent &&
          projectContent.length > 0
        ) {
          const firstPhase = projectContent[0];
          if (firstPhase.parts && firstPhase.parts.length > 0) {
            const firstPart = firstPhase.parts[0];
            if (firstPart.tasks && firstPart.tasks.length > 0) {
              const firstTask = firstPart.tasks[0];
              status = {
                ...status,
                current_phase_id: firstPhase.phase_id,
                current_part_id: firstPart.part_id,
                current_task_id: firstTask.task_id,
                current_subtask_id: firstTask.data && firstTask.data.length > 0 ? firstTask.data[0].subtask_id : "",
              };
            }
          }
        }
        
        setRoadmapStatus(status);
        
        // Store current_subtask_id in sessionStorage if present
        if (status.current_subtask_id && status.current_subtask_id !== "") {
          sessionStorage.setItem("currentRoadmapSubtaskId", status.current_subtask_id);
        }
        
        return status;
      }
      return null;
    } catch (err) {
      console.error("Error fetching roadmap status:", err);
      // Don't set error, just continue without status
      return null;
    }
  };

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

        // Fetch roadmap status (pass content to handle empty IDs case)
        const status = await fetchRoadmapStatus(project_id, response.data.content);

        // Auto-select part based on roadmap status, or default to first part
        if (response.data.content && response.data.content.length > 0) {
          let phaseToSelect = response.data.content[0];
          let partToSelect = phaseToSelect.parts?.[0];
          
          // Check if current task is completed and find next task
          const isCompleted = status?.status === "completed" && 
                             status?.current_subtask_id === "completed";
          
          if (isCompleted && status) {
            // Find next task
            const currentPhaseIndex = response.data.content.findIndex(
              (p: Phase) => p.phase_id === status.current_phase_id
            );
            if (currentPhaseIndex !== -1) {
              const currentPhase = response.data.content[currentPhaseIndex];
              const currentPartIndex = currentPhase.parts.findIndex(
                (p: Part) => p.part_id === status.current_part_id
              );
              if (currentPartIndex !== -1) {
                const currentPart = currentPhase.parts[currentPartIndex];
                const currentTaskIndex = currentPart.tasks.findIndex(
                  (t: Task) => t.task_id === status.current_task_id
                );

                // Check next task in same part
                if (currentTaskIndex !== -1 && currentTaskIndex < currentPart.tasks.length - 1) {
                  phaseToSelect = currentPhase;
                  partToSelect = currentPart;
                }
                // Check next part in same phase
                else if (currentPartIndex < currentPhase.parts.length - 1) {
                  const nextPart = currentPhase.parts[currentPartIndex + 1];
                  if (nextPart.tasks.length > 0) {
                    phaseToSelect = currentPhase;
                    partToSelect = nextPart;
                  }
                }
                // Check next phase's first part
                else if (currentPhaseIndex < response.data.content.length - 1) {
                  const nextPhase = response.data.content[currentPhaseIndex + 1];
                  if (nextPhase.parts.length > 0) {
                    phaseToSelect = nextPhase;
                    partToSelect = nextPhase.parts[0];
                  }
                }
              }
            }
          } else if (status?.current_phase_id && status?.current_part_id) {
            // If not completed, use current phase/part from status
            const statusPhase = response.data.content.find(
              (p: Phase) => p.phase_id === status.current_phase_id
            );
            if (statusPhase) {
              phaseToSelect = statusPhase;
              const statusPart = statusPhase.parts?.find(
                (p: Part) => p.part_id === status.current_part_id
              );
              if (statusPart) {
                partToSelect = statusPart;
              }
            }
          }
          
          if (partToSelect) {
            setSelectedPart({
              phaseName: phaseToSelect.phase_name,
              partName: partToSelect.part_name,
              tasks: partToSelect.tasks,
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

  const findNextTask = (): { phase: Phase; part: Part; task: Task; taskIndex: number } | null => {
    if (!projectData || !roadmapStatus) return null;

    const currentPhaseIndex = projectData.content.findIndex(
      (p) => p.phase_id === roadmapStatus.current_phase_id
    );
    if (currentPhaseIndex === -1) return null;

    const currentPhase = projectData.content[currentPhaseIndex];
    const currentPartIndex = currentPhase.parts.findIndex(
      (p) => p.part_id === roadmapStatus.current_part_id
    );
    if (currentPartIndex === -1) return null;

    const currentPart = currentPhase.parts[currentPartIndex];
    const currentTaskIndex = currentPart.tasks.findIndex(
      (t) => t.task_id === roadmapStatus.current_task_id
    );

    // Check next task in same part
    if (currentTaskIndex !== -1 && currentTaskIndex < currentPart.tasks.length - 1) {
      return {
        phase: currentPhase,
        part: currentPart,
        task: currentPart.tasks[currentTaskIndex + 1],
        taskIndex: currentTaskIndex + 1,
      };
    }

    // Check next part in same phase
    if (currentPartIndex < currentPhase.parts.length - 1) {
      const nextPart = currentPhase.parts[currentPartIndex + 1];
      if (nextPart.tasks.length > 0) {
        return {
          phase: currentPhase,
          part: nextPart,
          task: nextPart.tasks[0],
          taskIndex: 0,
        };
      }
    }

    // Check next phase's first part's first task
    if (currentPhaseIndex < projectData.content.length - 1) {
      const nextPhase = projectData.content[currentPhaseIndex + 1];
      if (nextPhase.parts.length > 0) {
        const firstPart = nextPhase.parts[0];
        if (firstPart.tasks.length > 0) {
          return {
            phase: nextPhase,
            part: firstPart,
            task: firstPart.tasks[0],
            taskIndex: 0,
          };
        }
      }
    }

    return null;
  };

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

      // Check if this task matches the current task from roadmap status
      const isCurrentTask = roadmapStatus?.current_task_id === taskId;
      const taskStatus = roadmapStatus?.status;

      // Check if current task is completed and find next task
      const isCurrentTaskCompleted = roadmapStatus?.status === "completed" && 
                                    roadmapStatus?.current_subtask_id === "completed";
      const nextTask = isCurrentTaskCompleted ? findNextTask() : null;
      const isNextTask = nextTask && 
                         nextTask.phase.phase_id === phaseId &&
                         nextTask.part.part_id === partId &&
                         nextTask.task.task_id === taskId;

      // Trigger learning modules API if:
      // 1. Current task with "start" status, OR
      // 2. Next task after completion (new task to start)
      const shouldTriggerAPI = (taskStatus === "start" && isCurrentTask) || isNextTask;
      
      let currentSubTaskId: string | null = null;
      if (shouldTriggerAPI) {
        setTaskLoading(taskId);
        try {
          const learningModulesUrl = `${process.env.REACT_APP_BACKEND_URL}api/student/project/learningmodules/${studentId}/${projectId}/${phaseId}/${partId}/${taskId}/`;
          const response = await getApiClient().get(learningModulesUrl);
          
          // Check HTTP status code - navigate if status is 200 (success), even if current_sub_task is empty
          if (response.status >= 200 && response.status < 300) {
            // Check if current_sub_task or current_sub_task_id is empty
            const apiSubTaskId = response.data?.current_sub_task_id || response.data?.current_sub_task || "";
            if (apiSubTaskId && apiSubTaskId !== "") {
              currentSubTaskId = apiSubTaskId;
            } else {
              // If current_sub_task is empty, use first subtask to navigate to next page
              if (task.data && task.data.length > 0) {
                currentSubTaskId = task.data[0].subtask_id;
              }
            }
            setTaskLoading(null);
            
            // Store current subtask ID from roadmap status if available
            if (currentSubTaskId) {
              sessionStorage.setItem("currentRoadmapSubtaskId", currentSubTaskId);
            }
            
            // Store all IDs in session storage using utility function
            setProjectIds({
              projectId,
              phaseId,
              partId,
              taskId,
              subtaskId: currentSubTaskId || task?.data?.[0]?.subtask_id || "",
              currentSubTaskId: currentSubTaskId || undefined,
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
              currentSubTaskId: currentSubTaskId || undefined,
            }));
            
            // Navigate immediately after API success
            navigate(`/project-tasks`, { replace: true });
            return; // Exit early after navigation
          } else {
            setTaskLoading(null);
            return; // Don't navigate if status is not success
          }
        } catch (err) {
          setTaskLoading(null);
          return; // Don't navigate if API fails
        }
      } else if (isCurrentTask && roadmapStatus?.current_subtask_id) {
        // For current task with resume/completed status, use subtask from roadmap status
        currentSubTaskId = roadmapStatus.current_subtask_id;
      }

      // Use subtask_id from roadmap status if this is the current task, otherwise use first subtask
      const subtaskId = (isCurrentTask && roadmapStatus?.current_subtask_id) 
        ? roadmapStatus.current_subtask_id 
        : (task?.data?.[0]?.subtask_id || "");
      
      // Store all IDs in session storage using utility function
      setProjectIds({
        projectId,
        phaseId,
        partId,
        taskId,
        subtaskId: currentSubTaskId || subtaskId,
        currentSubTaskId: currentSubTaskId || roadmapStatus?.current_subtask_id || undefined,
      });
      
      // Store current subtask ID from roadmap status if available
      const finalSubTaskId = currentSubTaskId || roadmapStatus?.current_subtask_id || undefined;
      if (finalSubTaskId) {
        sessionStorage.setItem("currentRoadmapSubtaskId", finalSubTaskId);
      }
      
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
        currentSubTaskId: finalSubTaskId,
      }));
      
      // Navigate to project tasks page (no parameters, data stored in sessionStorage)
      navigate(`/project-tasks`, { replace: true });
    } catch (error) {
      console.error("Error handling task click:", error);
      setTaskLoading(null);
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

    // Check if current task is completed and find next task
    const isCurrentTaskCompleted = roadmapStatus?.status === "completed" && 
                                   roadmapStatus?.current_subtask_id === "completed";
    const nextTask = isCurrentTaskCompleted ? findNextTask() : null;

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
          <h6 className="mb-0 text-muted">
            {projectData?.project_name} / {selectedPart?.phaseName} / {selectedPart?.partName}
          </h6>
        </div>
        <div className="flex-grow-1 p-3" style={{ overflow: "auto" }}>
          {part.tasks.map((task, taskIndex) => {
            // Determine task status
            const isCurrentTask = roadmapStatus?.current_task_id === task.task_id;
            const isCurrentPhase = roadmapStatus?.current_phase_id === phase.phase_id;
            const isCurrentPart = roadmapStatus?.current_part_id === part.part_id;
            
            // Check if this task is before the current task (including previous parts and phases)
            let isPreviousTask = false;
            if (roadmapStatus && projectData) {
              // Find current phase, part, and task indices
              const currentPhaseIndex = projectData.content.findIndex(
                (p: Phase) => p.phase_id === roadmapStatus.current_phase_id
              );
              const currentPhase = currentPhaseIndex !== -1 ? projectData.content[currentPhaseIndex] : null;
              const currentPartIndex = currentPhase 
                ? currentPhase.parts.findIndex((p: Part) => p.part_id === roadmapStatus.current_part_id)
                : -1;
              const currentPart = currentPartIndex !== -1 && currentPhase 
                ? currentPhase.parts[currentPartIndex] 
                : null;
              const currentTaskIndex = currentPart
                ? currentPart.tasks.findIndex((t: Task) => t.task_id === roadmapStatus.current_task_id)
                : -1;

              // Find this task's phase, part, and task indices
              const thisPhaseIndex = projectData.content.findIndex(
                (p: Phase) => p.phase_id === phase.phase_id
              );
              const thisPhase = thisPhaseIndex !== -1 ? projectData.content[thisPhaseIndex] : null;
              const thisPartIndex = thisPhase
                ? thisPhase.parts.findIndex((p: Part) => p.part_id === part.part_id)
                : -1;
              const thisTaskIndex = taskIndex;

              // Check if this task is before the current task
              // Only proceed if we found valid indices for both current and this task
              if (currentPhaseIndex !== -1 && currentPartIndex !== -1 && currentTaskIndex !== -1 &&
                  thisPhaseIndex !== -1 && thisPartIndex !== -1) {
                // Previous phase - all tasks in previous phases are previous
                if (thisPhaseIndex < currentPhaseIndex) {
                  isPreviousTask = true;
                }
                // Same phase, previous part - all tasks in previous parts are previous
                else if (thisPhaseIndex === currentPhaseIndex && thisPartIndex < currentPartIndex) {
                  isPreviousTask = true;
                }
                // Same phase, same part, previous task
                else if (thisPhaseIndex === currentPhaseIndex && thisPartIndex === currentPartIndex) {
                  if (thisTaskIndex < currentTaskIndex) {
                    isPreviousTask = true;
                  }
                }
              }
            }
            
            // Check if this is the next task to show "Start" button
            const isNextTask = nextTask && 
                               nextTask.phase.phase_id === phase.phase_id &&
                               nextTask.part.part_id === part.part_id &&
                               nextTask.task.task_id === task.task_id;
            
            // Determine button text and visibility
            let buttonText = "";
            let showButton = false;
            let isClickable = false;
            
            // Check if current task is completed
            const isCurrentTaskCompleted = roadmapStatus?.status === "completed" && 
                                          roadmapStatus?.current_subtask_id === "completed";
            
            if (isNextTask) {
              // Next task after completed - show start
              buttonText = "start";
              showButton = true;
              isClickable = true;
            } else if (isCurrentTask && isCurrentPhase && isCurrentPart && !isCurrentTaskCompleted) {
              // Current task - show start or resume (only if not completed)
              buttonText = roadmapStatus?.status === "start" ? "start" : roadmapStatus?.status === "resume" ? "resume" : "";
              showButton = roadmapStatus?.status === "start" || roadmapStatus?.status === "resume";
              isClickable = true;
            } else if (isPreviousTask || (isCurrentTask && isCurrentPhase && isCurrentPart && isCurrentTaskCompleted)) {
              // Previous task OR current task if completed - show completed (clickable to view)
              buttonText = "completed";
              showButton = true;
              isClickable = true;
            }
            // Other tasks - no button (showButton remains false)

            const isLoading = taskLoading === task.task_id;

            return (
              <div
                key={taskIndex}
                className="border border-muted rounded-2 p-3 mb-3"
                style={{
                  cursor: isClickable ? "pointer" : "default",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (isClickable) {
                    e.currentTarget.style.backgroundColor = "#F5F5F5";
                    e.currentTarget.style.boxShadow = "0px 2px 8px rgba(0,0,0,0.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.boxShadow = "none";
                }}
                onClick={() => isClickable && handleTaskClick(task, taskIndex)}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1 fw-semibold">Task {taskIndex + 1}: {task.task_name}</h6>
                    <div className="text-muted small">
                      {task.data.length} item{task.data.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  {showButton && (
                    <Button
                      variant={buttonText === "completed" ? "success" : "primary"}
                      size="sm"
                      disabled={isLoading || !isClickable}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isClickable) {
                          handleTaskClick(task, taskIndex);
                        }
                      }}
                    >
                      {isLoading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                        </>
                      ) : (
                        buttonText.charAt(0).toUpperCase() + buttonText.slice(1)
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
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

