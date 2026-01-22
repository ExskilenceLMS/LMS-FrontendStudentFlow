import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "react-bootstrap";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import TaskSidebar from "./TaskSidebar";
import VideoContent from "./VideoContent";
import NotesContent from "./NotesContent";
import MCQContent from "./MCQContent";
import CodingContent from "./CodingContent";
import PreviewModal from "../Modals/PreviewModal";
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
import { useSubtaskRestrictions } from "../hooks/useSubtaskRestrictions";
// Data structure interfaces
interface TaskData {
  id?: string;
  time?: string;
  type: "video" | "notes" | "coding" | "mcq" | "project_coding";
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
  const [projectCodingQuestionData, setProjectCodingQuestionData] = useState<any>(null);
  const [projectCodingLoading, setProjectCodingLoading] = useState<boolean>(false);
  const [currentMCQIndex, setCurrentMCQIndex] = useState<number>(0);
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
  const [statusModalMessage, setStatusModalMessage] = useState<string>("");
  const [statusChecking, setStatusChecking] = useState<boolean>(false); // Loader for status API (only for status=true calls)
  
  // Ref to track if component is mounted (for async operations)
  const isMountedRef = useRef<boolean>(true);

  const encryptedStudentId = sessionStorage.getItem("StudentId") || "";
  const decryptedStudentId = CryptoJS.AES.decrypt(
    encryptedStudentId,
    secretKey
  ).toString(CryptoJS.enc.Utf8);
  const studentId = decryptedStudentId;

  // API function for updating lesson status
  const updateLessonStatus = async (subtaskId: string, status: boolean): Promise<any> => {
    try {
      const projectId = getProjectId("projectId") || "";
      const phaseId = getProjectId("phaseId") || "";
      const partId = getProjectId("partId") || "";
      const taskId = getProjectId("taskId") || "";

      if (!projectId || !phaseId || !partId || !taskId || !subtaskId) {
        console.error("Missing required IDs for lesson status update");
        return null;
      }

      const payload = {
        student_id: studentId,
        project_id: projectId,
        phase_id: phaseId,
        part_id: partId,
        task_id: taskId,
        sub_task: subtaskId,
        status: status
      };

      const response = await getApiClient().post(
        `${process.env.REACT_APP_BACKEND_URL}api/student/project/lessons/status/`,
        payload
      );

      return response.data;
    } catch (error) {
      console.error("Error updating lesson status:", error);
      return null;
    }
  };

  // Use subtask restrictions hook (no taskId needed - using single storage key)
  const {
    highestAllowedIndex: highestAllowedSubtaskIndex,
    setHighestAllowedIndex,
    clearRestrictions,
    completeSubtask,
    initializeHighestAllowed,
    isSubtaskAccessible,
  } = useSubtaskRestrictions({
    onAccessDenied: (message) => {
      setStatusModalMessage(message);
      setShowStatusModal(true);
    },
    updateLessonStatus,
  });

  const activateSubTask = async (subTask: TaskData, index: number) => {
    if (!isMountedRef.current) return;
    
    setCurrentSubTaskIndex(index);
    resetContentState(subTask.type);
    
    // Update project IDs in sessionStorage BEFORE loading content
    // This ensures fetchProjectCodingQuestions can read the correct IDs
    updateProjectIdsForSubtask(subTask);
    
    // Explicitly set subtaskId in sessionStorage to ensure it's available
    sessionStorage.setItem("currentSubtaskId", subTask.subtask_id);
    
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
    // Also update roadmap subtask ID in sessionStorage
    sessionStorage.setItem("currentRoadmapSubtaskId", subTask.subtask_id);
    
    // Load content (this shows loader)
    await loadSubTaskContent(subTask, index);
  };
  
  useEffect(() => {
    isMountedRef.current = true; // Set mounted flag
    
    const loadInitialSubTask = async () => {
      const taskDataStr = sessionStorage.getItem("currentTask");
      if (!taskDataStr) {
        if (isMountedRef.current) {
          setError("Task data not found");
        }
        return;
      }
  
      try {
        const taskData = JSON.parse(taskDataStr);
        
        if (!isMountedRef.current) return; // Check before state updates
        
        setTask(taskData.task);
        setTaskNumber(taskData.taskIndex !== undefined ? taskData.taskIndex + 1 : 0);

        if (!taskData.task.data || taskData.task.data.length === 0) {
          if (isMountedRef.current) {
            setError("No subtasks available");
          }
          return;
        }

        // Use single storage key for all tasks (not task-specific)
        const STORAGE_KEY = "highestAllowedSubtask";
        const maxSubtaskIndex = taskData.task.data.length - 1;
        
        // IMPORTANT: Check if task is completed BEFORE clearing (to preserve completion status)
        // Check if stored value >= max index for THIS task
        // This value might have been set by ProjectRoadmap if the task was completed
        const storedHighestIndexBeforeClear = sessionStorage.getItem(STORAGE_KEY);
        const storedIndexValue = storedHighestIndexBeforeClear ? parseInt(storedHighestIndexBeforeClear, 10) : -1;
        
        // Task is completed if stored value >= max index for THIS task
        // This ensures we only consider it completed if the stored value matches this task's max
        const isCompletedTask = storedIndexValue >= maxSubtaskIndex && storedIndexValue >= 0;
        
        // IMPORTANT: Clear restrictions when task changes (ensures value decreases when switching tasks)
        // This ensures that when switching from a task with higher index to a task with lower index,
        // the value will be reset properly
        clearRestrictions();

        // Default to first subtask
        let initialSubTaskIndex = 0;

        // Priority 1: Check for roadmap status subtask ID from sessionStorage
        const roadmapSubtaskId = sessionStorage.getItem("currentRoadmapSubtaskId");
        if (roadmapSubtaskId) {
          const index = taskData.task.data.findIndex(
            (subTask: TaskData) => subTask.subtask_id === roadmapSubtaskId
          );
          if (index !== -1) {
            initialSubTaskIndex = index;
          }
        }
        // Priority 2: If not found, check for currentSubTaskId from currentTask
        else if (taskData.currentSubTaskId) {
          const index = taskData.task.data.findIndex(
            (subTask: TaskData) => subTask.subtask_id === taskData.currentSubTaskId
          );
          if (index !== -1) initialSubTaskIndex = index;
        }
        // Priority 3: Default to first subtask (index 0) if nothing found

        // Validate initial subtask index is within bounds
        if (initialSubTaskIndex < 0 || initialSubTaskIndex >= taskData.task.data.length) {
          initialSubTaskIndex = 0; // Fallback to first subtask
        }
        
        // Edge case: Task with 0 subtasks
        if (taskData.task.data.length === 0) {
          if (isMountedRef.current) {
            setError("Task has no subtasks available");
          }
          return;
        }

        if (!isMountedRef.current) return; // Check before state updates

        // For completed tasks, set max index directly (e.g., if 5 subtasks, set to 4)
        // For non-completed tasks, start from 0 (restrictions cleared above)
        // The value will be updated based on status API response and as subtasks are completed
        if (isCompletedTask) {
          // Set max index directly (e.g., if 5 subtasks, set to 4)
          sessionStorage.setItem(STORAGE_KEY, maxSubtaskIndex.toString());
          setHighestAllowedIndex(maxSubtaskIndex);
        } else {
          // For non-completed tasks, start from 0 (already cleared above)
          // The value will be updated based on status API response (current_subtask_id)
          // and as subtasks are completed via completeSubtask
          setHighestAllowedIndex(0);
          sessionStorage.setItem(STORAGE_KEY, "0");
        }

        // Load initial subtask (fetch content first, then check status)
        const initialSubTask = taskData.task.data[initialSubTaskIndex];
        if (!initialSubTask || !initialSubTask.subtask_id) {
          if (isMountedRef.current) {
            setError("Invalid subtask data");
          }
          return;
        }

        if (!isMountedRef.current) return; // Check before navigation

        // Update highestAllowedSubtaskIndex based on initialSubTaskIndex
        // This ensures the user can access the subtask they're currently on
        // Example: If user is on subtask2 (index 1), set to at least 1
        if (initialSubTaskIndex >= 0) {
          const STORAGE_KEY = "highestAllowedSubtask";
          const currentHighest = sessionStorage.getItem(STORAGE_KEY);
          const currentHighestIndex = currentHighest ? parseInt(currentHighest, 10) : 0;
          
          // Always update if the initial subtask index is greater than or equal to the stored value
          if (initialSubTaskIndex >= currentHighestIndex) {
            setHighestAllowedIndex(initialSubTaskIndex);
          }
        }

        // Load content first (this shows loader)
        await activateSubTask(initialSubTask, initialSubTaskIndex);
        
        // Then check status (NO loader - status=false never shows loader)
        if (isMountedRef.current) {
          const statusResponse = await updateLessonStatus(initialSubTask.subtask_id, false); // status=false - no loader
          
          // Also try to update highestAllowedSubtaskIndex based on current_subtask_id from status response
          // This is a fallback in case the status response has more accurate information
          if (statusResponse && statusResponse.current_subtask_id) {
            const currentSubtaskIdFromResponse = statusResponse.current_subtask_id;
            const currentSubtaskIndex = taskData.task.data.findIndex(
              (subTask: TaskData) => subTask.subtask_id === currentSubtaskIdFromResponse
            );
            
            // If we found the subtask index, update highestAllowedSubtaskIndex to at least that index
            if (currentSubtaskIndex !== -1 && currentSubtaskIndex >= 0) {
              const STORAGE_KEY = "highestAllowedSubtask";
              const currentHighest = sessionStorage.getItem(STORAGE_KEY);
              const currentHighestIndex = currentHighest ? parseInt(currentHighest, 10) : 0;
              
              // Always update if the current subtask index is greater than or equal to the stored value
              if (currentSubtaskIndex >= currentHighestIndex) {
                setHighestAllowedIndex(currentSubtaskIndex);
              }
            }
          }
          
          // If status is false, show modal but don't block (content is already loaded)
          if (statusResponse && (statusResponse.status === false || statusResponse.status === "false")) {
            setStatusModalMessage(statusResponse.message || "This subtask has incomplete items.");
            setShowStatusModal(true);
          }
        }
      } catch (err) {
        console.error("Error parsing task data:", err);
        if (isMountedRef.current) {
          setError("Failed to load task data");
        }
      }
    };
  
    loadInitialSubTask();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - functions are stable from hook
  
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
      
      // Always fetch MCQ questions when subtask changes (API should be triggered)
      // Reset state if switching to a different subtask
      if (loadedMCQSubtaskId !== subTask.subtask_id) {
        setMcqQuestions([]);
        setLoadedMCQSubtaskId(null);
      }
      
      const questions = await fetchProjectMCQQuestions(studentId);
      if (!isMountedRef.current) return;
      setMcqQuestions(questions);
      setLoadedMCQSubtaskId(subTask.subtask_id);
    } catch (error) {
      console.error("Error fetching MCQ questions:", error);
      if (!isMountedRef.current) return;
      setMcqQuestions([]);
      setLoadedMCQSubtaskId(null);
    }
  };

  const fetchCodingQuestions = async (subTask: TaskData) => {
    try {
      if (!subTask.subtask_id) {
        console.error("subtask_id is required for project tasks");
        return;
      }
      
      // Always fetch coding questions when subtask changes (API should be triggered)
      // Reset state if switching to a different subtask
      if (loadedCodingSubtaskId !== subTask.subtask_id) {
        setCodingQuestions([]);
        setLoadedCodingSubtaskId(null);
      }
      
      // Fetch full questions (API call is always triggered)
      const fullQuestions = await fetchProjectCodingQuestions(studentId, subTask.subtask_id);
      
      if (!isMountedRef.current) return;
      
      // Cache full questions for UnifiedEditor
      const cachedQuestionsKey = `project_coding_questions_full_${subTask.subtask_id}`;
      sessionStorage.setItem(cachedQuestionsKey, JSON.stringify(fullQuestions));
      
      // Transform to simplified format for CodingContent display
      const simplifiedQuestions = transformToCodingQuestions(fullQuestions);
      setCodingQuestions(simplifiedQuestions);
      setLoadedCodingSubtaskId(subTask.subtask_id);
    } catch (error) {
      console.error("Error fetching coding questions:", error);
      // Clear state on error to allow retry
      if (!isMountedRef.current) return;
      setCodingQuestions([]);
      setLoadedCodingSubtaskId(null);
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
    if (type === "project_coding") {
      setProjectCodingQuestionData(null);
    }
  };

  const fetchProjectCodingQuestionData = async (subTask: TaskData) => {
    try {
      setProjectCodingLoading(true);
      const projectId = getProjectId("projectId") || "";
      const phaseId = getProjectId("phaseId") || "";
      const partId = getProjectId("partId") || "";
      const taskId = getProjectId("taskId") || "";
      const subtaskId = subTask.subtask_id || "";

      if (!projectId || !phaseId || !partId || !taskId || !subtaskId) {
        throw new Error("Missing required project IDs");
      }

      const response = await getApiClient().get(
        `${process.env.REACT_APP_BACKEND_URL}api/student/project/practice/project_coding/${studentId}/${projectId}/${phaseId}/${partId}/${taskId}/${subtaskId}/`
      );

      if (!isMountedRef.current) return;

      if (response.data?.questions?.length) {
        setProjectCodingQuestionData(response.data);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err: any) {
      console.error("Error fetching project coding question data:", err);
      if (isMountedRef.current) {
        setProjectCodingQuestionData(null);
      }
    } finally {
      if (isMountedRef.current) {
        setProjectCodingLoading(false);
      }
    }
  };

  const updateProjectIdsForSubtask = (subTask: TaskData) => {
    // Try to get IDs from sessionStorage first
    let projectId = getProjectId("projectId") || "";
    let phaseId = getProjectId("phaseId") || "";
    let partId = getProjectId("partId") || "";
    let taskId = getProjectId("taskId") || "";
    
    // If any IDs are missing, try to get them from currentTask in sessionStorage
    if (!phaseId || !partId || !taskId) {
      const currentTaskStr = sessionStorage.getItem("currentTask");
      if (currentTaskStr) {
        try {
          const currentTaskObj = JSON.parse(currentTaskStr);
          if (!phaseId && currentTaskObj.phaseId) phaseId = currentTaskObj.phaseId;
          if (!partId && currentTaskObj.partId) partId = currentTaskObj.partId;
          if (!taskId && currentTaskObj.taskId) taskId = currentTaskObj.taskId;
        } catch (e) {
          // ignore corruption
        }
      }
    }
    
    // If projectId is missing, try to get it from sessionStorage
    if (!projectId) {
      projectId = sessionStorage.getItem("currentProjectId") || "";
    }
    
    const subtaskId = subTask.subtask_id || "";
  
    // Ensure all IDs are set in sessionStorage
    setProjectIds({
      projectId,
      phaseId,
      partId,
      taskId,
      subtaskId,
    });
  }; 
  
  const loadSubTaskContent = async (subTask: TaskData, index: number) => {
    if (!isMountedRef.current) return; // Don't proceed if unmounted
    
    setLoading(true);
    try {
      if (subTask.type === "video" && subTask.id) {
        const videoId = parseInt(subTask.id);
        if (!isMountedRef.current) return;
        // Always fetch video data when subtask changes (API should be triggered)
        const data = await fetchVideoData(videoId);
        if (!isMountedRef.current) return;
        setVideoData((prev) => ({
          ...prev,
          [videoId]: data,
        }));
      } else if (subTask.type === "notes" && subTask.id) {
        const noteId = parseInt(subTask.id);
        if (!isMountedRef.current) return;
        // Always fetch notes data when subtask changes (API should be triggered)
        const data = await fetchNotesData(noteId);
        if (!isMountedRef.current) return;
        setNotesData((prev) => ({
          ...prev,
          [noteId]: {
            id: noteId,
            content: data.content,
          },
        }));
      } else if (subTask.type === "mcq") {
        // Always fetch MCQ questions when subtask changes (API should be triggered)
        await fetchMCQQuestions(subTask);
        if (!isMountedRef.current) return;
        setCurrentMCQIndex(0);
      } else if (subTask.type === "coding") {
        // Always fetch coding questions when subtask changes (API should be triggered)
        await fetchCodingQuestions(subTask);
      } else if (subTask.type === "project_coding") {
        // Fetch project coding question data
        await fetchProjectCodingQuestionData(subTask);
      }
    } catch (err) {
      console.error("Error loading sub-task content:", err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
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

  // Check if current subtask is MCQ and has multiple questions
  const isMCQSubtask = (): boolean => {
    if (!task || currentSubTaskIndex === null) return false;
    const currentSubTask = task.data[currentSubTaskIndex];
    return currentSubTask?.type === "mcq" && mcqQuestions.length > 0;
  };

  // Check if there's a previous MCQ question in current subtask
  const hasPreviousMCQ = (): boolean => {
    return isMCQSubtask() && currentMCQIndex > 0;
  };

  // Check if there's a next MCQ question in current subtask
  const hasNextMCQ = (): boolean => {
    return isMCQSubtask() && currentMCQIndex < mcqQuestions.length - 1;
  };  

  const handleSubTaskClick = async (index: number) => {
    if (!isMountedRef.current || !task || !task.data || index < 0 || index >= task.data.length) return;
    if (currentSubTaskIndex === index) return;
    
    const targetSubTask = task.data[index];
    if (!targetSubTask || !targetSubTask.subtask_id) {
      console.error("Invalid subtask data at index:", index);
      return;
    }
    
    // Check local access restriction only (NO status API call for sidebar navigation)
    if (!isSubtaskAccessible(index, currentSubTaskIndex ?? undefined)) {
      setStatusModalMessage("You must complete previous subtasks before accessing this one.");
      setShowStatusModal(true);
      return;
    }
    
    // Ensure highestAllowedSubtaskIndex is at least the index we're navigating to
    // The hook will prevent it from decreasing, but we want to ensure it's updated if needed
    if (index > highestAllowedSubtaskIndex) {
      setHighestAllowedIndex(index);
    }
    
    // Access granted, proceed with navigation and fetch content (no status API)
    await activateSubTask(targetSubTask, index);
  };
  
  const handlePreviousSubTask = async () => {
    if (!isMountedRef.current || !task || !task.data || currentSubTaskIndex === null || currentSubTaskIndex <= 0) return;
    const prevIndex = currentSubTaskIndex - 1;
    if (prevIndex < 0 || prevIndex >= task.data.length) return;
    const prevSubTask = task.data[prevIndex];
    if (!prevSubTask || !prevSubTask.subtask_id) {
      console.error("Invalid previous subtask data");
      return;
    }
    
    // Ensure highestAllowedSubtaskIndex doesn't decrease when navigating to previous
    // It should only increase or stay the same (preserve the maximum value)
    // Since we're going to a previous subtask, we don't need to update the index
    // but we should ensure it doesn't get reduced below the current value
    
    // Navigate to previous subtask and fetch content (no status check needed for previous)
    await activateSubTask(prevSubTask, prevIndex);
  };
  
  const handleNextSubTask = async () => {
    if (!isMountedRef.current || !task || !task.data || currentSubTaskIndex === null) return;
    
    const currentSubTask = task.data[currentSubTaskIndex];
    if (!currentSubTask || !currentSubTask.subtask_id) {
      console.error("Invalid current subtask data");
      return;
    }
    
    const nextIndex = currentSubTaskIndex + 1;
    
    if (nextIndex < task.data.length) {
      const nextSubTask = task.data[nextIndex];
      if (!nextSubTask || !nextSubTask.subtask_id) {
        console.error("Invalid next subtask data");
        return;
      }
      
      // Step 1: Check status of current subtask with status=true (SHOW loader)
      setStatusChecking(true); // Loader for status=true API call
      const completionResult = await completeSubtask(
        currentSubTask.subtask_id,
        currentSubTaskIndex,
        nextIndex
      );
      setStatusChecking(false); // Hide loader after status=true API call
      
      if (!isMountedRef.current) return; // Check after async operation
      
      if (!completionResult.success) {
        // Show modal if current subtask cannot be completed
        setStatusModalMessage(completionResult.message || "Cannot proceed to next subtask");
        setShowStatusModal(true);
        return;
      }
      
      // Step 2: Successfully completed, navigate to next subtask and fetch content
      // This will show loader while fetching content
      // Note: completeSubtask already updated highestAllowedSubtaskIndex to nextIndex
      // The hook ensures it never decreases, so we don't need to check again
      await activateSubTask(nextSubTask, nextIndex);
      
      // Step 3: After content is loaded, check status of next subtask (NO loader - status=false)
      if (isMountedRef.current) {
        const statusResponse = await updateLessonStatus(nextSubTask.subtask_id, false); // status=false - no loader
        
        // If status is false, show modal but don't block (content is already loaded)
        if (statusResponse && (statusResponse.status === false || statusResponse.status === "false")) {
          setStatusModalMessage(statusResponse.message || "This subtask has incomplete items.");
          setShowStatusModal(true);
        }
      }
    } else {
      // Last subtask - check status before navigating back
      // Step 1: Check status with status=true (SHOW loader)
      setStatusChecking(true); // Loader for status=true API call
      
      // Call status API directly to check actual status
      const statusResponse = await updateLessonStatus(currentSubTask.subtask_id, true);
      setStatusChecking(false); // Hide loader after status=true API call
      
      if (!isMountedRef.current) return; // Check after async operation
      
      // Only navigate if status is actually true
      if (statusResponse) {
        const isStatusFalse = statusResponse.status === false || statusResponse.status === "false";
        const isStatusTrue = statusResponse.status === true || statusResponse.status === "true";
        
        if (isStatusFalse) {
          // Show modal if last subtask cannot be completed
          setStatusModalMessage(statusResponse.message || "Sub task questions are not completed");
          setShowStatusModal(true);
          return;
        }
        
        if (isStatusTrue) {
          // Status is true, complete the subtask and navigate
          const completionResult = await completeSubtask(
            currentSubTask.subtask_id,
            currentSubTaskIndex,
            currentSubTaskIndex // Unlock current (last) subtask
          );
          
          if (completionResult.success) {
            // Navigate back to roadmap only if status was true
            navigate("/project-roadmap");
          }
          return;
        }
      }
      
      // If no response or unclear status, show modal and stay on page
      setStatusModalMessage("Unable to verify subtask completion. Please try again.");
      setShowStatusModal(true);
    }
  };

  // Combined handler for Previous button (MCQ navigation or subtask navigation)
  const handlePrevious = async () => {
    // If MCQ subtask and has previous MCQ question, navigate to previous MCQ
    if (hasPreviousMCQ()) {
      setCurrentMCQIndex(currentMCQIndex - 1);
      return;
    }
    // Otherwise, navigate to previous subtask
    await handlePreviousSubTask();
  };

  // Combined handler for Next button (MCQ navigation or subtask navigation)
  const handleNext = async () => {
    // If MCQ subtask and has next MCQ question, navigate to next MCQ
    if (hasNextMCQ()) {
      setCurrentMCQIndex(currentMCQIndex + 1);
      return;
    }
    // Otherwise, navigate to next subtask
    await handleNextSubTask();
  };

  // Check if Previous button should be disabled
  const isPreviousDisabled = (): boolean => {
    // If MCQ, check if there's previous MCQ or previous subtask
    if (isMCQSubtask()) {
      return !hasPreviousMCQ() && !hasPreviousSubTask();
    }
    // Otherwise, check only previous subtask
    return !hasPreviousSubTask();
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
    } else if (currentSubTask.type === "project_coding") {
      const firstQuestion = projectCodingQuestionData?.questions?.[0];
      const questionContent = firstQuestion?.Name || '';
      
      return (
        <div className="d-flex flex-column h-100 p-3">
          {projectCodingLoading ? (
            <div className="d-flex justify-content-center align-items-center" style={{ flex: 1 }}>
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </div>
          ) : (
            <>
              <div className="flex-grow-1" style={{ overflowY: 'auto' }}>
                <NotesContent
                  noteData={{ id: 1, content: questionContent }}
                  loading={false}
                  paddingLeft={false}
                />
              </div>
            </>
          )}
        </div>
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
    highestAllowedSubtaskIndex={highestAllowedSubtaskIndex}
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
          <div className="flex-grow-1 d-flex" style={{ minHeight: 0, overflow: "hidden", position: "relative" }}>
            <div className="p-2 mx-2 d-flex flex-column" style={{ height: "100%", overflow: "auto", flex: "1 1 auto" }}>
            {renderContent()}
            </div>
            {/* Status checking loader overlay */}
            {statusChecking && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(255, 255, 255, 0.8)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 1000,
                }}
              >
                <div className="text-center">
                  <Spinner animation="border" role="status" />
                  <p className="mt-2 text-muted">Checking status...</p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="d-flex justify-content-between align-items-center p-2 border-top">
            <button
              className="btn btn-primary btn-sm"
              onClick={handlePrevious}
              disabled={isPreviousDisabled()}
              style={{
                cursor: isPreviousDisabled() ? "not-allowed" : "pointer",
                opacity: isPreviousDisabled() ? 0.6 : 1,
              }}
            >
              Previous
            </button>
            {task && currentSubTaskIndex !== null && task.data[currentSubTaskIndex]?.type === "project_coding" && (
              <button
                className="btn btn-success btn-sm"
                onClick={() => navigate("/project-coding", { 
                  replace: true,
                  state: { questionData: projectCodingQuestionData }
                })}
                disabled={!projectCodingQuestionData}
                style={{
                  cursor: projectCodingQuestionData ? "pointer" : "not-allowed",
                  opacity: projectCodingQuestionData ? 1 : 0.6,
                }}
              >
                Launch Editor
                <FontAwesomeIcon icon={faUpRightFromSquare} className="ms-2" />
              </button>
            )}
            <button
              className="btn btn-primary btn-sm"
              onClick={handleNext}
              style={{
                cursor: "pointer",
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
      
      {/* Status Modal */}
      <PreviewModal
        show={showStatusModal}
        onHide={() => setShowStatusModal(false)}
        title="Incomplete Subtasks"
        content={<p>{statusModalMessage}</p>}
        size="md"
        error={null}
        centered={true}
        showFooter={true}
        footerText="Close"
        showWarningIcon={true}
        headerBgColor="warning"
      />
    </div>
  );
};

export default ProjectTasks;

