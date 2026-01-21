import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TfiMenuAlt } from "react-icons/tfi";
import { PiMonitorPlayBold } from "react-icons/pi";
import { SlNotebook } from "react-icons/sl";
import { BsListTask } from "react-icons/bs";
import { LiaLaptopCodeSolid } from "react-icons/lia";
import VideoContent from "./VideoContent";
import NotesContent from "./NotesContent";
import MCQContent from "./MCQContent";
import CodingContent from "./CodingContent";
import { getApiClient } from "../utils/apiAuth";
import CryptoJS from "crypto-js";
import { secretKey } from "../constants";
import { Spinner } from "react-bootstrap";
import { 
  getProjectId,
  setProjectIds, 
  fetchProjectMCQQuestions, 
  fetchProjectCodingQuestions,
  transformToCodingQuestions,
  MCQQuestion,
  CodingQuestion
} from "../utils/projectStorageUtils";

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
}

interface Task {
  data: TaskData[];
  task_name: string;
}

interface NoteData {
  id: number;
  content: string;
}

const TaskView: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [currentSubTaskIndex, setCurrentSubTaskIndex] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  
  // Content states
  const [videoData, setVideoData] = useState<{ [key: number]: { otp: string; playback_info: string } }>({});
  const [notesData, setNotesData] = useState<{ [key: number]: NoteData }>({});
  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([]);
  const [codingQuestions, setCodingQuestions] = useState<CodingQuestion[]>([]);
  const [currentVideoId, setCurrentVideoId] = useState<number | null>(null);
  const [currentNoteId, setCurrentNoteId] = useState<number | null>(null);
  const [currentMCQIndex, setCurrentMCQIndex] = useState<number>(0);

  const encryptedStudentId = sessionStorage.getItem("StudentId") || "";
  const decryptedStudentId = CryptoJS.AES.decrypt(
    encryptedStudentId,
    secretKey
  ).toString(CryptoJS.enc.Utf8);
  const studentId = decryptedStudentId;

  useEffect(() => {
    // Load task data from sessionStorage
    const taskDataStr = sessionStorage.getItem("currentTask");
    if (taskDataStr) {
      try {
        const taskData = JSON.parse(taskDataStr);
        setTask(taskData.task);
        
        // Check if user has a current subtask ID (from learning modules API)
        let initialSubTaskIndex = 0;
        if (taskData.currentSubTaskId && taskData.task.data) {
          // Find the index of the subtask with matching subtask_id
          const subtaskIndex = taskData.task.data.findIndex(
            (subTask: TaskData) => subTask.subtask_id === taskData.currentSubTaskId
          );
          if (subtaskIndex !== -1) {
            initialSubTaskIndex = subtaskIndex;
          }
        }
        
        // Set the appropriate sub-task as active
        if (taskData.task.data && taskData.task.data.length > 0) {
          setCurrentSubTaskIndex(initialSubTaskIndex);
          loadSubTaskContent(taskData.task.data[initialSubTaskIndex], initialSubTaskIndex);
        }
        setLoading(false);
      } catch (err) {
        console.error("Error parsing task data:", err);
        setError("Failed to load task data");
        setLoading(false);
      }
    } else {
      setError("Task data not found");
      setLoading(false);
    }
    
    // Get project_name from sessionStorage if available
    const projectName = sessionStorage.getItem("currentProjectName");
    if (projectName) {
      // Project name is available, can be used for display if needed
    }
  }, []);

  const fetchVideoData = async (videoId: number): Promise<{ otp: string; playback_info: string }> => {
    try {
      const response = await getApiClient().get(
        `${process.env.REACT_APP_BACKEND_URL}api/student/videos/${videoId}/`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching video data:", error);
      throw error;
    }
  };

  const fetchNotesData = async (noteId: number): Promise<{ content: string }> => {
    try {
      const response = await getApiClient().get(
        `${process.env.REACT_APP_BACKEND_URL}api/student/notes/${noteId}/`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching notes data:", error);
      throw error;
    }
  };

  const fetchMCQQuestions = async (subTask: TaskData) => {
    try {
      if (!subTask.subtask_id) {
        console.error("No subtask_id available");
        return;
      }
      
      const questions = await fetchProjectMCQQuestions(studentId);
      setMcqQuestions(questions);
    } catch (error) {
      console.error("Error fetching MCQ questions:", error);
    }
  };

  const fetchCodingQuestions = async (subTask: TaskData) => {
    try {
      if (!subTask.subtask_id) {
        console.error("No subtask_id available");
        return;
      }
      
      const fullQuestions = await fetchProjectCodingQuestions(studentId, subTask.subtask_id);
      const questions = transformToCodingQuestions(fullQuestions);
      setCodingQuestions(questions);
    } catch (error) {
      console.error("Error fetching coding questions:", error);
    }
  };

  const loadSubTaskContent = async (subTask: TaskData, index: number) => {
    setLoading(true);
    try {
      if (subTask.type === "video" && subTask.id) {
        const videoId = parseInt(subTask.id);
        setCurrentVideoId(videoId);
        if (!videoData[videoId]) {
          const data = await fetchVideoData(videoId);
          setVideoData((prev) => ({
            ...prev,
            [videoId]: data,
          }));
        }
      } else if (subTask.type === "notes" && subTask.id) {
        const noteId = parseInt(subTask.id);
        setCurrentNoteId(noteId);
        if (!notesData[noteId]) {
          const data = await fetchNotesData(noteId);
          setNotesData((prev) => ({
            ...prev,
            [noteId]: {
              id: noteId,
              content: data.content,
            },
          }));
        }
      } else if (subTask.type === "mcq") {
        await fetchMCQQuestions(subTask);
        setCurrentMCQIndex(0);
      } else if (subTask.type === "coding") {
        await fetchCodingQuestions(subTask);
      }
    } catch (err) {
      console.error("Error loading sub-task content:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubTaskClick = (index: number) => {
    if (task && task.data[index]) {
      const subTask = task.data[index];
      setCurrentSubTaskIndex(index);
      
      // Update all IDs in session storage when subtask changes
      const projectId = getProjectId("projectId") || "";
      const phaseId = getProjectId("phaseId") || "";
      const partId = getProjectId("partId") || "";
      const taskId = getProjectId("taskId") || "";
      const subtaskId = subTask.subtask_id || "";
      
      setProjectIds({
        projectId,
        phaseId,
        partId,
        taskId,
        subtaskId,
      });
      
      loadSubTaskContent(subTask, index);
    }
  };

  const handleToggle = () => {
    setIsActive((prevIsActive) => !prevIsActive);
  };

  const getSubTaskLabel = (subTask: TaskData, index: number): string => {
    // Use subtask_name if available, otherwise fallback to default labels
    if (subTask.subtask_name) {
      return subTask.subtask_name;
    }
    
    if (subTask.type === "video") {
      return `Video ${index + 1}`;
    } else if (subTask.type === "notes") {
      return `Notes ${index + 1}`;
    } else if (subTask.type === "mcq") {
      return "Practice MCQs";
    } else if (subTask.type === "coding") {
      return "Practice Coding";
    }
    return `Item ${index + 1}`;
  };

  const getSubTaskIcon = (type: string): React.ReactElement => {
    switch (type) {
      case "video":
        return <PiMonitorPlayBold size={20} />;
      case "notes":
        return <SlNotebook size={20} />;
      case "mcq":
        return <BsListTask size={20} />;
      case "coding":
        return <LiaLaptopCodeSolid size={20} />;
      default:
        return <PiMonitorPlayBold size={20} />;
    }
  };

  const renderContent = () => {
    if (!task || !task.data[currentSubTaskIndex]) {
      return (
        <div className="d-flex justify-content-center align-items-center h-100">
          <p className="text-muted">No content available</p>
        </div>
      );
    }

    const currentSubTask = task.data[currentSubTaskIndex];

    if (currentSubTask.type === "video" && currentSubTask.id) {
      const videoId = parseInt(currentSubTask.id);
      return (
        <VideoContent
          videoId={videoId}
          videoData={videoData[videoId] || null}
          loading={loading && !videoData[videoId]}
        />
      );
    } else if (currentSubTask.type === "notes" && currentSubTask.id) {
      const noteId = parseInt(currentSubTask.id);
      return (
        <NotesContent
          noteData={notesData[noteId] || null}
          loading={loading && !notesData[noteId]}
        />
      );
    } else if (currentSubTask.type === "mcq") {
      return (
        <MCQContent
          currentQuestion={mcqQuestions[currentMCQIndex] || null}
          currentIndex={currentMCQIndex}
          totalQuestions={mcqQuestions.length}
          onQuestionChange={(index) => setCurrentMCQIndex(index)}
          loading={loading && mcqQuestions.length === 0}
        />
      );
    } else if (currentSubTask.type === "coding") {
      const encryptedSubject = sessionStorage.getItem("Subject");
      const decryptedSubject = encryptedSubject
        ? CryptoJS.AES.decrypt(encryptedSubject, secretKey).toString(CryptoJS.enc.Utf8)
        : "";
      return (
        <CodingContent
          questions={codingQuestions}
          currentIndex={0}
          totalQuestions={codingQuestions.length}
          onQuestionChange={() => {}}
          subject={decryptedSubject}
          loading={loading && codingQuestions.length === 0}
        />
      );
    }

    return (
      <div className="d-flex justify-content-center align-items-center h-100">
        <p className="text-muted">Content type not supported</p>
      </div>
    );
  };

  const SidebarComponent = () => {
    if (!task) {
      return null;
    }

    const taskDataStr = sessionStorage.getItem("currentTask");
    const taskData = taskDataStr ? JSON.parse(taskDataStr) : null;
    const taskNumber = taskData?.taskIndex !== undefined ? taskData.taskIndex + 1 : 1;
    const taskName = task.task_name;

    return (
      <div
        className="border border-muted rounded-2 me-2 d-flex flex-column content-transition"
        style={{
          width: "25%",
          height: "100%",
          overflow: "auto",
          flexShrink: 0,
          boxShadow: "0px 4px 12px rgba(0,0,0,0.08)",
          backgroundColor: "transparent",
        }}
      >
        <div className="border-bottom border-muted">
          <div className="d-flex justify-content-between align-items-center px-3 pe-1 py-2">
            <h6
              className="mb-0 fw-semibold"
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "68%",
                flex: "1",
                cursor: "default",
              }}
            >
              Task {taskNumber}: {taskName}
            </h6>
            <div className="d-flex align-items-center">
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={handleToggle}
              >
                <TfiMenuAlt size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-grow-1 overflow-auto p-2 mx-2">
          {task.data.map((subTask, index) => {
            const isSelected = currentSubTaskIndex === index;
            return (
              <div
                key={index}
                onClick={() => handleSubTaskClick(index)}
                className={`bg-white rounded mt-1 text-dark ps-3 pe-2 py-1 ${
                  isSelected ? "fw-semibold" : "fw-normal"
                }`}
                style={{
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  backgroundColor: isSelected ? "#f0f0f0" : "#ffffff",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                  }
                }}
                role="button"
              >
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <span className="me-2" style={{ display: "flex", alignItems: "center" }}>
                      {getSubTaskIcon(subTask.type)}
                    </span>
                    <span>
                      {index + 1}. {getSubTaskLabel(subTask, index)}
                    </span>
                  </div>
                  {subTask.is_mandatory && (
                    <span
                      className="badge bg-warning text-dark ms-2"
                      style={{ fontSize: "10px" }}
                    >
                      Required
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const SidebarComponentBar = () => {
    return (
      <div className="d-flex flex-column" style={{ flexShrink: 0 }}>
        <div>
          <button className="btn" onClick={handleToggle}>
            <TfiMenuAlt size={25} />
          </button>
        </div>
      </div>
    );
  };

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
      className="subject-roadmap-page container-fluid p-0"
      style={{
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#f2eeee",
      }}
    >
      <div
        className="p-0 my-0"
        style={{
          backgroundColor: "#f0f0f0",
          height: "100%",
          overflow: "hidden",
          padding: "7px",
        }}
      >
        <div
          className="container-fluid p-0 pt-2 pe-2"
          style={{
            maxWidth: "100%",
            overflow: "hidden",
            backgroundColor: "#f0f0f0",
            height: "100%",
          }}
        >
          <div className="row g-0" style={{ height: "100%" }}>
            <div className="col-12" style={{ height: "100%" }}>
              <div
                className="bg-white border border-muted rounded-2 py-2"
                style={{
                  height: "calc(100vh - 55px)",
                  overflow: "hidden",
                  paddingTop: "8px",
                  paddingBottom: "8px",
                }}
              >
                <div
                  className="d-flex"
                  style={{ height: "calc(100vh - 110px)" }}
                >
                  {isActive ? SidebarComponent() : SidebarComponentBar()}
                  <div
                    className="flex-grow-1 me-2 d-flex flex-column"
                    style={{ height: "100%" }}
                  >
                    <div
                      className="border border-muted rounded-2 ms-2 d-flex flex-column content-transition"
                      style={{
                        height: "100%",
                        overflow: "hidden",
                        boxShadow: "0px 4px 12px rgba(0,0,0,0.08)",
                        backgroundColor: "transparent",
                      }}
                    >
                      <div className="flex-grow-1" style={{ minHeight: "0", flex: "1 1 auto", maxHeight: "100%", overflow: "auto" }}>
                        {renderContent()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskView;

