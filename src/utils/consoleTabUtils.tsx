import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * useConsoleTab Hook
 * Extracted logic for console.log tab functionality
 * 
 * Handles:
 * - Console log capture from iframe via postMessage
 * - Console logs state management
 * - Console tab refresh logic
 * - Console capture script generation and injection
 */
export const useConsoleTab = ({
  activeSection,
  srcCode,
  questionId
}: {
  activeSection: string;
  srcCode: string;
  questionId?: string;
}) => {
  const [consoleLogs, setConsoleLogs] = useState<Array<{
    id: number;
    level: string;
    message: string;
    timestamp: string;
    args?: any[];
  }>>([]);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentExecutionIdRef = useRef<string>('');
  const messageSequenceRef = useRef<number>(0);
  const processedMessageIdsRef = useRef<Set<string>>(new Set());

  // Generate unique execution ID
  const generateExecutionId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Force refresh iframe by updating key
  const forceRefreshIframe = useCallback(() => {
    // Use existing execution ID if available, otherwise generate new one
    if (!currentExecutionIdRef.current) {
      currentExecutionIdRef.current = generateExecutionId();
    }
    messageSequenceRef.current = 0;
    setIframeKey(prev => prev + 1);
  }, [generateExecutionId]);

  // Clear console logs when switching questions or sections
  useEffect(() => {
    if (activeSection !== 'console') {
      setConsoleLogs([]);
      currentExecutionIdRef.current = '';
      messageSequenceRef.current = 0;
      processedMessageIdsRef.current.clear();
    }
  }, [questionId, activeSection]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Console tab refresh - simple approach
  useEffect(() => {
    if (activeSection === 'console' && srcCode) {
      // Clear console logs and reset sequence when switching to console tab or when code changes
      setConsoleLogs([]);
      messageSequenceRef.current = 0;
      processedMessageIdsRef.current.clear();
      
      // Generate new execution ID immediately
      currentExecutionIdRef.current = generateExecutionId();
      
      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      // Force refresh by updating iframe key (this will use the already-generated execution ID)
      refreshTimeoutRef.current = setTimeout(() => {
        forceRefreshIframe();
      }, 100);
    }
  }, [activeSection, srcCode, forceRefreshIframe, generateExecutionId]);

  // Listen for console messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'console') {
        const { level, message, timestamp, args, executionId, sequence } = event.data;
        
        // Only accept messages when we're in console section
        if (activeSection !== 'console') {
          return;
        }
        
        // Only accept messages from current execution if execution ID is provided
        if (executionId && currentExecutionIdRef.current) {
          if (executionId !== currentExecutionIdRef.current) {
            return; // Ignore messages from old/previous iframe executions
          }
        }
        
        // Create unique message ID to prevent exact duplicates
        const messageId = `${executionId || ''}-${sequence !== undefined ? sequence : timestamp}-${message}`;
        
        // Check if we've already processed this exact message
        if (processedMessageIdsRef.current.has(messageId)) {
          return; // Duplicate message, ignore
        }
        
        // Mark message as processed
        processedMessageIdsRef.current.add(messageId);
        
        // Clean up old message IDs (keep only last 1000 to prevent memory leak)
        if (processedMessageIdsRef.current.size > 1000) {
          const idsArray = Array.from(processedMessageIdsRef.current);
          processedMessageIdsRef.current = new Set(idsArray.slice(-500));
        }
        
        // Check sequence number to prevent duplicates (only if both are provided)
        if (sequence !== undefined && executionId === currentExecutionIdRef.current) {
          // Only reject if sequence is significantly behind (more than 1 message)
          // This allows for slight out-of-order delivery
          if (sequence < messageSequenceRef.current - 1) {
            return; // Very old message, ignore
          }
          messageSequenceRef.current = Math.max(messageSequenceRef.current, sequence);
        }
        
        // Add new console log - allow all calls, even if message content is the same
        setConsoleLogs(prev => {
          const newLog = {
            id: Date.now() + Math.random(),
            level,
            message,
            timestamp,
            args
          };
          
          return [...prev, newLog];
        });
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => window.removeEventListener('message', handleMessage);
  }, [activeSection]);

  /**
   * Generates console capture script to inject into HTML
   * This script overrides console methods and sends messages to parent window
   */
  const generateConsoleCaptureScript = useCallback(() => {
    return `
      <script>
        (function() {
          // Ensure we only set up once per page load
          if (window.consoleCaptureSetup) return;
          window.consoleCaptureSetup = true;
          
          // Additional check to prevent multiple executions
          if (window.consoleCaptureInitialized) return;
          window.consoleCaptureInitialized = true;
          
          // Store original console methods
          const originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            info: console.info,
            debug: console.debug
          };
          
          function captureConsole(level, args) {
            try {
              const timestamp = new Date().toLocaleTimeString();
              const message = Array.from(args).map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
              ).join(' ');
              
              // Send to parent window
              if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                  type: 'console',
                  level: level,
                  message: message,
                  timestamp: timestamp,
                  args: Array.from(args)
                }, '*');
              }
            } catch (e) {
              // Fallback if JSON.stringify fails
              if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                  type: 'console',
                  level: level,
                  message: String(args),
                  timestamp: new Date().toLocaleTimeString(),
                  args: []
                }, '*');
              }
            }
          }
          
          // Override console methods
          console.log = function(...args) {
            originalConsole.log.apply(console, args);
            captureConsole('log', args);
          };
          
          console.warn = function(...args) {
            originalConsole.warn.apply(console, args);
            captureConsole('warn', args);
          };
          
          console.error = function(...args) {
            originalConsole.error.apply(console, args);
            captureConsole('error', args);
          };
          
          console.info = function(...args) {
            originalConsole.info.apply(console, args);
            captureConsole('info', args);
          };
          
          console.debug = function(...args) {
            originalConsole.debug.apply(console, args);
            captureConsole('debug', args);
          };
        })();
      </script>
    `;
  }, []);

  /**
   * Injects console capture script into HTML content
   * @param {string} htmlContent - The HTML content to inject script into
   * @returns {string} - HTML content with console capture script injected
   */
  const injectConsoleCaptureScript = useCallback((htmlContent: string) => {
    if (!htmlContent) return htmlContent;

    const consoleCaptureScript = generateConsoleCaptureScript();
    
    // Insert console capture script into head
    if (htmlContent.includes('<head>')) {
      return htmlContent.replace('<head>', '<head>' + consoleCaptureScript);
    } else if (htmlContent.includes('<!DOCTYPE') || htmlContent.includes('<html')) {
      // If there's no head tag, try to add it before html tag
      if (htmlContent.includes('<html>')) {
        return htmlContent.replace('<html>', '<html><head>' + consoleCaptureScript + '</head>');
      } else {
        return consoleCaptureScript + htmlContent;
      }
    } else {
      return consoleCaptureScript + htmlContent;
    }
  }, [generateConsoleCaptureScript]);

  /**
   * Clears all console logs
   */
  const clearConsoleLogs = useCallback(() => {
    setConsoleLogs([]);
    processedMessageIdsRef.current.clear();
  }, []);

  return {
    consoleLogs,
    clearConsoleLogs,
    injectConsoleCaptureScript,
    forceRefreshIframe,
    iframeKey,
    iframeRef,
    currentExecutionId: currentExecutionIdRef.current
  };
};

/**
 * ConsoleTabContent Component
 * Renders the console tab content area
 */
export const ConsoleTabContent: React.FC<{
  activeSection: string;
  srcCode: string;
  consoleLogs: Array<{
    id: number;
    level: string;
    message: string;
    timestamp: string;
    args?: any[];
  }>;
  clearConsoleLogs: () => void;
  iframeKey: number;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  currentExecutionId?: string;
}> = ({
  activeSection,
  srcCode,
  consoleLogs,
  clearConsoleLogs,
  iframeKey,
  iframeRef,
  currentExecutionId
}) => {
  // Generate console preview URL with console capture script injected
  // Must be defined before conditional return to follow React Hook rules
  const generateConsolePreviewUrl = useCallback((htmlContent: string, execId?: string): string => {
    // Use provided execution ID or generate a new one
    const executionId = execId || Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    const consoleCaptureScript = `
      <script>
        (function() {
          // Reset capture flags for each new iframe load
          if (window.consoleCaptureExecutionId && window.consoleCaptureExecutionId !== '${executionId}') {
            window.consoleCaptureSetup = false;
            window.consoleCaptureInitialized = false;
          }
          
          if (window.consoleCaptureSetup) return;
          window.consoleCaptureSetup = true;
          window.consoleCaptureExecutionId = '${executionId}';
          
          if (window.consoleCaptureInitialized) return;
          window.consoleCaptureInitialized = true;
          
          // Store original console methods
          const originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            info: console.info,
            debug: console.debug
          };
          
          // Track message sequence number
          let messageSequence = 0;
          
          function captureConsole(level, args) {
            messageSequence++;
            try {
              const timestamp = new Date().toLocaleTimeString();
              
              // Better message formatting - preserve all characters correctly
              let message = '';
              try {
                message = Array.from(args).map(arg => {
                  if (arg === null) return 'null';
                  if (arg === undefined) return 'undefined';
                  if (typeof arg === 'string') return arg;
                  if (typeof arg === 'object') {
                    try {
                      return JSON.stringify(arg, null, 2);
                    } catch (e) {
                      return String(arg);
                    }
                  }
                  return String(arg);
                }).join(' ');
              } catch (e) {
                message = String(args);
              }
              
              // Send all console calls, even if message content is the same
              if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                  type: 'console',
                  level: level,
                  message: message,
                  timestamp: timestamp,
                  args: Array.from(args).map(a => {
                    try {
                      return typeof a === 'object' ? JSON.stringify(a) : String(a);
                    } catch {
                      return String(a);
                    }
                  }),
                  executionId: '${executionId}',
                  sequence: messageSequence
                }, '*');
              }
            } catch (e) {
              // Fallback if anything fails
              if (window.parent && window.parent !== window) {
                try {
                  window.parent.postMessage({
                    type: 'console',
                    level: level,
                    message: args.map(a => String(a)).join(' '),
                    timestamp: new Date().toLocaleTimeString(),
                    args: [],
                    executionId: '${executionId}',
                    sequence: messageSequence
                  }, '*');
                } catch (err) {
                  // Last resort - send simple string
                  window.parent.postMessage({
                    type: 'console',
                    level: level,
                    message: '[Error formatting message]',
                    timestamp: new Date().toLocaleTimeString(),
                    args: [],
                    executionId: '${executionId}',
                    sequence: messageSequence
                  }, '*');
                }
              }
            }
          }
          
          console.log = function(...args) {
            originalConsole.log.apply(console, args);
            captureConsole('log', args);
          };
          
          console.warn = function(...args) {
            originalConsole.warn.apply(console, args);
            captureConsole('warn', args);
          };
          
          console.error = function(...args) {
            originalConsole.error.apply(console, args);
            captureConsole('error', args);
          };
          
          console.info = function(...args) {
            originalConsole.info.apply(console, args);
            captureConsole('info', args);
          };
          
          console.debug = function(...args) {
            originalConsole.debug.apply(console, args);
            captureConsole('debug', args);
          };
        })();
      </script>
    `;
    
    let processedHtml = htmlContent;
    if (processedHtml.includes('<head>')) {
      processedHtml = processedHtml.replace('<head>', '<head>' + consoleCaptureScript);
    } else if (processedHtml.includes('<html>')) {
      processedHtml = processedHtml.replace('<html>', '<html><head>' + consoleCaptureScript + '</head>');
    } else {
      processedHtml = consoleCaptureScript + processedHtml;
    }
    
    return `data:text/html;charset=utf-8,${encodeURIComponent(processedHtml)}`;
  }, []);

  const consolePreviewUrl = useMemo(() => {
    return srcCode ? generateConsolePreviewUrl(srcCode, currentExecutionId) : '';
  }, [srcCode, generateConsolePreviewUrl, currentExecutionId]);

  if (activeSection !== 'console') {
    return null;
  }

  return (
    <div style={{ flex: 1, maxHeight: "90%", display: "flex", flexDirection: "column" }}>
      {/* Hidden iframe for console capture - only when in console tab */}
      {consolePreviewUrl && (
        <iframe
          ref={iframeRef}
          key={`console-${iframeKey}`}
          src={consolePreviewUrl}
          title="Console Preview"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: -1
          }}
          sandbox="allow-scripts allow-same-origin"
        />
      )}
      <div 
        style={{ 
          flex: 1, 
          minHeight: 0, 
          position: 'relative', 
          overflow: 'hidden',
          backgroundColor: '#1e1e1e'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflowY: 'auto', 
            color: '#d4d4d4',
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            fontSize: '13px',
            padding: '10px'
          }}
        >
        {consoleLogs.length === 0 ? (
          <div className="text-center text-muted p-4">
            <p className="mb-0">No console output yet</p>
            <small>Console logs from your HTML/JavaScript code will appear here</small>
          </div>
        ) : (
          consoleLogs.map((log) => (
            <div key={log.id} className="mb-2 d-flex align-items-start">
              <span 
                style={{ 
                  wordBreak: 'break-word',
                  color: log.level === 'error' ? '#f48771' : 
                         log.level === 'warn' ? '#dcdcaa' : 
                         '#d4d4d4'
                }}
              >
                {log.message}
              </span>
            </div>
          ))
        )}
        </div>
      </div>
    </div>
  );
};

