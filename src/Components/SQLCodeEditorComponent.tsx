import React, { useState, useEffect } from "react";
import AceEditor from "react-ace";
import { getApiClient } from "../utils/apiAuth";
import { useAPISWR } from "../utils/swrConfig";
import { resetEditorUndoManager } from "../utils/editorUtils";
import { reorderExpectedOutput } from "../utils/expectedOutputUtils";
import "ace-builds/src-noconflict/mode-sql";
import "ace-builds/src-noconflict/theme-dreamweaver";
import { secretKey } from "../constants";
import CryptoJS from "crypto-js";
import { autoSaveCode, autoSaveAfterSubmission, getAutoSavedCode } from "../utils/autoSaveUtils";
import { SUBJECT_ROADMAP } from "../constants/constants";
import "../SQLEditor.css";

interface Data {
  [key: string]: any;
}

interface TestCase {
  [key: string]: string;
}

interface Question {
  Qn_name: string;
  entered_ans: string;
  score: string;
  status: boolean;
  Qn: string;
  Ans: string;
  QNty: string;
  QnTe: string;
  QnTy: string;
  Tags: string[];
  test: any[];
  Hints: any[];
  Level: string;
  Table: string;
  Examples: any[];
  Template: string;
  ConceptID: string;
  CreatedBy: string;
  CreatedON: string;
  TestCases: TestCase[];
  LastUpdated: string;
  MultiSelect: string;
  Explanations: any[];
  FunctionCall: string;
  QuestionType: string;
  topic_id?: string;
  subject_id?: string;
  currentFile?: string;
  subtopic_id?: string;
  Last_Updated_by?: string;
  level?: string;
  Query?: string;
  ExpectedOutput?: Data[];
  Tables?: { tab_name: string; data: Data[] }[];
  question_id?: string;
}

interface SQLCodeEditorComponentProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  onNext: () => void;
  onQuestionChange: (index: number) => void;
}

const SQLCodeEditorComponent: React.FC<SQLCodeEditorComponentProps> = ({
  question,
  questionIndex,
  totalQuestions,
  onNext,
  onQuestionChange,
}) => {
  const isTestingContext = window.location.pathname.includes('/testing/coding/');
  const isTestFlowContext = window.location.pathname.includes('/test/coding');
  
  // Session storage data
  const encryptedStudentId = sessionStorage.getItem('StudentId');
  const decryptedStudentId = encryptedStudentId ? CryptoJS.AES.decrypt(encryptedStudentId, secretKey).toString(CryptoJS.enc.Utf8) : "";
  const studentId = decryptedStudentId;
  
  const encryptedSubjectId = sessionStorage.getItem('SubjectId');
  const decryptedSubjectId = encryptedSubjectId ? CryptoJS.AES.decrypt(encryptedSubjectId, secretKey).toString(CryptoJS.enc.Utf8) : "";
  const subjectId = decryptedSubjectId;
  
  const encryptedSubject = sessionStorage.getItem('Subject');
  const decryptedSubject = encryptedSubject ? CryptoJS.AES.decrypt(encryptedSubject, secretKey).toString(CryptoJS.enc.Utf8) : "";
  const subject = decryptedSubject;
  
  const encryptedWeekNumber = sessionStorage.getItem('WeekNumber');
  const decryptedWeekNumber = encryptedWeekNumber ? CryptoJS.AES.decrypt(encryptedWeekNumber, secretKey).toString(CryptoJS.enc.Utf8) : "";
  const weekNumber = decryptedWeekNumber;
  
  const encryptedDayNumber = sessionStorage.getItem('DayNumber');
  const decryptedDayNumber = encryptedDayNumber ? CryptoJS.AES.decrypt(encryptedDayNumber, secretKey).toString(CryptoJS.enc.Utf8) : "";
  const dayNumber = decryptedDayNumber;
  
  const courseId = sessionStorage.getItem('CourseId') ? CryptoJS.AES.decrypt(sessionStorage.getItem('CourseId')!, secretKey).toString(CryptoJS.enc.Utf8) : "";

  // Use SWR for tables API
  const tablesUrl = `${process.env.REACT_APP_BACKEND_URL}api/student/practicecoding/tables/`;
  const { data: tablesData } = useAPISWR<{ tables: any[] }>(tablesUrl);

  // State management
  const [sqlQuery, setSqlQuery] = useState<string>("");
  const [tableData, setTableData] = useState<Data[]>([]);
  const [expectedOutput, setExpectedOutput] = useState<Data[]>([]);
  const [activeTab, setActiveTab] = useState<string>("table");
  const [runResponseTable, setRunResponseTable] = useState<Data[]>([]);
  const [runResponseTestCases, setRunResponseTestCases] = useState<TestCase[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [additionalMessage, setAdditionalMessage] = useState<string>("");
  const [processing, setProcessing] = useState<boolean>(false);
  const [status, setStatus] = useState<boolean>(false);
  const [tableName, setTableName] = useState<string>("");
  const [availableTables, setAvailableTables] = useState<{ tab_name: string; data: Data[] }[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [isRunBtnClicked, setIsRunBtnClicked] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [questionResponses, setQuestionResponses] = useState<{[key: string]: any}>({});
  const [lastRunCode, setLastRunCode] = useState<{[key: string]: string}>({});
  const editorRef = React.useRef<any>(null);

  const encryptData = (data: string) => {
    return CryptoJS.AES.encrypt(data, secretKey).toString();
  };

  const decryptData = (encryptedData: string) => {
    const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  };

  const getUserCodeKey = (qnName: string) => {
    if (isTestFlowContext) {
      const encryptedTestId = sessionStorage.getItem("TestId");
      const testId = encryptedTestId ? decryptData(encryptedTestId) : "";
      return `userCode_${testId}_${qnName}`;
    }
    return `userCode_${subject}_${weekNumber}_${dayNumber}_${qnName}`;
  };

  const tableNames = question?.Table?.split(',').map(name => name.trim()) || [];

  // Initialize question data
  useEffect(() => {
    if (question) {
      setStatus(question.status || false);
      const rawExpectedOutput = question.ExpectedOutput || [];
      const reorderedOutput = reorderExpectedOutput(rawExpectedOutput, question.TestCases || []);
      setExpectedOutput(reorderedOutput);
      
      // Check if we have stored response data for this question
      const questionKey = question.Qn_name;
      const storedResponse = questionResponses[questionKey];
      
      if (storedResponse) {
        // Restore the stored response data
        setRunResponseTable(storedResponse.table || []);
        setRunResponseTestCases(storedResponse.testCases || []);
        setSuccessMessage(storedResponse.successMessage || "");
        setAdditionalMessage(storedResponse.additionalMessage || "");
        setActiveTab("output");
        setIsRunBtnClicked(true);
      } else {
        // Clear response data for new question
        setRunResponseTable([]);
        setRunResponseTestCases([]);
        setSuccessMessage("");
        setAdditionalMessage("");
        setActiveTab("table");
        setIsRunBtnClicked(false);
      }
      
      setProcessing(false);
      
      // Check submission status for test flow (following HTMLCSSCodeEditor pattern)
      if (isTestFlowContext) {
        // Reset submission status first (like HTMLCSSCodeEditor does)
        setIsSubmitted(false);
        setStatus(false);
        
        // Then check session storage
        const testId = decryptData(sessionStorage.getItem("TestId") || "");
        const questionStatusKey = `coding_${question.Qn_name}`;
        const statusSessionKey = `${testId}_questionStatus`;
        const sessionStatus = sessionStorage.getItem(statusSessionKey);
        
        let isQuestionSubmitted = false;
        if (sessionStatus) {
          try {
            const decryptedStatuses = CryptoJS.AES.decrypt(sessionStatus, secretKey).toString(CryptoJS.enc.Utf8);
            const statuses = JSON.parse(decryptedStatuses);
            isQuestionSubmitted = statuses[questionStatusKey] === "Submitted";
          } catch (error) {
            console.error("Error checking submission status:", error);
            isQuestionSubmitted = false;
          }
        }
        
        // Set status based on session storage check (like HTMLCSSCodeEditor)
        if (isQuestionSubmitted || question.status === true) {
          setIsSubmitted(true);
          setStatus(true);
        } else {
          setIsSubmitted(false);
          setStatus(false);
        }
      }
      
      // Load saved code
      const codeKey = getUserCodeKey(question.Qn_name);
      const savedCode = sessionStorage.getItem(codeKey);
      let codeToSet = "";
      
      if (isTestFlowContext) {
        // For test flow: load saved user code, following PythonEditorComponent pattern
        if (savedCode !== null) {
          const decryptedCode = decryptData(savedCode);
          if (decryptedCode) {
            codeToSet = decryptedCode;
            setSqlQuery(codeToSet);
            return;
          }
        }
        
        // If no saved code in session and question is not submitted, try to retrieve auto-saved code from backend
        if (!question.status) {
          const testId = decryptData(sessionStorage.getItem("TestId") || "");
          getAutoSavedCode(question.Qn_name, studentId, testId, process.env.REACT_APP_BACKEND_URL!)
            .then(autoSavedCode => {
              if (autoSavedCode) {
                setSqlQuery(autoSavedCode);
                // Also save to session storage for future use
                const codeKey = getUserCodeKey(question.Qn_name);
                sessionStorage.setItem(codeKey, encryptData(autoSavedCode));
              } else {
                // No autosave found: use entered_ans if it exists (user's previous answer), otherwise empty string
                // Don't use Query or Ans as those are answer templates, not user code
                const enteredAnswer = question.entered_ans || '';
                if (enteredAnswer.trim() !== '') {
                  setSqlQuery(enteredAnswer);
                } else {
                  // New question with no saved code: start with empty string
                  setSqlQuery("");
                }
              }
            })
            .catch(() => {
              // On error: use entered_ans if it exists, otherwise empty string
              const enteredAnswer = question.entered_ans || '';
              if (enteredAnswer.trim() !== '') {
                setSqlQuery(enteredAnswer);
              } else {
                setSqlQuery("");
              }
            });
        } else {
          // Question is already submitted, use entered_ans
          codeToSet = question.entered_ans || "";
          setSqlQuery(codeToSet);
        }
        return;
      }
      
      if (isTestingContext) {
        // For testing context: load answer/template
        codeToSet = question.Ans || question.Query || "";
        setSqlQuery(codeToSet);
        return;
      }
      
      if (savedCode !== null) {
        const decryptedCode = decryptData(savedCode);
        if (decryptedCode) {
          codeToSet = decryptedCode;
        } else {
          codeToSet = question.entered_ans || question.Query || "";
        }
      } else if (!question.status && !isTestingContext) {
        // Try to get auto-saved code from backend (only for practice-coding context)
        getAutoSavedCode(question.Qn_name, studentId, SUBJECT_ROADMAP.PRACTICE, process.env.REACT_APP_BACKEND_URL!)
          .then(autoSavedCode => {
            if (autoSavedCode) {
              setSqlQuery(autoSavedCode);
              // Also save to session storage for future use
              const codeKey = getUserCodeKey(question.Qn_name);
              sessionStorage.setItem(codeKey, encryptData(autoSavedCode));
            } else {
              // Fallback to entered_ans or Query
              const fallbackCode = question.entered_ans || "";
              setSqlQuery(fallbackCode);
            }
          })
          .catch(() => {
            // Fallback to entered_ans or Query on error
            const fallbackCode = question.entered_ans || question.Query || "";
            setSqlQuery(fallbackCode);
          });
        return; // Return early since we're handling async loading
      } else {
        codeToSet = question.entered_ans || question.Query || "";
      }
      setSqlQuery(codeToSet);
      
      // Check submission status
      const statusKey = `submissionStatus_${subject}_${weekNumber}_${dayNumber}_${question.Qn_name}`;
      const submissionStatus = sessionStorage.getItem(statusKey);
      setIsSubmitted(submissionStatus ? decryptData(submissionStatus) === "submitted" : question.status);
    }
  }, [question?.Qn_name, question?.Query, question?.entered_ans, question?.Ans, questionIndex, isTestingContext, isTestFlowContext, subject, weekNumber, dayNumber]);
  
  // Auto-save code when it changes
  useEffect(() => {
    if (question?.Qn_name && sqlQuery) {
      const codeKey = getUserCodeKey(question.Qn_name);
      sessionStorage.setItem(codeKey, encryptData(sqlQuery));
    } else if (question?.Qn_name && sqlQuery === "") {
      // Explicitly clear session storage if sqlQuery becomes empty for a question
      const key = getUserCodeKey(question.Qn_name);
      sessionStorage.removeItem(key);
    }
  }, [sqlQuery, question?.Qn_name]);

  // Initialize tables
  useEffect(() => {
    if (tablesData && tablesData.tables) {
      setAvailableTables(tablesData.tables);
      
      if (question && question.Table) {
        const tableNames = question.Table.split(',').map(name => name.trim());
        
        // Use question-specific tables if available, otherwise fall back to global tables
        const tablesToUse = question.Tables && question.Tables.length > 0 ? question.Tables : tablesData.tables;
        
        if (tableNames.length > 0) {
          const firstTableName = tableNames[0];
          setSelectedTable(firstTableName);
          
          // Find the data for the selected table (case-insensitive)
          const selectedTableData = tablesToUse.find(table => 
            table.tab_name.toLowerCase() === firstTableName.toLowerCase()
          );
          
          if (selectedTableData) {
            setTableData(selectedTableData.data || []);
            setTableName(selectedTableData.tab_name);
          } else {
            setTableData([]);
            setTableName(firstTableName);
          }
        }
      }
    }
  }, [tablesData, question?.Table, question?.Tables, question?.Qn_name, question?.question_id, questionIndex]);

  const handleCodeChange = (newCode: string) => {
    setSqlQuery(newCode);
    
    if (question?.Qn_name) {
      const codeKey = getUserCodeKey(question.Qn_name);
      sessionStorage.setItem(codeKey, encryptData(newCode));
    }
  };

  const onEditorLoad = (editor: any) => {
    editorRef.current = editor;
    // Reset undo manager immediately when editor loads
    resetEditorUndoManager(editor);
    // Also reset after a brief delay to ensure it's fully initialized
    setTimeout(() => {
      resetEditorUndoManager(editor);
    }, 10);
  };

  // Reset undo manager when question index changes
  useEffect(() => {
    // Reset immediately if editor is already loaded
    if (editorRef.current) {
      resetEditorUndoManager(editorRef.current);
    }
    
    // Also reset after a short delay to catch cases where editor loads after state update
    const timer = setTimeout(() => {
      if (editorRef.current) {
        resetEditorUndoManager(editorRef.current);
      }
    }, 50);
    
    return () => clearTimeout(timer);
  }, [questionIndex]);

  const handleRun = async () => {
    if (!sqlQuery.trim()) {
      return;
    }

    setIsRunBtnClicked(true);

    // Save code before running
    if (question?.Qn_name) {
      const codeKey = getUserCodeKey(question.Qn_name);
      sessionStorage.setItem(codeKey, encryptData(sqlQuery));
    }

    setRunResponseTestCases([]);
    setRunResponseTable([]);
    setActiveTab("output");
    setProcessing(true);
    setSuccessMessage("");
    setAdditionalMessage("");

    try {
      setActiveTab("output");
      const updatedSqlQuery = sqlQuery.replace("/*Write a all SQl commands/clauses in UPPERCASE*/", "").replace(/\s*\n\s*/g, " \n ");
      
      const rawExpectedOutput = question.ExpectedOutput || [];
      const reorderedOutput = reorderExpectedOutput(rawExpectedOutput, question.TestCases || []);
      
      // For test flow context, use test-specific API parameters
      const sendData = isTestFlowContext ? {
        student_id: studentId,
        query: updatedSqlQuery,
        ExpectedOutput: reorderedOutput,
        TestCases: question.TestCases || [],
        week_number: 0,
        day_number: 0,
        subject_id: decryptData(sessionStorage.getItem("TestSubjectId") || ""),
        test_id: decryptData(sessionStorage.getItem("TestId") || ""),
        subject: sessionStorage.getItem("TestSubject") || "",
        call_function: "",
        result: runResponseTestCases,
        Qn: question.Qn_name,
      } : {
        student_id: studentId,
        week_number: isTestingContext ? null : weekNumber,
        day_number: isTestingContext ? null : dayNumber,
        subject: subject,
        subject_id: subjectId,
        Qn: question.Qn_name,
        query: updatedSqlQuery,
        ExpectedOutput: reorderedOutput,
        TestCases: question.TestCases || [],
        batch_id: decryptData(sessionStorage.getItem("BatchId") || ""),
      };

      if (updatedSqlQuery) {
        const response = await getApiClient().post(`${process.env.REACT_APP_BACKEND_URL}api/student/coding/sql/`, sendData);
        const responseData = response.data;

        setRunResponseTable(responseData.data || []);
        setRunResponseTestCases(responseData.TestCases || []);

        const resultField = responseData.TestCases?.find((testCase: TestCase) => testCase.Result !== undefined);
        let successMsg = "";
        let additionalMsg = "";
        if (resultField) {
          if (resultField.Result === "True") {
            successMsg = "Congratulations!";
            additionalMsg = "You have passed the test cases. Click the submit code button.";
          } else if (resultField.Result === "False") {
            successMsg = "Wrong Answer";
            additionalMsg = "You have not passed the test cases";
          }
        }
        setSuccessMessage(successMsg);
        setAdditionalMessage(additionalMsg);
        
        // Store response for this question
        const questionKey = question.Qn_name;
        const responseDataToStore = {
          table: responseData.data || [],
          testCases: responseData.TestCases || [],
          successMessage: successMsg,
          additionalMessage: additionalMsg
        };
        
        setQuestionResponses(prev => ({
          ...prev,
          [questionKey]: responseDataToStore
        }));
        
        // Store the code that was run
        setLastRunCode(prev => ({
          ...prev,
          [questionKey]: sqlQuery
        }));
        
        // Auto-save code when it runs
        if (!status && !isTestFlowContext) {
          if (!isTestingContext) {
            // Auto-save in practice mode when code runs and not submitted
            autoSaveCode(sqlQuery, question.Qn_name, studentId, SUBJECT_ROADMAP.PRACTICE, process.env.REACT_APP_BACKEND_URL!);
          }
        } else if (isTestFlowContext && question && !question.status) {
          // Auto-save for test flow
          const testId = decryptData(sessionStorage.getItem("TestId") || "");
          autoSaveCode(sqlQuery, question.Qn_name, studentId, testId, process.env.REACT_APP_BACKEND_URL!);
        }
      } else {
        console.error("SQL query is empty");
      }
    } catch (error: any) {
      setSuccessMessage("Error");
      setAdditionalMessage("There was an error executing the SQL query.");
      console.error("Error fetching sql query data:", error);
    } finally {
      setProcessing(false);
    }
  };
  
  /**
   * Check if submit button should be enabled
   */
  const canSubmitCode = () => {
    if (!question?.Qn_name) {
      return false;
    }
    
    const questionKey = question.Qn_name;
    const storedResponse = questionResponses[questionKey];
    if (!storedResponse) {
      return false; // No run response for this question
    }
    
    const lastRunCodeForQuestion = lastRunCode[questionKey];
    if (!lastRunCodeForQuestion) {
      return false; // No code was run for this question
    }
    
    const currentCode = sqlQuery.trim().replace(/\n/g, " ").replace(/;$/, "");
    const lastRunCodeTrimmed = lastRunCodeForQuestion.trim().replace(/\n/g, " ").replace(/;$/, "");
    
    return currentCode === lastRunCodeTrimmed;
  };

  const handleSubmit = async () => {
    // For test flow context, check if code was run first and matches last run code
    if (isTestFlowContext) {
      if (!canSubmitCode()) {
        setSuccessMessage("Error");
        setAdditionalMessage("Please run your code before submitting.");
        return;
      }
    }

    setProcessing(true);
    setIsSubmitted(true);
    
    try {
      // For test flow context, use test-specific submit endpoint
      if (isTestFlowContext) {
        const testId = decryptData(sessionStorage.getItem("TestId") || "");
        const encryptedCourseId = sessionStorage.getItem('CourseId');
        const courseId = encryptedCourseId ? CryptoJS.AES.decrypt(encryptedCourseId, secretKey).toString(CryptoJS.enc.Utf8) : "course19";
        
        const postData = {
          student_id: studentId,
          test_id: testId,
          question_id: question.Qn_name,
          answer: sqlQuery,
          subject_id: decryptData(sessionStorage.getItem("TestSubjectId") || ""),
          TestCases: question.TestCases || [],
          subject: sessionStorage.getItem("TestSubject") || "",
          final_score: "0/0",
          course_id: courseId,
          result: runResponseTestCases,
          batch_id: decryptData(sessionStorage.getItem("BatchId") || ""),
        };

        const response = await getApiClient().put(`${process.env.REACT_APP_BACKEND_URL}api/student/test/questions/submit/coding/`, postData);
        const responseData = response.data;
        
        if(responseData.message == "Test Already Completed"){
          return;
        }
        
        // Update question status in session storage
        const sessionKey = `${testId}_questionStatus`;
        const sessionStatus = sessionStorage.getItem(sessionKey);
        
        if (sessionStatus) {
          try {
            const decryptedStatuses = CryptoJS.AES.decrypt(sessionStatus, secretKey).toString(CryptoJS.enc.Utf8);
            const statuses = JSON.parse(decryptedStatuses);
            
            statuses[`coding_${question.Qn_name}`] = "Submitted";
            
            const encryptedStatuses = CryptoJS.AES.encrypt(JSON.stringify(statuses), secretKey).toString();
            sessionStorage.setItem(sessionKey, encryptedStatuses);
          } catch (error) {
            console.error("Error updating session status:", error);
          }
        }
        
        // Cleanup auto-saved code after successful submission
        if (isTestFlowContext) {
          const testId = decryptData(sessionStorage.getItem("TestId") || "");
          autoSaveAfterSubmission(sqlQuery, question.Qn_name, studentId, testId, process.env.REACT_APP_BACKEND_URL!);
        }
      } else {
        // For practice/testing context, use regular submit endpoint
        const postData = {
          student_id: studentId,
          week_number: weekNumber,
          day_number: dayNumber,
          subject: subject,
          subject_id: subjectId,
          Qn: question.Qn_name,
          Ans: sqlQuery,
          CallFunction: "",
          Result: runResponseTestCases,
          Attempt: 0,
          final_score: "0/0",
          course_id: courseId,
          batch_id: decryptData(sessionStorage.getItem("BatchId") || "")
        };

        await getApiClient().put(`${process.env.REACT_APP_BACKEND_URL}api/student/coding/`, postData);

        const statusKey = `submissionStatus_${subject}_${weekNumber}_${dayNumber}_${question.Qn_name}`;
        sessionStorage.setItem(statusKey, encryptData("submitted"));

        // Trigger auto-save after successful submission (deletes autosave)
        if (!isTestingContext && !isTestFlowContext) {
          autoSaveAfterSubmission(sqlQuery, question.Qn_name, studentId, SUBJECT_ROADMAP.PRACTICE, process.env.REACT_APP_BACKEND_URL!);
        }
      }

      // Save code to session storage
      const codeKey = getUserCodeKey(question.Qn_name);
      sessionStorage.setItem(codeKey, encryptData(sqlQuery));

      setStatus(true);
      setIsSubmitted(true);
    } catch (error: any) {
      setSuccessMessage("Error");
      setAdditionalMessage("There was an error submitting the code.");
      console.error("Error submitting code:", error);
    } finally {
      setProcessing(false);
    }
  };

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    
    if (tab === "table" && question) {
      if (!question.Table) {
        return;
      }
      
      const tableNames = question.Table.split(',').map(name => name.trim());
      
      // Use question-specific tables if available, otherwise fall back to global tables
      const tablesToUse = question.Tables && question.Tables.length > 0 ? question.Tables : availableTables;
      
      if (!Array.isArray(tablesToUse)) {
        return;
      }
      
      const initialTables = tableNames.map(tableName =>
        tablesToUse.find(table => table.tab_name.toLowerCase() === tableName.toLowerCase())
      ).filter(table => table !== undefined);
      
      if (initialTables.length > 0 && initialTables[0]) {
        setTableData(initialTables[0].data || []);
        setTableName(initialTables[0].tab_name);
      }
    }
  };

  const handleTableNameClick = (tableName: string) => {
    setSelectedTable(tableName);
    
    // Use question-specific tables if available, otherwise fall back to global tables
    const tablesToUse = question?.Tables && question.Tables.length > 0 ? question.Tables : availableTables;
    
    const selectedTableData = tablesToUse.find(table =>
      table.tab_name.toLowerCase() === tableName.toLowerCase()
    );
    
    if (selectedTableData) {
      setTableData(selectedTableData.data || []);
      setTableName(selectedTableData.tab_name);
    }
  };

  return (
    <div className="d-flex" style={{ height: '100%', width: '100%', maxHeight: '100%' }}>
      {/* Question List - removed, handled by QuestionNav */}
      
      <div className="bg-white" style={{ width: "45%", height: "100%", display: "flex", flexDirection: "column", marginRight: "10px", flexShrink: 0 }}>
                    <div className="bg-white" style={{ height: "45%", backgroundColor: "#E5E5E533" }}>
                      <div className="p-3" style={{ height: "100%", overflowY: "auto", overflowX: "hidden" }}>
                        {isTestingContext && question?.question_id && (
                          <p style={{ wordWrap: "break-word", whiteSpace: "pre-wrap" }}>Question ID : {question.question_id}</p>
                        )}
                        <p style={{ wordWrap: "break-word", whiteSpace: "pre-wrap" }}>{question?.Qn}</p>
                      </div>
                    </div>
                    <div className="bg-white" style={{ height: "50%", backgroundColor: "#E5E5E533", display: "flex", flexDirection: "column" }}>
                      <ul className="custom-tabs mt-2 mb-2 mx-3 nav nav-pills" role="tablist" style={{ fontSize: "12px", height: "40px", flexShrink: 0 }}>
                        <li className="nav-item" role="presentation">
                          <button
                            type="button"
                            className={`nav-link me-2 ${activeTab === "table" ? "active" : ""}`}
                            onClick={() => handleTabClick("table")}
                            style={{
                              boxShadow: "#888 1px 2px 5px 0px",
                              backgroundColor: activeTab === "table" ? "black" : "transparent",
                              color: activeTab === "table" ? "white" : "black",
                            }}
                          >
                            Table
                          </button>
                        </li>
                        <li className="nav-item" role="presentation">
                          <button
                            type="button"
                            className={`nav-link ${activeTab === "output" ? "active" : ""}`}
                            onClick={() => handleTabClick("output")}
                            style={{
                              boxShadow: "#888 1px 2px 5px 0px",
                              backgroundColor: activeTab === "output" ? "black" : "transparent",
                              color: activeTab === "output" ? "white" : "black",
                            }}
                          >
                            Expected Output
                          </button>
                        </li>
                      </ul>
                      <div className="tab-content" style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                          {activeTab === "table" && (
                            <div role="tabpanel" className={`ms-3 fade tab-pane active show `} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                            <ul className="nav nav-pills" style={{ fontSize: "12px", display: "flex", flexWrap: "wrap", flexShrink: 0 }}>
                              {tableNames.map((tableName, index) => (
                                <li key={index} className="nav-item" role="presentation">
                                  <button
                                    type="button"
                                    className={`nav-link me-2 custom-tab ${selectedTable === tableName ? "active" : ""}`}
                                    onClick={() => handleTableNameClick(tableName)}
                                  >
                                    {tableName}
                                  </button>
                                </li>
                              ))}
                            </ul>
                            <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", minHeight: 0 }}>
                            {(() => {
                              const tablesToUse = question?.Tables && question.Tables.length > 0 ? question.Tables : availableTables;
                              const selectedTableData = tablesToUse.find(table => table.tab_name.toLowerCase() === selectedTable.toLowerCase());
                              if (selectedTable && selectedTableData && selectedTableData.data && selectedTableData.data.length > 0) {
                                return (
                                  <div>
                                    <table className="table table-bordered table-sm rounded" style={{ maxWidth: "100vw", width: "auto", fontSize: "12px" }}>
                                      <thead>
                                        <tr>
                                          {Object.keys(selectedTableData.data[0] || {}).map((header) => (
                                            <th key={header} className="text-center" style={{ maxWidth: `${100 / Object.keys(selectedTableData.data[0] || {}).length}vw` }}>
                                              {header}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {selectedTableData.data.map((row, index) => (
                                          <tr key={index}>
                                            {Object.keys(row || {}).map((header) => (
                                              <td key={header} className="text-center" style={{ whiteSpace: "nowrap", padding: "5px" }}>
                                                {row[header]}
                                              </td>
                                            ))}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                );
                              } else {
                                return null;
                              }
                            })()}
                            </div>
                          </div>
                          )}
                          <div role="tabpanel" className={`ms-3 fade tab-pane ${activeTab === "output" ? "active show" : ""}`} style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", fontSize: "12px" }}>
                            <div className="table-responsive" style={{ height: "100%" }}>
                              {expectedOutput.length > 0 && expectedOutput[0] && (
                                <table className="table table-bordered table-sm rounded" style={{ maxWidth: "100vw", width: "auto", fontSize: "12px" }}>
                                  <thead>
                                    <tr>
                                      {Object.keys(expectedOutput[0] || {}).map((header) => (
                                        <th key={header} className="text-center" style={{ maxWidth: `${100 / Object.keys(expectedOutput[0] || {}).length}vw` }}>
                                          {header}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {expectedOutput.map((row, index) => (
                                      <tr key={index}>
                                        {Object.keys(row || {}).map((header) => (
                                          <td key={header} className="text-center" style={{ whiteSpace: "nowrap", padding: "5px" }}>
                                            {row[header]}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

      <div className="bg-white" style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div className="bg-white" style={{ height: "45%", backgroundColor: "#E5E5E533", padding: "10px" }}>
                        <AceEditor
                          key={`editor-${questionIndex}`}
                          mode="sql"
                          theme="dreamweaver"
                          onChange={handleCodeChange}
                          onLoad={onEditorLoad}
                          value={sqlQuery}
                        fontSize={14}
                        placeholder="Write all SQL commands/clauses in UPPERCASE"
                        showPrintMargin={false}
                        showGutter={false}
                        highlightActiveLine={false}
                        wrapEnabled={true}
                        style={{ width: "100%", height: "100%", margin: '0px' }}
                      />
        </div>

        <div style={{ height: "6%", backgroundColor: "#E5E5E533" }} className="d-flex flex-column justify-content-center processingDivStyle">
                      <div className="d-flex justify-content-between align-items-center h-100">
                        <div className="d-flex flex-column justify-content-center">
                          {processing ? (
                            <h5 className="m-0 processingDivHeadingTag">Processing...</h5>
                          ) : (
                            <>
                              {(() => {
                                const storedResponse = questionResponses[question?.Qn_name || ''];
                                const displaySuccessMessage = storedResponse?.successMessage || successMessage;
                                const displayAdditionalMessage = storedResponse?.additionalMessage || additionalMessage;
                                
                                return (
                                  <>
                                    {displaySuccessMessage && <h5 className="m-0 ps-1" style={{ fontSize: '14px' }}>{displaySuccessMessage}</h5>}
                                    {displayAdditionalMessage && <p className="processingDivParaTag m-0 ps-1" style={{ fontSize: "10px" }}>{displayAdditionalMessage}</p>}
                                  </>
                                );
                              })()}
                            </>
                          )}
                        </div>
                        <div className="d-flex justify-content-end align-items-center">
                          <button
                            className="btn btn-sm btn-light me-2 processingDivButton"
                            style={{
                              whiteSpace: "nowrap",
                              fontSize: "12px",
                              minWidth: "70px",
                              boxShadow: "#888 1px 2px 5px 0px",
                              height: "30px"
                            }}
                            onClick={handleRun}
                            disabled={processing}
                          >
                            RUN CODE
                          </button>

                          {!isTestingContext && (
                            <button
                              className="btn btn-sm btn-light me-2 processingDivButton"
                              style={{
                                backgroundColor: "#FBEFA5DB",
                                whiteSpace: "nowrap",
                                fontSize: "12px",
                                minWidth: "70px",
                                boxShadow: "#888 1px 2px 5px 0px",
                                height: "30px"
                              }}
                              onClick={handleSubmit}
                              disabled={isSubmitted || processing || status || (isTestFlowContext && !canSubmitCode())}
                            >
                              {(isSubmitted || status) ? "SUBMITTED" : "SUBMIT CODE"}
                            </button>
                          )}

                          {!isTestingContext && ((isSubmitted || status)) &&
                            <button
                              className="btn btn-sm btn-light processingDivButton"
                              style={{
                                whiteSpace: "nowrap",
                                fontSize: "12px",
                                minWidth: "70px",
                                boxShadow: "#888 1px 2px 5px 0px",
                                height: "30px"
                              }}
                              disabled={processing}
                              onClick={onNext}
                            >
                              NEXT
                            </button>
                          }
                        </div>
                      </div>
        </div>

        <div className="bg-white" style={{ height: "49%", backgroundColor: "#E5E5E533", position: "relative" }}>
          <div className="p-3" style={{ height: "100%", overflowY: "auto", overflowX: "hidden" }}>
                        {runResponseTable.length > 0 && runResponseTable[0] && (
                          <>
                            {runResponseTable[0].error ? (
                              <div className="pe-2">
                                <div className="alert alert-danger w-auto mx-auto" style={{ 
                                  fontSize: "12px", 
                                  wordWrap: "break-word", 
                                  whiteSpace: "pre-wrap",
                                  overflowWrap: "break-word"
                                }}>
                                  <strong>Error:</strong> {runResponseTable[0].error}
                                </div>
                              </div>
                            ) : (
                              <table className="table table-bordered table-sm rounded" style={{ maxWidth: "100vw", width: "20vw", fontSize: "12px" }}>
                                <thead>
                                  <tr>
                                    {Object.keys(runResponseTable[0] || {}).map((header) => (
                                      <th key={header} className="text-center" style={{ maxWidth: `${100 / Object.keys(runResponseTable[0] || {}).length}vw` }}>
                                        {header}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {runResponseTable.map((row, index) => (
                                    <tr key={index}>
                                      {Object.keys(row || {}).map((header) => (
                                        <td key={header} className="text-center" style={{ whiteSpace: "nowrap", padding: "5px" }}>
                                          {row[header]}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </>
                        )}
                        <div className="mt-3">
                          {runResponseTestCases.map((testCase, index) => (
                            <div
                              key={index}
                              className="d-flex align-items-center mb-2 border border-ligth shadow bg-white p-2 rounded-2"
                              style={{ width: "fit-content", fontSize: "12px" }}
                            >
                              <span className="me-2">{Object.keys(testCase || {})[0]}:</span>
                              <span style={{ color: Object.values(testCase || {})[0] === "Passed" ? "blue" : Object.values(testCase || {})[0] === "True" ? "blue" : "red" }}>
                                {Object.values(testCase || {})[0]}
                              </span>
                            </div>
                          ))}
                        </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SQLCodeEditorComponent;

