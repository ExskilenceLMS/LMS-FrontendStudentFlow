/**
 * Auto-save utility functions for code editors
 * Provides reusable auto-save functionality across different editor components
 */

import { getApiClient } from './apiAuth';

export const getAutoSavedCode = async (
  questionId: string,
  studentId: string,
  doneAt: string,
  baseUrl: string
): Promise<string | null> => {
  try {
    const url = `${baseUrl}api/student/autosave-questions/${studentId}/${questionId}/${doneAt}`;
    
    const apiClient = getApiClient();
    const response = await apiClient.get(url);

    if (response.status === 200) {
      const data = response.data;
      return data.code || null;
    } else if (response.status === 404) {
      // No auto-saved code found for this question
      return null;
    } else {
      console.error('Failed to retrieve auto-saved code:', response.status);
      return null;
    }
  } catch (error: any) {
    if (error.response?.status === 404) {
      // No auto-saved code found for this question
      return null;
    }
    // Silently handle errors - don't show to user
    console.error('Error retrieving auto-saved code:', error);
    return null;
  }
};

export const autoSaveCode = async (
  code: string, 
  questionId: string, 
  studentId: string, 
  doneAt: string,
  baseUrl: string
): Promise<void> => {
  try {
    const url = `${baseUrl}api/student/autosave-questions/`;
    const payload = {
      student_id: studentId,
      code: code,
      question_id: questionId, 
      question_done_at: doneAt
    };

    // Make the auto-save call asynchronously without waiting for response
    const apiClient = getApiClient();
    apiClient.post(url, payload).catch(error => {
      // Silently handle errors for auto-save - don't show to user
      console.error('Auto-save failed:', error);
    });
  } catch (error) {
    // Silently handle errors for auto-save - don't show to user
    console.error('Auto-save failed:', error);
  }
};


export const autoSaveAfterSubmission = async (
  code: string, 
  questionId: string, 
  studentId: string, 
  doneAt: string,
  baseUrl: string
): Promise<void> => {
  try {
    const url = `${baseUrl}api/student/autosave-questions/${studentId}/${questionId}/${doneAt}`;

    // Make the auto-save call asynchronously without waiting for response
    // Using DELETE method as specified by the API endpoint
    const apiClient = getApiClient();
    apiClient.delete(url).catch(error => {
      // Silently handle errors for auto-save - don't show to user
      console.error('Auto-save after submission failed:', error);
    });
  } catch (error) {
    // Silently handle errors for auto-save - don't show to user
    console.error('Auto-save after submission failed:', error);
  }
};

// HTML/CSS Auto-save functions
export const autoSaveHTMLCode = async (
  code: {[key: string]: string}, 
  questionId: string, 
  studentId: string, 
  doneAt: string,
  baseUrl: string
): Promise<void> => {
  try {
    const url = `${baseUrl}api/student/autosave-questions/`;
    const payload = {
      student_id: studentId,
      question_id: questionId,
      code: code,
      question_done_at: doneAt
    };

    const apiClient = getApiClient();
    apiClient.post(url, payload).catch(error => {
      console.error('Auto-save failed:', error);
    });
  } catch (error) {
    console.error('Auto-save failed:', error);
  }
};

export const getAutoSavedHTMLCode = async (
  questionId: string, 
  studentId: string, 
  doneAt: string,
  baseUrl: string
): Promise<{[key: string]: string} | null> => {
  try {
    const url = `${baseUrl}api/student/autosave-questions/${studentId}/${questionId}/${doneAt}`;
    
    const apiClient = getApiClient();
    const response = await apiClient.get(url);

    if (response.status === 200) {
      const data = response.data;
      return data.code || null;
    } else if (response.status === 404) {
      return null;
    } else {
      console.error('Failed to retrieve auto-saved code:', response.status);
      return null;
    }
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    console.error('Error retrieving auto-saved code:', error);
    return null;
  }
};

export const cleanupAutoSavedHTMLCode = async (
  questionId: string, 
  studentId: string, 
  doneAt: string,
  baseUrl: string
): Promise<void> => {
  try {
    const url = `${baseUrl}api/student/autosave-questions/${studentId}/${questionId}/${doneAt}`;
    const apiClient = getApiClient();
    apiClient.delete(url).catch(error => {
      console.error('Auto-save cleanup failed:', error);
    });
  } catch (error) {
    console.error('Auto-save cleanup failed:', error);
  }
};