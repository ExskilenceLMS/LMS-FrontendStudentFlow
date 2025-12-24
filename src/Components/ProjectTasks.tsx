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
  const [currentSubTaskIndex, setCurrentSubTaskIndex] = useState<number>(0);

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

  useEffect(() => {
    // Load task data from sessionStorage
    const taskDataStr = sessionStorage.getItem("currentTask");
    if (taskDataStr) {
      try {
        const taskData = JSON.parse(taskDataStr);
        setTask(taskData.task);
        setTaskNumber(taskData.taskIndex !== undefined ? taskData.taskIndex + 1 : 0);
        
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
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Error parsing task data:", err);
        setError("Failed to load task data");
        setLoading(false);
      }
    } else {
      setError("Task data not found");
      setLoading(false);
    }
    
    // Task name is already stored in sessionStorage
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
      // Check if this subtask is already selected - if so, don't reload
      if (currentSubTaskIndex === index) {
        return;
      }
      
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

  const hasPreviousSubTask = (): boolean => {
    if (!task || !task.data) return false;
    return currentSubTaskIndex > 0;
  };

  const hasNextSubTask = (): boolean => {
    if (!task || !task.data) return false;
    return currentSubTaskIndex < task.data.length - 1;
  };

  const handlePreviousSubTask = () => {
    if (hasPreviousSubTask() && task) {
      const prevIndex = currentSubTaskIndex - 1;
      const subTask = task.data[prevIndex];
      setCurrentSubTaskIndex(prevIndex);
      
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
      
      loadSubTaskContent(subTask, prevIndex);
    }
  };

  const handleNextSubTask = () => {
    if (hasNextSubTask() && task) {
      const nextIndex = currentSubTaskIndex + 1;
      const subTask = task.data[nextIndex];
      setCurrentSubTaskIndex(nextIndex);
      
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
      
      loadSubTaskContent(subTask, nextIndex);
    } else {
      // Navigate back to project-roadmap when on last sub-task
      navigate("/project-roadmap");
    }
  };

  const getAllTasks = (): any[] => {
    try {
      const projectDataStr = sessionStorage.getItem("currentProjectData");
      if (projectDataStr) {
        const projectData = JSON.parse(projectDataStr);
        const allTasks: any[] = [];
        
        // Collect all tasks from all parts
        projectData.content?.forEach((phase: any) => {
          phase.parts?.forEach((part: any) => {
            part.tasks?.forEach((t: any, taskIdx: number) => {
              allTasks.push({
                task: t,
                taskIndex: taskIdx,
                phaseName: phase.phase_name,
                partName: part.part_name,
                phaseId: phase.phase_id || phase.phase_name,
                partId: part.part_id || part.part_name,
                taskId: t.task_id || taskIdx.toString(),
              });
            });
          });
        });
        return allTasks;
      }
    } catch (err) {
      console.error("Error getting all tasks:", err);
    }
    return [];
  };

  const handlePreviousTask = async () => {
    const taskDataStr = sessionStorage.getItem("currentTask");
    if (taskDataStr) {
      try {
        const taskData = JSON.parse(taskDataStr);
        const allTasks = getAllTasks();
        const currentTaskIndex = allTasks.findIndex(
          (t) => t.task.task_name === taskData.task.task_name
        );

        if (currentTaskIndex > 0) {
          const prevTask = allTasks[currentTaskIndex - 1];
          const projectDataStr = sessionStorage.getItem("currentProjectData");
          const projectData = projectDataStr ? JSON.parse(projectDataStr) : {};
          
          // Get IDs for the previous task
          const projectId = getProjectId("projectId") || sessionStorage.getItem("currentProjectId") || "";
          const phaseId = prevTask.phaseId || prevTask.phaseName || "";
          const partId = prevTask.partId || prevTask.partName || "";
          const taskId = prevTask.taskId || prevTask.taskIndex.toString() || "";
          // Always use the first subtask ID when changing tasks
          const firstSubtaskId = prevTask.task?.data?.[0]?.subtask_id || "";
          
          // Check for current_sub_task_id from API (for progress tracking)
          let currentSubTaskId: string | null = null;
          try {
            const learningModulesUrl = `${process.env.REACT_APP_BACKEND_URL}api/student/project/learningmodules/${studentId}/${projectId}/${phaseId}/${partId}/${taskId}/`;
            const response = await getApiClient().get(learningModulesUrl);
            if (response.data?.current_sub_task_id) {
              currentSubTaskId = response.data.current_sub_task_id;
            }
          } catch (err) {
            console.error("Error fetching learning modules:", err);
          }
          
          // Update all IDs in session storage - always use first subtask when changing tasks
          setProjectIds({
            projectId,
            phaseId,
            partId,
            taskId,
            subtaskId: firstSubtaskId,
            currentSubTaskId: currentSubTaskId || undefined,
          });
          
          sessionStorage.setItem("currentTask", JSON.stringify({
            task: prevTask.task,
            taskIndex: prevTask.taskIndex,
            taskName: prevTask.task.task_name,
            phaseName: prevTask.phaseName,
            partName: prevTask.partName,
            projectName: projectData.project_name,
            phaseId,
            partId,
            taskId,
            currentSubTaskId,
          }));
          // Reload the page data
          window.location.reload();
        }
      } catch (err) {
        console.error("Error navigating to previous task:", err);
      }
    }
  };

  const handleNextTask = async () => {
    const taskDataStr = sessionStorage.getItem("currentTask");
    if (taskDataStr) {
      try {
        const taskData = JSON.parse(taskDataStr);
        const allTasks = getAllTasks();
        const currentTaskIndex = allTasks.findIndex(
          (t) => t.task.task_name === taskData.task.task_name
        );

        if (currentTaskIndex < allTasks.length - 1) {
          const nextTask = allTasks[currentTaskIndex + 1];
          const projectDataStr = sessionStorage.getItem("currentProjectData");
          const projectData = projectDataStr ? JSON.parse(projectDataStr) : {};
          
          // Get IDs for the next task
          const projectId = getProjectId("projectId") || sessionStorage.getItem("currentProjectId") || "";
          const phaseId = nextTask.phaseId || nextTask.phaseName || "";
          const partId = nextTask.partId || nextTask.partName || "";
          const taskId = nextTask.taskId || nextTask.taskIndex.toString() || "";
          // Always use the first subtask ID when changing tasks
          const firstSubtaskId = nextTask.task?.data?.[0]?.subtask_id || "";
          
          // Check for current_sub_task_id from API (for progress tracking)
          let currentSubTaskId: string | null = null;
          try {
            const learningModulesUrl = `${process.env.REACT_APP_BACKEND_URL}api/student/project/learningmodules/${studentId}/${projectId}/${phaseId}/${partId}/${taskId}/`;
            const response = await getApiClient().get(learningModulesUrl);
            if (response.data?.current_sub_task_id) {
              currentSubTaskId = response.data.current_sub_task_id;
            }
          } catch (err) {
            console.error("Error fetching learning modules:", err);
          }
          
          // Update all IDs in session storage - always use first subtask when changing tasks
          setProjectIds({
            projectId,
            phaseId,
            partId,
            taskId,
            subtaskId: firstSubtaskId,
            currentSubTaskId: currentSubTaskId || undefined,
          });
          
          sessionStorage.setItem("currentTask", JSON.stringify({
            task: nextTask.task,
            taskIndex: nextTask.taskIndex,
            taskName: nextTask.task.task_name,
            phaseName: nextTask.phaseName,
            partName: nextTask.partName,
            projectName: projectData.project_name,
            phaseId,
            partId,
            taskId,
            currentSubTaskId,
          }));
          // Reload the page data
          window.location.reload();
        }
      } catch (err) {
        console.error("Error navigating to next task:", err);
      }
    }
  };

  const hasPreviousTask = (): boolean => {
    const taskDataStr = sessionStorage.getItem("currentTask");
    if (taskDataStr) {
      try {
        const taskData = JSON.parse(taskDataStr);
        const allTasks = getAllTasks();
        const currentTaskIndex = allTasks.findIndex(
          (t) => t.task.task_name === taskData.task.task_name
        );
        return currentTaskIndex > 0;
      } catch (err) {
        console.error("Error checking previous task:", err);
      }
    }
    return false;
  };

  const hasNextTask = (): boolean => {
    const taskDataStr = sessionStorage.getItem("currentTask");
    if (taskDataStr) {
      try {
        const taskData = JSON.parse(taskDataStr);
        const allTasks = getAllTasks();
        const currentTaskIndex = allTasks.findIndex(
          (t) => t.task.task_name === taskData.task.task_name
        );
        return currentTaskIndex < allTasks.length - 1;
      } catch (err) {
        console.error("Error checking next task:", err);
      }
    }
    return false;
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
          <TaskSidebar
            task={task}
            taskNumber={taskNumber}
            currentSubTaskIndex={currentSubTaskIndex}
            onSubTaskClick={handleSubTaskClick}
          />
        </div>

        {/* Content Column */}
        <div className="col h-100 d-flex flex-column" style={{ minHeight: 0 }}>
          {/* Content Area */}
          {(() => {
            const taskDataStr = sessionStorage.getItem("currentTask");
            if (taskDataStr) {
              try {
                const taskData = JSON.parse(taskDataStr);
                const phaseName = taskData.phaseName || "";
                const partName = taskData.partName || "";
                if (phaseName && partName) {
                  return (
                    <p className="text-muted ms-2 my-2">
                      {phaseName} / {partName}
                    </p>
                  );
                }
              } catch (err) {
                console.error("Error parsing task data:", err);
              }
            }
            return null;
          })()}
          <div className="flex-grow-1 d-flex" style={{ minHeight: 0, overflow: "hidden" }}>
            <div className="p-2 mx-2 border-top border-muted d-flex flex-column" style={{ height: "100%", overflow: "auto", flex: "1 1 auto" }}>
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

