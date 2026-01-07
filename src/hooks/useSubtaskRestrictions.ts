import { useState, useCallback, useMemo } from "react";

interface LessonStatusResponse {
  status: boolean | string;
  message?: string;
  not_completed_questions?: any;
}

interface UseSubtaskRestrictionsOptions {
  onAccessDenied?: (message: string) => void;
  updateLessonStatus: (subtaskId: string, status: boolean) => Promise<LessonStatusResponse | null>;
}

/**
 * Custom hook to manage subtask access restrictions
 * Centralizes all logic for determining which subtasks are accessible
 * Uses a single storage key "highestAllowedSubtask" for all tasks
 */
export const useSubtaskRestrictions = ({
  onAccessDenied,
  updateLessonStatus,
}: UseSubtaskRestrictionsOptions) => {
  // Use single storage key for all tasks (not task-specific)
  const STORAGE_KEY = "highestAllowedSubtask";
  
  // Always use the same storage key (not task-specific)
  const storageKey = useMemo(() => STORAGE_KEY, []);

  // Get highest allowed subtask index from sessionStorage
  const getHighestAllowedIndex = useCallback((): number => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (!stored) return 0;
      
      // Parse and validate the stored value
      const parsed = parseInt(stored, 10);
      
      // Check if parsing resulted in NaN or invalid number
      if (isNaN(parsed) || !isFinite(parsed)) {
        sessionStorage.removeItem(storageKey);
        return 0;
      }
      
      // Ensure non-negative and reasonable (cap at 1000 to prevent abuse)
      return Math.max(0, Math.min(1000, Math.floor(parsed)));
    } catch (error) {
      console.error("Error reading highest allowed subtask index:", error);
      // If sessionStorage is unavailable (e.g., private browsing), return 0
      return 0;
    }
  }, [storageKey]);

  // State for highest allowed subtask index
  const [highestAllowedIndex, setHighestAllowedIndexState] = useState<number>(() => 
    getHighestAllowedIndex()
  );

  // Set highest allowed subtask index
  // IMPORTANT: This should only increase or stay the same, never decrease
  // This ensures that once a user has access to a subtask, they don't lose that access
  const setHighestAllowedIndex = useCallback((index: number) => {
    try {
      // Validate index is a number and non-negative
      if (typeof index !== 'number' || isNaN(index)) {
        return;
      }
      
      const validIndex = Math.max(0, Math.min(1000, Math.floor(index))); // Ensure integer, non-negative, and reasonable max
      const currentHighest = getHighestAllowedIndex();
      
      // Only update if the new index is greater than or equal to the current value
      // This prevents the index from decreasing when navigating
      if (validIndex >= currentHighest) {
        try {
          sessionStorage.setItem(storageKey, validIndex.toString());
          setHighestAllowedIndexState(validIndex);
        } catch (error: any) {
          // Handle sessionStorage quota exceeded or other errors
          // Still update state even if sessionStorage fails
          setHighestAllowedIndexState(validIndex);
        }
      }
    } catch (error) {
      console.error("Error setting highest allowed subtask index:", error);
      // On error, don't update - preserve current state
    }
  }, [storageKey, getHighestAllowedIndex]);

  // Clear restrictions (called when task changes)
  // IMPORTANT: This should only be called when switching tasks, not during navigation
  const clearRestrictions = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
      setHighestAllowedIndexState(0);
    } catch (error) {
      console.error("Error clearing subtask restrictions:", error);
      // Even if sessionStorage fails, reset state
      setHighestAllowedIndexState(0);
    }
  }, [storageKey]);

  // Check if a subtask index is accessible
  const isSubtaskAccessible = useCallback((index: number, currentIndex?: number): boolean => {
    // Validate index is a valid number
    if (typeof index !== 'number' || isNaN(index) || index < 0 || !isFinite(index)) {
      return false;
    }
    
    // Current subtask is always accessible
    if (currentIndex !== undefined && index === currentIndex) {
      return true;
    }
    
    // Check against highest allowed index
    return index <= highestAllowedIndex;
  }, [highestAllowedIndex]);

  // Validate and check subtask access via API
  const checkSubtaskAccess = useCallback(async (
    subtaskId: string,
    index: number,
    status: boolean = false,
    currentIndex?: number
  ): Promise<{ allowed: boolean; message?: string }> => {
    // First check local restriction (allow current and previous subtasks)
    if (!isSubtaskAccessible(index, currentIndex)) {
      return {
        allowed: false,
        message: "You must complete previous subtasks before accessing this one.",
      };
    }

    // Then check via API
    try {
      const response = await updateLessonStatus(subtaskId, status);
      
      if (!response) {
        // If no response, allow access (fallback behavior)
        return { allowed: true };
      }

      const isStatusFalse = response.status === false || response.status === "false";
      
      if (isStatusFalse) {
        return {
          allowed: false,
          message: response.message || "This subtask cannot be accessed at this time.",
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error("Error checking subtask access:", error);
      // On error, allow access (fallback behavior)
      return { allowed: true };
    }
  }, [isSubtaskAccessible, updateLessonStatus]);

  // Complete current subtask and unlock next
  const completeSubtask = useCallback(async (
    currentSubtaskId: string,
    currentIndex: number,
    nextIndex: number
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      // Validate indices
      if (typeof currentIndex !== 'number' || typeof nextIndex !== 'number' || 
          isNaN(currentIndex) || isNaN(nextIndex) || nextIndex < 0) {
        return { success: false, message: "Invalid subtask indices." };
      }

      const response = await updateLessonStatus(currentSubtaskId, true);
      
      if (!response) {
        // If no response, still unlock next subtask (fallback behavior)
        setHighestAllowedIndex(nextIndex);
        return { success: true };
      }

      const isStatusFalse = response.status === false || response.status === "false";
      const isStatusTrue = response.status === true || response.status === "true";

      if (isStatusTrue) {
        // Unlock next subtask
        setHighestAllowedIndex(nextIndex);
        return { success: true };
      }

      if (isStatusFalse) {
        // Even if status is false, if user has already accessed nextIndex, allow it
        // This handles edge case where API says no but user already has access
        const currentHighest = getHighestAllowedIndex();
        if (nextIndex <= currentHighest) {
          // User already has access, allow navigation
          return { success: true };
        }
        
        return {
          success: false,
          message: response.message || "This subtask cannot be completed yet.",
        };
      }

      // Default: allow and unlock
      setHighestAllowedIndex(nextIndex);
      return { success: true };
    } catch (error) {
      console.error("Error completing subtask:", error);
      // On error, check if user already has access to nextIndex
      const currentHighest = getHighestAllowedIndex();
      if (nextIndex <= currentHighest) {
        return { success: true }; // User already has access, allow navigation
      }
      return { success: true }; // Fallback: allow (better UX than blocking)
    }
  }, [updateLessonStatus, setHighestAllowedIndex, getHighestAllowedIndex]);

  // Initialize highest allowed index (e.g., on component mount)
  const initializeHighestAllowed = useCallback((initialIndex: number) => {
    const current = getHighestAllowedIndex();
    const newIndex = Math.max(current, initialIndex);
    if (newIndex > current) {
      setHighestAllowedIndex(newIndex);
    }
  }, [getHighestAllowedIndex, setHighestAllowedIndex]);

  return {
    highestAllowedIndex,
    setHighestAllowedIndex,
    clearRestrictions,
    isSubtaskAccessible,
    checkSubtaskAccess,
    completeSubtask,
    initializeHighestAllowed,
  };
};

