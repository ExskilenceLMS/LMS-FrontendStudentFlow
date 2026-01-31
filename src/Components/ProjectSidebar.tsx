import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Accordion } from "react-bootstrap";
import { useProjectContext } from "./ProjectContext";
import { MdKeyboardArrowUp, MdKeyboardArrowDown } from "react-icons/md";
import { setProjectIds, getProjectId } from "../utils/projectStorageUtils";
import { getApiClient } from "../utils/apiAuth";
import CryptoJS from "crypto-js";
import { secretKey } from "../constants";

interface ProjectSidebarProps {
  projectId?: string;
  projectName?: string;
}

interface PartStatus {
  phase_id: string;
  parts: {
    part_id: string;
    sub_tasks_total: number;
    sub_tasks_completed: number;
  }[];
}

interface PartsStatusResponse {
  phases: PartStatus[];
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({ projectId, projectName }) => {
  const navigate = useNavigate();
  const { projectData, selectedPart, setSelectedPart } = useProjectContext();
  const [activeKey, setActiveKey] = useState<string | null>("0");
  const [partsStatus, setPartsStatus] = useState<PartsStatusResponse | null>(null);
  // Fetch parts status from API
  useEffect(() => {
    const fetchPartsStatus = async () => {
      try {
        const currentProjectId = projectId || getProjectId("projectId") || sessionStorage.getItem("currentProjectId") || "";
        if (!currentProjectId) {
          return;
        }

        const encryptedStudentId = sessionStorage.getItem("StudentId") || "";
        if (!encryptedStudentId) {
          return;
        }

        const decryptedStudentId = CryptoJS.AES.decrypt(encryptedStudentId, secretKey).toString(CryptoJS.enc.Utf8);
        const studentId = decryptedStudentId;

        const url = `${process.env.REACT_APP_BACKEND_URL}api/student/project/roadmap/parts/status/${studentId}/${currentProjectId}`;
        const response = await getApiClient().get(url);
        
        if (response.data) {
          setPartsStatus(response.data);
        }
      } catch (error) {
        console.error("Error fetching parts status:", error);
      }
    };

    if (projectData) {
      fetchPartsStatus();
    }
  }, [projectData, projectId]);

  useEffect(() => {
    const phases = projectData?.project_data || projectData?.content || [];
    // Try to restore last selected part from sessionStorage
    const saved = sessionStorage.getItem("selectedProjectPart");
    if (phases.length > 0 && saved) {
      try {
        const { phaseName, partName } = JSON.parse(saved);
        const phaseIdx = phases.findIndex((p: any) => p.phase_name === phaseName);
        if (phaseIdx !== -1) {
          setActiveKey(phaseIdx.toString());
          const part = phases[phaseIdx].parts.find((p: any) => p.part_name === partName);
          if (part) {
            setSelectedPart({ phaseName, partName, tasks: part.tasks });
          }
        }
      } catch {}
    } else if (phases.length > 0) {
      setActiveKey("0");
    }
  }, [projectData, setSelectedPart]);

  const handlePartClick = (phaseName: string, partName: string, tasks: any[], phaseId?: string, partId?: string) => {
    // Check if this part is already selected - if so, don't do anything
    if (selectedPart?.phaseName === phaseName && selectedPart?.partName === partName) {
      return;
    }
    
    // Update phaseId and partId in session storage when part is clicked
    const projectId = getProjectId("projectId") || sessionStorage.getItem("currentProjectId") || "";
    const currentPhaseId = phaseId || phaseName;
    const currentPartId = partId || partName;

    // Persist selected part to sessionStorage
    sessionStorage.setItem("selectedProjectPart", JSON.stringify({ phaseName, partName }));

    // Get the first subtask ID from the first task of this part
    const firstTask = tasks && tasks.length > 0 ? tasks[0] : null;
    const firstSubtaskId = firstTask?.data && firstTask.data.length > 0 
      ? (firstTask.data[0]?.subtask_id || "") 
      : "";
    
    setProjectIds({
      projectId,
      phaseId: currentPhaseId,
      partId: currentPartId,
      taskId: "", // Will be set when task is clicked
      subtaskId: firstSubtaskId, // Set to first subtask of first task when changing part/phase
    });
    
    setSelectedPart({ phaseName, partName, tasks });
    if (!window.location.pathname.includes("/project-roadmap")) {
      navigate("/project-roadmap");
    }
  };

  const displayProjectName = projectName || projectData?.project_name || "Project";

  return (
    <div
      className="overflow-auto rounded-top"
      style={{
        width: "250px",
        backgroundColor: "#a891bf",
        minHeight: "calc(100vh - 70px)"
      }}
    >
      {/* Project Name at Top */}
      <div className="px-4 py-3 border-bottom border-white border-opacity-30">
        <div className="mb-0 fw-bold text-center text-white" style={{ fontSize: "18px"}}>
          {displayProjectName}
        </div>
      </div>

      {/* Phases and Parts */}
      {(() => {
        const phases = projectData?.project_data || projectData?.content || [];
        if (!phases.length) {
          return (
            <div className="p-4 text-white text-center">
              No project data available
            </div>
          );
        }
        return (
        <div>
          <Accordion activeKey={activeKey} onSelect={(key) => setActiveKey(key ? (key as string) : null)}>
            {phases.map((phase, phaseIndex) => {
              const isPhaseSelected = selectedPart?.phaseName === phase.phase_name;
              const eventKey = phaseIndex.toString();
              const isExpanded = activeKey === eventKey;
              
              return (
                <Accordion.Item 
                  key={phaseIndex} 
                  eventKey={eventKey}
                  style={{ 
                    backgroundColor: "transparent",
                    border: "none"
                  }}
                >
                  <Accordion.Header
                    style={{ 
                      backgroundColor: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      margin: "8px",
                      marginBottom: "8px",
                      padding: "0"
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between" style={{ width: "100%" }}>
                      <span
                        className={`${isPhaseSelected ? "fw-bold" : ""}`}
                        style={{
                          fontSize: "14px",
                          color: "#000",
                          lineHeight: "1.4"
                        }}
                      >
                        {phase.phase_name}
                      </span>
                      {isExpanded ? (
                        <MdKeyboardArrowDown 
                          key={`down-${phaseIndex}`}
                          size={18} 
                          style={{ 
                            color: "#6a1b9a"
                          }} 
                        />
                      ) : (
                        <MdKeyboardArrowUp 
                          key={`up-${phaseIndex}`}
                          size={18} 
                          style={{ 
                            color: "#6a1b9a"
                          }} 
                        />
                      )}
                    </div>
                  </Accordion.Header>
                  <Accordion.Body className="py-0 px-0" style={{ backgroundColor: "transparent" }}>
                    {phase.parts.map((part, partIndex) => {
                      const isPartSelected = 
                        selectedPart?.phaseName === phase.phase_name && 
                        selectedPart?.partName === part.part_name;
                      const isLastPart = partIndex === phase.parts.length - 1;
                      
                      // Calculate days left based on project start date and cumulative task days
                      const calculateDaysLeft = () => {
                        try {
                          // Get project start date
                          const startDateStr = projectData?.start_date;
                          if (!startDateStr) {
                            return 0;
                          }
                          
                          // Parse start date and reset to start of day
                          const startDate = new Date(startDateStr);
                          if (isNaN(startDate.getTime())) {
                            console.error("Invalid start_date:", startDateStr);
                            return 0;
                          }
                          startDate.setHours(0, 0, 0, 0);
                          
                          // Get today's date and reset to start of day
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          
                          // Calculate cumulative days from all tasks in this part and previous parts in the same phase
                          let cumulativeDays = 0;
                          
                          // Sum days from all previous parts in the same phase
                          for (let i = 0; i < partIndex; i++) {
                            const prevPart = phase.parts[i];
                            if (prevPart.tasks && Array.isArray(prevPart.tasks)) {
                              prevPart.tasks.forEach((task: any) => {
                                const taskDays = task.no_of_days;
                                if (taskDays !== undefined && taskDays !== null) {
                                  cumulativeDays += taskDays;
                                }
                              });
                            }
                          }
                          
                          // Sum days from all tasks in current part
                          if (part.tasks && Array.isArray(part.tasks)) {
                            part.tasks.forEach((task: any) => {
                              const taskDays = task.no_of_days;
                              if (taskDays !== undefined && taskDays !== null) {
                                cumulativeDays += taskDays;
                              }
                            });
                          }
                          
                          // Calculate end date for this part (start date + cumulative days)
                          const endDate = new Date(startDate);
                          endDate.setDate(endDate.getDate() + cumulativeDays);
                          
                          // Calculate days left (end date - today)
                          const diffTime = endDate.getTime() - today.getTime();
                          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                          
                          // Return 0 if negative, otherwise return the calculated days
                          return Math.max(0, diffDays);
                        } catch (error) {
                          console.error("Error calculating days left:", error);
                          return 0;
                        }
                      };
                      
                      const daysLeft = calculateDaysLeft();
                      
                      // Get progress from API response
                      let progress = 0;
                      
                      if (partsStatus) {
                        const phaseStatus = partsStatus.phases.find(
                          (p: PartStatus) => p.phase_id === (phase as any).phase_id
                        );
                        if (phaseStatus) {
                          const partStatus = phaseStatus.parts.find(
                            (p) => p.part_id === (part as any).part_id
                          );
                          if (partStatus && partStatus.sub_tasks_total > 0) {
                            progress = Math.round(
                              (partStatus.sub_tasks_completed / partStatus.sub_tasks_total) * 100
                            );
                            progress = Math.min(100, Math.max(0, progress));
                          }
                        }
                      } else {
                        // Fallback to part.progress if API data not available
                        progress = part.progress !== undefined && part.progress !== null
                          ? Math.min(100, Math.max(0, part.progress))
                          : 0;
                      }
                      
                      return (
                        <div
                          key={partIndex}
                          onClick={() => handlePartClick(phase.phase_name, part.part_name, part.tasks, (phase as any).phase_id, (part as any).part_id)}
                          className="px-3"
                          style={{ 
                            cursor: "pointer",
                            backgroundColor: "#fff",
                            color: isPartSelected ? "#350190FF" : "#000",
                            position: "relative",
                            borderLeft: isPartSelected ? "3px solid #350190FF" : "3px solid transparent",
                            marginLeft: "8px",
                            marginRight: "8px",
                            marginTop: partIndex === 0 ? "0" : "4px",
                            marginBottom: isLastPart ? "0" : "4px",
                            borderRadius: "8px",
                            paddingTop: "10px",
                            paddingBottom: "10px"
                          }}
                          role="button"
                        >
                          <div>
                            <div
                            style={{ 
                              fontSize: "14px",
                              color: isPartSelected ? "#6C4DA2FF" : "#000",
                              lineHeight: "1.4",
                              textAlign: "left"
                            }}>
                              {part.part_name}
                            </div>
                            <div 
                            className="text-muted"
                            style={{ 
                              fontSize: "12px",
                              color: "#666",
                              lineHeight: "1.4",
                              textAlign: "right"
                            }}>
                              {daysLeft} Days Left
                            </div>
                          </div>
                          {/* Progress Bar */}
                          <div
                            className="mt-2"
                            style={{
                              width: "100%",
                              height: "4px",
                              backgroundColor: "#e0e0e0",
                              borderRadius: "2px",
                              overflow: "hidden"
                            }}
                          >
                            <div
                              className={progress > 0 ? "progress-color" : ""}
                              style={{
                                width: `${progress}%`,
                                height: "100%",
                                transition: "width 0.3s ease, background-color 0.3s ease"
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </Accordion.Body>
                </Accordion.Item>
              );
            })}
          </Accordion>
        </div>
        );
      })()}
    </div>
  );
};

export default ProjectSidebar;

