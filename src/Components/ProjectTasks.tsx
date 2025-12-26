import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Spinner } from "react-bootstrap";
import TaskSidebar from "./TaskSidebar";
import VideoContent from "./VideoContent";
import NotesContent from "./NotesContent";
import MCQContent from "./MCQContent";
import CodingContent from "./CodingContent";
import { getApiClient } from "../utils/apiAuth";
import CryptoJS from "crypto-js";
import { secretKey } from "../constants";
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

const ProjectTasks: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [taskNumber, setTaskNumber] = useState<number>(0);
  const [currentSubTaskIndex, setCurrentSubTaskIndex] = useState<number | null>(null);


  // Content states
  const [videoData, setVideoData] = useState<{ [key: number]: { otp: string; playback_info: string } }>({});
  const [notesData, setNotesData] = useState<{ [key: number]: NoteData }>({});
  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([]);
  const [codingQuestions, setCodingQuestions] = useState<CodingQuestion[]>([]);
  const [loadedCodingSubtaskId, setLoadedCodingSubtaskId] = useState<string | null>(null);
  const [loadedMCQSubtaskId, setLoadedMCQSubtaskId] = useState<string | null>(null);
  const [currentVideoId, setCurrentVideoId] = useState<number | null>(null);
  const [currentNoteId, setCurrentNoteId] = useState<number | null>(null);
  const [currentMCQIndex, setCurrentMCQIndex] = useState<number>(0);

  const encryptedStudentId = sessionStorage.getItem("StudentId") || "";
  const decryptedStudentId = CryptoJS.AES.decrypt(
    encryptedStudentId,
    secretKey
  ).toString(CryptoJS.enc.Utf8);
  const studentId = decryptedStudentId;
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  const activateSubTask = async (subTask: TaskData, index: number) => {
    setCurrentSubTaskIndex(index);
    resetContentState(subTask.type);
    updateProjectIdsForSubtask(subTask);
    // --- Persist current subtask to sessionStorage ---
    const currentTaskStr = sessionStorage.getItem("currentTask");
    if (currentTaskStr) {
      try {
        const currentTaskObj = JSON.parse(currentTaskStr);
        currentTaskObj.currentSubTaskId = subTask.subtask_id;
        sessionStorage.setItem("currentTask", JSON.stringify(currentTaskObj));
      } catch (e) {
        // ignore corruption
      }
    }
    await loadSubTaskContent(subTask, index);
  };
  
  useEffect(() => {
    const loadInitialSubTask = async () => {
      const taskDataStr = sessionStorage.getItem("currentTask");
      if (!taskDataStr) {
        setError("Task data not found");
        setInitialLoading(false);
        return;
      }
  
      try {
        const taskData = JSON.parse(taskDataStr);
        setTask(taskData.task);
        setTaskNumber(taskData.taskIndex !== undefined ? taskData.taskIndex + 1 : 0);
  
        if (!taskData.task.data || taskData.task.data.length === 0) {
          setError("No subtasks available");
          setInitialLoading(false);
          return;
        }
  
        // Default to first subtask
        let initialSubTaskIndex = 0;
  
        // If session has a valid subtask, use it
        if (taskData.currentSubTaskId) {
          const index = taskData.task.data.findIndex(
            (subTask: TaskData) => subTask.subtask_id === taskData.currentSubTaskId
          );
          if (index !== -1) initialSubTaskIndex = index;
        }
  
        // Await loading the subtask before rendering content
        await activateSubTask(taskData.task.data[initialSubTaskIndex], initialSubTaskIndex);
  
        setInitialLoading(false); // done
      } catch (err) {
        console.error("Error parsing task data:", err);
        setError("Failed to load task data");
        setInitialLoading(false);
      }
    };
  
    loadInitialSubTask();
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
        console.error("subtask_id is required for project tasks");
        return;
      }
      
      // Check if questions are already loaded for this subtask
      if (loadedMCQSubtaskId === subTask.subtask_id && mcqQuestions.length > 0) {
        return;
      }
      
      const questions = await fetchProjectMCQQuestions(studentId);
      setMcqQuestions(questions);
      setLoadedMCQSubtaskId(subTask.subtask_id);
    } catch (error) {
      console.error("Error fetching MCQ questions:", error);
    }
  };

  const fetchCodingQuestions = async (subTask: TaskData) => {
    try {
      if (!subTask.subtask_id) {
        console.error("subtask_id is required for project tasks");
        return;
      }
      
      // Check if questions are already loaded for this subtask
      if (loadedCodingSubtaskId === subTask.subtask_id && codingQuestions.length > 0) {
        return;
      }
      
      // Fetch full questions (same API call, but we get all data)
      const fullQuestions = await fetchProjectCodingQuestions(studentId, subTask.subtask_id);
      
      // Cache full questions for UnifiedEditor
      const cachedQuestionsKey = `project_coding_questions_full_${subTask.subtask_id}`;
      sessionStorage.setItem(cachedQuestionsKey, JSON.stringify(fullQuestions));
      
      // Transform to simplified format for CodingContent display
      const simplifiedQuestions = transformToCodingQuestions(fullQuestions);
      setCodingQuestions(simplifiedQuestions);
      setLoadedCodingSubtaskId(subTask.subtask_id);
    } catch (error) {
      console.error("Error fetching coding questions:", error);
    }
  };

  const resetContentState = (type: TaskData["type"]) => {
    if (type === "coding") {
      setCodingQuestions([]);
      setLoadedCodingSubtaskId(null);
    }
    if (type === "mcq") {
      setMcqQuestions([]);
      setLoadedMCQSubtaskId(null);
      setCurrentMCQIndex(0);
    }
  };

  const updateProjectIdsForSubtask = (subTask: TaskData) => {
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

  const hasPreviousSubTask = (): boolean => {
    if (!task || currentSubTaskIndex === null) return false;
    return currentSubTaskIndex > 0;
  };
  
  const hasNextSubTask = (): boolean => {
    if (!task || currentSubTaskIndex === null) return false;
    return currentSubTaskIndex < task.data.length - 1;
  };  

  const handleSubTaskClick = (index: number) => {
    if (!task || !task.data[index] || currentSubTaskIndex === index) return;
    activateSubTask(task.data[index], index);
  };
  
  const handlePreviousSubTask = () => {
    if (!task || currentSubTaskIndex === null || currentSubTaskIndex <= 0) return;
    const prevIndex = currentSubTaskIndex - 1;
    activateSubTask(task.data[prevIndex], prevIndex);
  };
  
  const handleNextSubTask = () => {
    if (!task || currentSubTaskIndex === null) return;
    const nextIndex = currentSubTaskIndex + 1;
    if (nextIndex < task.data.length) {
      activateSubTask(task.data[nextIndex], nextIndex);
    } else {
      navigate("/project-roadmap");
    }
  };

  const renderContent = () => {
    if (currentSubTaskIndex === null || !task || !task.data[currentSubTaskIndex]) {
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
          loading={loading}
        />
      );
    } else if (currentSubTask.type === "coding") {
      const encryptedSubject = sessionStorage.getItem("Subject");
      const decryptedSubject = encryptedSubject
        ? CryptoJS.AES.decrypt(encryptedSubject, secretKey).toString(
            CryptoJS.enc.Utf8
          )
        : "";
      return (
        <CodingContent
          questions={codingQuestions}
          currentIndex={0}
          totalQuestions={codingQuestions.length}
          onQuestionChange={() => {}}
          subject={decryptedSubject}
          loading={loading}
        />
      );
    }

    return (
      <div className="d-flex justify-content-center align-items-center h-100">
        <p className="text-muted">Content type not supported</p>
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
    <div className="me-2 my-2 bg-white rounded-2" style={{ height: "calc(100vh - 70px)" }}>
      <div className="row g-0 h-100">
        {/* Sidebar Column */}
        <div className="col-auto h-100">
        {task && task.data ? (
  <TaskSidebar
    task={task}
    taskNumber={taskNumber}
    currentSubTaskIndex={currentSubTaskIndex ?? -1}
    onSubTaskClick={handleSubTaskClick}
  />
) : (
  <div className="p-3">
    <Spinner animation="border" size="sm" /> Loading tasks...
  </div>
)}

        </div>

        {/* Content Column */}
        <div className="col h-100 d-flex flex-column" style={{ minHeight: 0 }}>
          {/* Content Area */}
        <div className="border-bottom border-muted px-3 py-2">
          {(() => {
            const taskDataStr = sessionStorage.getItem("currentTask");
            if (taskDataStr) {
              try {
                const taskData = JSON.parse(taskDataStr);
                const phaseName = taskData.phaseName || "";
                const partName = taskData.partName || "";
                if (phaseName && partName) {
                  return (
                    <h6 className="mb-0 text-muted">
                      {sessionStorage.getItem("currentProjectName")} / {phaseName} / {partName}
                    </h6>
                  );
                }
              } catch (err) {
                console.error("Error parsing task data:", err);
              }
            }
            return null;
          })()}
        </div>
          <div className="flex-grow-1 d-flex" style={{ minHeight: 0, overflow: "hidden" }}>
            <div className="p-2 mx-2 d-flex flex-column" style={{ height: "100%", overflow: "auto", flex: "1 1 auto" }}>
            {renderContent()}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="d-flex justify-content-between p-3 border-top">
            <button
              className="btn btn-primary"
              onClick={handlePreviousSubTask}
              disabled={!hasPreviousSubTask()}
              style={{
                cursor: !hasPreviousSubTask() ? "not-allowed" : "pointer",
                opacity: !hasPreviousSubTask() ? 0.6 : 1,
              }}
            >
              Previous
            </button>
            <button
              className="btn btn-primary"
              onClick={handleNextSubTask}
              style={{
                cursor: "pointer",
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectTasks;

