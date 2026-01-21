/**
 * Utility functions for Ace Editor components
 */

/**
 * Resets the undo manager for an Ace Editor instance
 * This ensures no undo history from previous questions is retained
 * 
 * @param editor - The Ace Editor instance
 */
export const resetEditorUndoManager = (editor: any): void => {
  if (!editor) return;
  
  try {
    const session = editor.getSession();
    
    // Create a completely new undo manager to ensure no history from previous questions
    const UndoManager = (window as any).ace.require("ace/undomanager").UndoManager;
    const newUndoManager = new UndoManager();
    
    // Set merge delay to 0 for character-by-character undo
    if (typeof newUndoManager.setMergeDelay === 'function') {
      newUndoManager.setMergeDelay(0);
    }
    
    // Set merge interval property if available
    if ('mergeInterval' in newUndoManager) {
      newUndoManager.mergeInterval = 0;
    }
    
    // Clear any existing undo/redo stack
    if (typeof newUndoManager.reset === 'function') {
      newUndoManager.reset();
    }
    
    // Replace the session's undo manager with the new one
    session.setUndoManager(newUndoManager);
    
    // Mark the document as clean to prevent undo history accumulation (if method exists)
    if (typeof session.markClean === 'function') {
      session.markClean();
    }
  } catch (error) {
    console.error('Error resetting undo manager:', error);
  }
};

