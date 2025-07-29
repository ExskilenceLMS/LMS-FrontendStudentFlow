/**
 * Optimized session storage cleanup utilities
 */

// Define all test-related session keys for easy maintenance
export const TEST_SESSION_KEYS = {
  // Timer related
  TIMER: "timer",
  TEST_DURATION: "testDuration", 
  TIME: "time",
  
  // Test data
  TEST_SECTION_DATA: "testSectionData",
  SQL_TABLES: "sqlTables",
  
  // Question indices
  MCQ_CURRENT_QUESTION_INDEX: "mcqCurrentQuestionIndex",
  CODING_CURRENT_QUESTION_INDEX: "codingCurrentQuestionIndex",
} as const;

// Define key patterns for dynamic cleanup
export const TEST_SESSION_PATTERNS = {
  USER_ANSWER: "userAnswer_",
  USER_CODE: "userCode_", 
  STATUS: "status_",
} as const;

/**
 * Optimized function to clean up all test-related session storage
 * @param testId - Optional test ID for question status cleanup
 */
export const cleanupTestSessionData = (testId?: string): void => {
  try {
    // 1. Remove specific known keys (fastest)
    Object.values(TEST_SESSION_KEYS).forEach(key => {
      sessionStorage.removeItem(key);
    });

    // 2. Remove question status if testId provided
    if (testId) {
      sessionStorage.removeItem(`${testId}_questionStatus`);
    }

    // 3. Single pass through sessionStorage to find pattern-based keys
    const keysToRemove: string[] = [];
    
    // Use Object.keys() for better performance than manual loop
    const allKeys = Object.keys(sessionStorage);
    
    allKeys.forEach(key => {
      // Check all patterns in one pass
      if (
        key.startsWith(TEST_SESSION_PATTERNS.USER_ANSWER) ||
        key.startsWith(TEST_SESSION_PATTERNS.USER_CODE) ||
        key.startsWith(TEST_SESSION_PATTERNS.STATUS)
      ) {
        keysToRemove.push(key);
      }
    });

    // 4. Batch remove all found keys
    keysToRemove.forEach(key => sessionStorage.removeItem(key));


    
  } catch (error) {
    console.error("Error during test session cleanup:", error);
  }
};

/**
 * Clean up only specific types of session data
 * @param types - Array of cleanup types
 * @param testId - Optional test ID
 */
export const cleanupSpecificSessionData = (
  types: Array<'timer' | 'testData' | 'questions' | 'userData'>,
  testId?: string
): void => {
  try {
    if (types.includes('timer')) {
      Object.values(TEST_SESSION_KEYS).forEach(key => {
        if (key.includes('timer') || key.includes('time') || key.includes('duration')) {
          sessionStorage.removeItem(key);
        }
      });
    }

    if (types.includes('testData')) {
      sessionStorage.removeItem(TEST_SESSION_KEYS.TEST_SECTION_DATA);
      sessionStorage.removeItem(TEST_SESSION_KEYS.SQL_TABLES);
    }

    if (types.includes('questions')) {
      sessionStorage.removeItem(TEST_SESSION_KEYS.MCQ_CURRENT_QUESTION_INDEX);
      sessionStorage.removeItem(TEST_SESSION_KEYS.CODING_CURRENT_QUESTION_INDEX);
      if (testId) {
        sessionStorage.removeItem(`${testId}_questionStatus`);
      }
    }

    if (types.includes('userData')) {
      const allKeys = Object.keys(sessionStorage);
      const userDataKeys = allKeys.filter(key => 
        key.startsWith(TEST_SESSION_PATTERNS.USER_ANSWER) ||
        key.startsWith(TEST_SESSION_PATTERNS.USER_CODE) ||
        key.startsWith(TEST_SESSION_PATTERNS.STATUS)
      );
      
      userDataKeys.forEach(key => sessionStorage.removeItem(key));
    }


    
  } catch (error) {
    console.error("Error during specific session cleanup:", error);
  }
}; 