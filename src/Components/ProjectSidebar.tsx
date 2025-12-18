import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Accordion } from "react-bootstrap";
import { useProjectContext } from "./ProjectContext";
import { MdKeyboardArrowUp, MdKeyboardArrowDown } from "react-icons/md";

interface ProjectSidebarProps {
  projectId?: string;
  projectName?: string;
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({ projectId, projectName }) => {
  const navigate = useNavigate();
  const { projectData, selectedPart, setSelectedPart } = useProjectContext();
  const [activeKey, setActiveKey] = useState<string | null>("0");

  useEffect(() => {
    const phases = projectData?.project_data || projectData?.content || [];
    if (phases.length > 0) {
      setActiveKey("0");
    }
  }, [projectData]);

  const handlePartClick = (phaseName: string, partName: string, tasks: any[]) => {
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
                        className="fw-bold"
                        style={{
                          fontSize: "14px",
                          color: "#000",
                          lineHeight: "1.4"
                        }}
                      >
                        Phase {phaseIndex + 1} : {phase.phase_name}
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
                      
                      // Calculate days left (assuming days is a string like "6" or number)
                      const daysLeft = part.days !== undefined && part.days !== null 
                        ? parseInt(part.days.toString()) 
                        : 0;
                      
                      // Calculate progress percentage (default to 0 if not provided)
                      // Progress should be between 0-100
                      const progress = part.progress !== undefined && part.progress !== null
                        ? Math.min(100, Math.max(0, part.progress))
                        : 0;
                      
                      return (
                        <div
                          key={partIndex}
                          onClick={() => handlePartClick(phase.phase_name, part.part_name, part.tasks)}
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
                          <div className="d-flex justify-content-between align-items-center" style={{ marginBottom: "6px" }}>
                            <span
                            style={{ 
                              fontSize: "14px",
                              color: isPartSelected ? "#6C4DA2FF" : "#000",
                              lineHeight: "1.4"
                            }}>
                              Part {partIndex + 1} : {part.part_name}
                            </span>
                            <span 
                            className="text-muted"
                            style={{ 
                              fontSize: "12px",
                              color: "#666",
                              lineHeight: "1.4"
                            }}>
                              {daysLeft} Days Left
                            </span>
                          </div>
                          {/* Progress Bar */}
                          <div
                            className="mt-4"
                            style={{
                              width: "100%",
                              height: "4px",
                              backgroundColor: "#e0e0e0",
                              borderRadius: "2px",
                              overflow: "hidden"
                            }}
                          >
                            <div
                              style={{
                                width: `${progress}%`,
                                height: "100%",
                                backgroundColor: progress > 0 ? "#12B500" : "transparent",
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

