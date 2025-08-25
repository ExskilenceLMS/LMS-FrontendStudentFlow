/**
 * Auto-save utility functions for code editors
 * Provides reusable auto-save functionality across different editor components
 */

export const getAutoSavedCode = async (
  questionId: string,
  studentId: string,
  baseUrl: string
): Promise<string | null> => {
  try {
    const url = `${baseUrl}api/student/autosave-questions/${studentId}/${questionId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.code || null;
    } else if (response.status === 404) {
      // No auto-saved code found for this question
      return null;
    } else {
      console.error('Failed to retrieve auto-saved code:', response.status);
      return null;
    }
  } catch (error) {
    // Silently handle errors - don't show to user
    console.error('Error retrieving auto-saved code:', error);
    return null;
  }
};

export const autoSaveCode = async (
  code: string, 
  questionId: string, 
  studentId: string, 
  baseUrl: string
): Promise<void> => {
  try {
    const url = `${baseUrl}api/student/autosave-questions/`;
    const payload = {
      student_id: studentId,
      code: code,
      question_id: questionId
    };

    // Make the auto-save call asynchronously without waiting for response
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }).catch(error => {
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
  baseUrl: string
): Promise<void> => {
  try {
    const url = `${baseUrl}api/student/autosave-questions/${studentId}/${questionId}`;

    // Make the auto-save call asynchronously without waiting for response
    // Using DELETE method as specified by the API endpoint
    fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    }).catch(error => {
      // Silently handle errors for auto-save - don't show to user
      console.error('Auto-save after submission failed:', error);
    });
  } catch (error) {
    // Silently handle errors for auto-save - don't show to user
    console.error('Auto-save after submission failed:', error);
  }
};
