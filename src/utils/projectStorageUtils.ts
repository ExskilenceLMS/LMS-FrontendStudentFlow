/**
 * Utility functions for managing project-related IDs in sessionStorage
 * and fetching project questions (MCQ and Coding)
 */

import { getApiClient } from './apiAuth';

export interface ProjectIds {
  projectId?: string;
  phaseId: string;
  partId: string;
  taskId: string;
  subtaskId: string;
  currentSubTaskId?: string;
}

/**
 * Stores project IDs in sessionStorage
 * @param ids - Object containing project IDs to store
 */
export const setProjectIds = (ids: ProjectIds): void => {
  try {
    if (ids.projectId) {
      sessionStorage.setItem("currentProjectId", ids.projectId);
    }
    // Mandatory fields - always set (even if empty string)
    sessionStorage.setItem("currentPhaseId", ids.phaseId);
    sessionStorage.setItem("currentPartId", ids.partId);
    sessionStorage.setItem("currentTaskId", ids.taskId);
    
    // Set subtaskId - this is the currently selected/active subtask
    // subtaskId is mandatory, so always set it
    // If subtaskId is provided (even if empty), use it; otherwise fallback to currentSubTaskId for initial load
    const subtaskIdToStore = ids.subtaskId !== undefined ? ids.subtaskId : (ids.currentSubTaskId || "");
    sessionStorage.setItem("currentSubtaskId", subtaskIdToStore);
  } catch (error) {
    console.error("Error storing project IDs in sessionStorage:", error);
  }
};

/**
 * Retrieves all project IDs from sessionStorage
 * @returns Object containing all stored project IDs (mandatory fields may be undefined if not set)
 */
export const getProjectIds = (): Partial<ProjectIds> & { phaseId?: string; partId?: string; taskId?: string } => {
  try {
    const phaseId = sessionStorage.getItem("currentPhaseId");
    const partId = sessionStorage.getItem("currentPartId");
    const taskId = sessionStorage.getItem("currentTaskId");
    
    return {
      projectId: sessionStorage.getItem("currentProjectId") || undefined,
      phaseId: phaseId || undefined,
      partId: partId || undefined,
      taskId: taskId || undefined,
      subtaskId: sessionStorage.getItem("currentSubtaskId") || undefined,
      currentSubTaskId: sessionStorage.getItem("currentSubTaskId") || undefined,
    };
  } catch (error) {
    console.error("Error retrieving project IDs from sessionStorage:", error);
    return {
      phaseId: undefined,
      partId: undefined,
      taskId: undefined,
    };
  }
};

/**
 * Gets a specific project ID from sessionStorage
 * @param key - The key of the ID to retrieve
 * @returns The ID value or undefined if not found
 */
export const getProjectId = (key: keyof ProjectIds): string | undefined => {
  try {
    const storageKey = `current${key.charAt(0).toUpperCase() + key.slice(1)}`;
    const value = sessionStorage.getItem(storageKey);
    // For mandatory fields, throw error if not found
    if (!value && (key === 'phaseId' || key === 'partId' || key === 'taskId')) {
      console.error(`Mandatory project ID ${key} not found in sessionStorage`);
      return undefined;
    }
    return value || undefined;
  } catch (error) {
    console.error(`Error retrieving ${key} from sessionStorage:`, error);
    return undefined;
  }
};

/**
 * Sets a specific project ID in sessionStorage
 * @param key - The key of the ID to store
 * @param value - The ID value to store
 */
export const setProjectId = (key: keyof ProjectIds, value: string): void => {
  try {
    const storageKey = `current${key.charAt(0).toUpperCase() + key.slice(1)}`;
    sessionStorage.setItem(storageKey, value);
  } catch (error) {
    console.error(`Error storing ${key} in sessionStorage:`, error);
  }
};

/**
 * Clears all project IDs from sessionStorage
 */
export const clearProjectIds = (): void => {
  try {
    sessionStorage.removeItem("currentProjectId");
    sessionStorage.removeItem("currentPhaseId");
    sessionStorage.removeItem("currentPartId");
    sessionStorage.removeItem("currentTaskId");
    sessionStorage.removeItem("currentSubtaskId");
    sessionStorage.removeItem("currentSubTaskId");
  } catch (error) {
    console.error("Error clearing project IDs from sessionStorage:", error);
  }
};

/**
 * Clears a specific project ID from sessionStorage
 * @param key - The key of the ID to clear
 */
export const clearProjectId = (key: keyof ProjectIds): void => {
  try {
    // Don't allow clearing mandatory fields
    if (key === 'phaseId' || key === 'partId' || key === 'taskId') {
      console.warn(`Cannot clear mandatory project ID: ${key}`);
      return;
    }
    const storageKey = `current${key.charAt(0).toUpperCase() + key.slice(1)}`;
    sessionStorage.removeItem(storageKey);
  } catch (error) {
    console.error(`Error clearing ${key} from sessionStorage:`, error);
  }
};

/**
 * Interface for MCQ Question
 */
export interface MCQQuestion {
  shuffledOptions: any;
  questionId: string;
  status: boolean;
  score: string;
  level: string;
  question: string;
  options: string[];
  correct_answer: string;
  Explanation?: string;
  Qn_name: string;
  entered_ans: string;
}

/**
 * Interface for Coding Question
 */
export interface CodingQuestion {
  id: number;
  question: string;
  score: string;
  isSolved: boolean;
  Qn: string;
  status?: boolean;
  level: string;
  editor: string;
}

/**
 * Fetches MCQ questions for a project subtask
 * @param studentId - Student ID
 * @returns Promise<MCQQuestion[]>
 */
export const fetchProjectMCQQuestions = async (
  studentId: string
): Promise<MCQQuestion[]> => {
  try {
    const projectId = sessionStorage.getItem("currentProjectId");
    const phaseId = sessionStorage.getItem("currentPhaseId");
    const partId = sessionStorage.getItem("currentPartId");
    const taskId = sessionStorage.getItem("currentTaskId");
    const subtaskId = sessionStorage.getItem("currentSubtaskId");

    if (!projectId || !phaseId || !partId || !taskId || !subtaskId) {
      throw new Error("Missing required project IDs in sessionStorage");
    }

    const url = `${process.env.REACT_APP_BACKEND_URL}api/student/project/practice/mcq/${studentId}/${projectId}/${phaseId}/${partId}/${taskId}/${subtaskId}/`;
    const response = await getApiClient().get(url);
    const questions = response.data.questions || [];
    
    // Transform API response to match MCQQuestion interface
    return questions.map((q: any) => ({
      shuffledOptions: q.shuffledOptions || q.options || [],
      questionId: q.questionId || q.Qn_name || q.id || '',
      status: q.status || false,
      score: q.score || '0/10',
      level: q.level || '',
      question: q.question || q.Qn || '',
      options: q.options || [],
      correct_answer: q.correct_answer || '',
      Explanation: q.Explanation || q.explanation,
      Qn_name: q.Qn_name || q.questionId || q.id || '',
      entered_ans: q.entered_ans || q.entered_answer || '',
    }));
  } catch (error) {
    console.error("Error fetching project MCQ questions:", error);
    throw error;
  }
};

/**
 * Fetches full Coding questions data for a project subtask (with all fields)
 * @param studentId - Student ID
 * @param subtaskId - Subtask ID (required)
 * @returns Promise<any[]> - Full question objects with all fields
 */
export const fetchProjectCodingQuestions = async (
  studentId: string,
  subtaskId: string
): Promise<any[]> => {
  try {
    if (!subtaskId) {
      throw new Error("subtaskId is required for fetching coding questions");
    }

    const projectId = sessionStorage.getItem("currentProjectId");
    const phaseId = sessionStorage.getItem("currentPhaseId");
    const partId = sessionStorage.getItem("currentPartId");
    const taskId = sessionStorage.getItem("currentTaskId");

    if (!projectId || !phaseId || !partId || !taskId) {
      throw new Error("Missing required project IDs in sessionStorage");
    }

    const url = `${process.env.REACT_APP_BACKEND_URL}api/student/project/practice/coding/${studentId}/${projectId}/${phaseId}/${partId}/${taskId}/${subtaskId}/`;
    const response = await getApiClient().get(url);
    
    // Return full question objects as-is from API
    return response.data.questions || [];
  } catch (error) {
    console.error("Error fetching project coding questions:", error);
    throw error;
  }
};

/**
 * Transforms full question objects to simplified CodingQuestion format
 * @param questions - Full question objects from API
 * @returns CodingQuestion[] - Simplified question format
 */
export const transformToCodingQuestions = (questions: any[]): CodingQuestion[] => {
  return questions.map((question: any, index: number) => ({
    id: index + 1,
    question: question.Qn || question.question,
    score: question.score || "0/10",
    isSolved: question.status || false,
    Qn: question.Qn || question.question,
    status: question.status || false,
    level: question.level,
    editor: question.editor,
  }));
};

