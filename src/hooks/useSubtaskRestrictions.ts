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
      return stored ? Math.max(0, parseInt(stored, 10)) : 0;
    } catch (error) {
      console.error("Error reading highest allowed subtask index:", error);
      return 0;
    }
  }, [storageKey]);

  // State for highest allowed subtask index
  const [highestAllowedIndex, setHighestAllowedIndexState] = useState<number>(() => 
    getHighestAllowedIndex()
  );

  // Set highest allowed subtask index
  // IMPORTANT: Only update if new index is greater than current value
  // This prevents reducing the value for completed tasks when navigating between subtasks
  const setHighestAllowedIndex = useCallback((index: number) => {
    try {
      const validIndex = Math.max(0, index);
      // Use functional update to get current state value
      setHighestAllowedIndexState((currentIndex) => {
        // Only update if new index is greater than current (prevents reduction for completed tasks)
        const newIndex = Math.max(currentIndex, validIndex);
        sessionStorage.setItem(storageKey, newIndex.toString());
        return newIndex;
      });
    } catch (error) {
      console.error("Error setting highest allowed subtask index:", error);
    }
  }, [storageKey]);

  // Clear restrictions (called when task changes)
  const clearRestrictions = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
      setHighestAllowedIndexState(0);
    } catch (error) {
      console.error("Error clearing subtask restrictions:", error);
    }
  }, [storageKey]);

  // Check if a subtask index is accessible
  const isSubtaskAccessible = useCallback((index: number, currentIndex?: number): boolean => {
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
      const response = await updateLessonStatus(currentSubtaskId, true);
      
      if (!response) {
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
      return { success: true }; // Fallback: allow
    }
  }, [updateLessonStatus, setHighestAllowedIndex]);

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

