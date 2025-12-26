import React, { useState, useEffect } from "react";
import { PiMonitorPlayBold } from "react-icons/pi";
import { SlNotebook } from "react-icons/sl";
import { BsListTask } from "react-icons/bs";
import { LiaLaptopCodeSolid } from "react-icons/lia";

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
}

interface Task {
  data: TaskData[];
  task_name: string;
}

interface TaskSidebarProps {
  task: Task | null;
  taskNumber?: number;
  currentSubTaskIndex: number;
  onSubTaskClick: (index: number) => void;
}

const TaskSidebar: React.FC<TaskSidebarProps> = ({
  task,
  taskNumber,
  currentSubTaskIndex,
  onSubTaskClick,
}) => {
  const getSubTaskLabel = (subTask: TaskData, index: number): string => {
    // Use subtask_name if available, otherwise fallback to default labels
    if (subTask.subtask_name) {
      return subTask.subtask_name;
    }
    
    if (!task || !task.data) {
      return `Item ${index + 1}`;
    }
    const sameTypeCount = task.data
      .slice(0, index)
      .filter((item) => item.type === subTask.type).length;

    if (subTask.type === "video") {
      return `Video ${sameTypeCount + 1}`;
    } else if (subTask.type === "notes") {
      return `Notes ${sameTypeCount + 1}`;
    } else if (subTask.type === "mcq") {
      return "MCQs";
    } else if (subTask.type === "coding") {
      return "Coding Challenges";
    }
    return `Item ${sameTypeCount + 1}`;
  };

  const getSubTaskIcon = (type: string): React.ReactElement => {
    switch (type) {
      case "video":
        return <PiMonitorPlayBold size={20} style={{ marginRight: "10px" }} />;
      case "notes":
        return <SlNotebook size={20} style={{ marginRight: "10px" }} />;
      case "mcq":
        return <BsListTask size={20} style={{ marginRight: "10px" }} />;
      case "coding":
        return <LiaLaptopCodeSolid size={25} style={{ marginRight: "5px" }} />;
      default:
        return <PiMonitorPlayBold size={20} style={{ marginRight: "10px" }} />;
    }
  };

  if (!task) {
    return (
      <div
        className="rounded-2 border-end shadow-sm overflow-auto py-4"
        style={{
          width: "250px",
          backgroundColor: "#a891bf",
          minHeight: "calc(100vh - 70px)",
        }}
      >
        <div className="p-4 text-white text-center">
          No task data available
        </div>
      </div>
    );
  }

  const displayTaskName = taskNumber
    ? `Task ${taskNumber}: ${task.task_name}`
    : task.task_name;

  return (
    <div
      className="rounded-2 border-end shadow-sm overflow-auto py-4"
      style={{
        width: "250px",
        backgroundColor: "#a891bf",
        minHeight: "calc(100vh - 70px)",
      }}
    >
      {/* Task Name - Centered */}
      <div className="px-4 pb-4 mb-4 border-bottom border-white border-opacity-30">
        <h5 className="mb-0 fw-bold text-white text-center">{displayTaskName}</h5>
      </div>

      {/* Sub-tasks */}
      {task.data && task.data.length > 0 ? (
        <div>
          {task.data.map((subTask, index) => {
            const isSelected = currentSubTaskIndex === index;
            const isLast = index === task.data.length - 1;
            return (
              <div
                key={index}
                onClick={() => onSubTaskClick(index)}
                className="px-3"
                style={{
                  cursor: "pointer",
                  backgroundColor: "#fff",
                  color: isSelected ? "#350190FF" : "#000",
                  position: "relative",
                  borderLeft: isSelected ? "3px solid #350190FF" : "3px solid transparent",
                  marginLeft: "8px",
                  marginRight: "8px",
                  marginTop: index === 0 ? "0" : "4px",
                  marginBottom: isLast ? "0" : "4px",
                  borderRadius: "8px",
                  paddingTop: "10px",
                  paddingBottom: "10px"
                }}
                role="button"
              >
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <span style={{ display: "flex", alignItems: "center" }}>
                      {getSubTaskIcon(subTask.type)}
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        color: isSelected ? "#6C4DA2FF" : "#000",
                        lineHeight: "1.4"
                      }}
                    >
                      Sub Task {index+1} : {" "}
                      {getSubTaskLabel(subTask, index)}
                      {subTask.is_mandatory && (
                    <span
                      className="text-danger"
                    >
                     {" "} *
                    </span>
                  )}
                    </span>
                  </div>
                  
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 text-white text-center">No sub-tasks available</div>
      )}
    </div>
  );
};

export default TaskSidebar;

