import React, { useState, useEffect } from "react";
import AceEditor from "react-ace";
import { getApiClient } from "../utils/apiAuth";
import { useLocation, useNavigate } from "react-router-dom";
import "ace-builds/src-noconflict/mode-sql";
import "ace-builds/src-noconflict/theme-dreamweaver";
import { secretKey } from "../constants";
import CryptoJS from "crypto-js";
import SkeletonCode from './EditorSkeletonCode';
import { updateIndexParameter } from '../utils/urlUtils';
import '../SQLEditor.css';

/**
 * Interface for Data structure
 */
interface Data {
  [key: string]: any;
}

/**
 * Interface for TestCase structure
 */
interface TestCase {
  [key: string]: string;
}

/**
 * Interface for Question data structure
 */
interface Question {
  question_status: string;
  Name: string;
  Qn: string;
  Table: string;
  ExpectedOutput: Data[];
  Tables?: { tab_name: string; data: Data[] }[];
  Qn_name: string;
  status: boolean;
  entered_ans: string;
  Query: string;
  user_answer: string;
  question_data?: {
    Qn: string;
    Ans: string;
    Expl: any[];
    Name: string;
    Qnte: string;
    Qnty: string;
    Tags: any[];
    test: any[];
    Hints: any[];
    Level: string;
    Table: string;
    CreatedOn: string;
    TestCases: TestCase[];
    MultiSelect: number;
    ExpectedOutput: Data[];
  };
}

/**
 * Interface for SQLCodeEditor Props
 */
interface SQLCodeEditorProps {
  questionData: any;
  currentQuestionIndex: number;
  onQuestionChange: (subject: 'py' | 'sq') => void;
  onNext: () => void;
  showNextButton: boolean;
  nextButtonText: string;
  onQuestionSubmitted: (questionName: string) => void;
}

const SQLCodeEditor: React.FC<SQLCodeEditorProps> = ({
  questionData,
  currentQuestionIndex,
  onQuestionChange,
  onNext,
  showNextButton,
  nextButtonText,
  onQuestionSubmitted
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  // ===== STATE MANAGEMENT =====
  
  // Questions and navigation state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // UI state management
  const [sqlQuery, setSqlQuery] = useState<string>("");
  const [runResponseTestCases, setRunResponseTestCases] = useState<any[]>([]);
  const [runResponseTable, setRunResponseTable] = useState<Data[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [additionalMessage, setAdditionalMessage] = useState<string>("");
  const [processing, setProcessing] = useState<boolean>(false);
  const [status, setStatus] = useState<boolean>(false);
  
  // Table and output state
  const [tableData, setTableData] = useState<Data[]>([]);
  const [tableName, setTableName] = useState<string>("");
  const [questionTableNames, setQuestionTableNames] = useState<string[]>([]);
  const [currentTableIndex, setCurrentTableIndex] = useState<number>(0);
  const [expectedOutput, setExpectedOutput] = useState<Data[]>([]);
  const [activeTab, setActiveTab] = useState<string>("table");
  
  // Processing state (same as TestSQLCoding)
  const [processingQuestions, setProcessingQuestions] = useState<Set<number>>(new Set());
  const [questionResponses, setQuestionResponses] = useState<{[key: string]: any}>({});
  const [lastRunCode, setLastRunCode] = useState<{[key: string]: string}>({});
  
  // Additional state for enhanced functionality
  const [availableTables, setAvailableTables] = useState<{ tab_name: string; data: Data[] }[]>([]);
  const [questionStatuses, setQuestionStatuses] = useState<{[key: string]: string}>({});
  const [isRunBtnClicked, setIsRunBtnClicked] = useState<boolean>(false);
  const [isNextBtn, setIsNextBtn] = useState<boolean>(false);
  
  // ===== SESSION STORAGE DATA EXTRACTION =====
  
  // Decrypt student data from session storage
  const getSessionData = (key: string): string => {
    const encryptedValue = sessionStorage.getItem(key);
    if (!encryptedValue) {
      console.error(`Missing session storage data: ${key}`);
      return '';
    }
    try {
      return CryptoJS.AES.decrypt(encryptedValue, secretKey).toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error(`Error decrypting session storage data for ${key}:`, error);
      return '';
    }
  };

  const studentId = getSessionData('StudentId');
  const testId = getSessionData('TestId');
  
  // ===== UTILITY FUNCTIONS =====
  
  /**
   * Encrypts data using AES encryption for secure storage
   */
  const encryptData = (data: string): string => {
    return CryptoJS.AES.encrypt(data, secretKey).toString();
  };

  /**
   * Decrypts data using AES decryption
   */
  const decryptData = (encryptedData: string): string => {
    try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return decrypted || "";
    } catch (error) {
      console.error("Error decrypting data:", error);
      return "";
    }
  };

  /**
   * Generates a unique key for storing user code in session storage
   */
  const getUserCodeKey = (qnName: string) => {
    return `userCode_${qnName}`;
  };

  /**
   * Get question status from session storage
   */
  const getQuestionStatusFromSession = () => {
    const sessionKey = `${testId}_questionStatus`;
    const sessionStatus = sessionStorage.getItem(sessionKey);
    
    if (sessionStatus) {
      try {
        const decryptedStatuses = CryptoJS.AES.decrypt(sessionStatus, secretKey).toString(CryptoJS.enc.Utf8);
        return JSON.parse(decryptedStatuses);
    } catch (error) {
        console.error("Error decrypting session status:", error);
        return {};
      }
    }
    return {};
  };

  /**
   * Update table data for a specific question
   */
  const updateTableForQuestion = async (question: Question) => {
    // Get tables from session storage first
    const encryptedTables = sessionStorage.getItem('sqlTables');
    
    if (encryptedTables) {
      try {
        const decryptedTables = JSON.parse(CryptoJS.AES.decrypt(encryptedTables, secretKey).toString(CryptoJS.enc.Utf8));
        setAvailableTables(decryptedTables);

        if (decryptedTables && decryptedTables.length > 0) {
          // Parse comma-separated table names
          const tableNamesString = question.question_data?.Table || question.Table || "";
          const tableNames = tableNamesString.split(',').map(name => name.trim()).filter(name => name);

          setQuestionTableNames(tableNames);
          
          if (tableNames.length > 0) {
            // Find the first matching table
            let matchingTable = null;
            for (const tableName of tableNames) {
              matchingTable = decryptedTables.find((table: any) =>
                table.tab_name.toLowerCase() === tableName.toLowerCase()
              );
              if (matchingTable) {
                break;
              }
            }

            if (matchingTable) {
              setTableData(matchingTable.data || []);
              setTableName(matchingTable.tab_name);
              setCurrentTableIndex(0);
            } else {
              // Fallback to first available table
              setTableData(decryptedTables[0].data || []);
              setTableName(decryptedTables[0].tab_name);
          setCurrentTableIndex(0);
            }
          } else {
            // No table names specified, use first available table
            setTableData(decryptedTables[0].data || []);
            setTableName(decryptedTables[0].tab_name);
            setCurrentTableIndex(0);
          }
        } else {
          // No tables in session, fetch from API
          await fetchTablesFromAPI();
        }
      } catch (error) {
        console.error("Error decrypting tables from session:", error);
        await fetchTablesFromAPI();
      }
    } else {
      // No tables in session, fetch from API
      await fetchTablesFromAPI();
    }
  };

  /**
   * Fetch tables from API
   */
  const fetchTablesFromAPI = async () => {
    try {
      const url = `${process.env.REACT_APP_BACKEND_URL}api/student/test/tables/${studentId}/${testId}/`;
      const response = await getApiClient().get(url);
      const tablesData = response.data;
      
      if (tablesData && tablesData.tables && tablesData.tables.length > 0) {
        // Encrypt and store tables in session
        const encryptedTables = CryptoJS.AES.encrypt(JSON.stringify(tablesData.tables), secretKey).toString();
        sessionStorage.setItem('sqlTables', encryptedTables);
        
        setAvailableTables(tablesData.tables);
        
        // Use the first table as default
        setTableData(tablesData.tables[0].data || []);
        setTableName(tablesData.tables[0].tab_name);
        setCurrentTableIndex(0);
        
        // Set question table names based on current question
        const currentQuestion = questions[currentQuestionIndex];
        if (currentQuestion) {
          const tableNamesString = currentQuestion.question_data?.Table || currentQuestion.Table || "";
          const tableNames = tableNamesString.split(',').map(name => name.trim()).filter(name => name);
          setQuestionTableNames(tableNames);
        }
      } else {
        setTableData([]);
        setTableName("Table");
          setCurrentTableIndex(0);
        }
      } catch (error) {
        console.error("Error fetching tables from API:", error);
      setTableData([]);
      setTableName("Table");
      setCurrentTableIndex(0);
    }
  };

  // ===== DATA INITIALIZATION =====
  
  useEffect(() => {
    const initializeData = async () => {
      if (questionData && questionData.qns_data && questionData.qns_data.coding) {
        try {
          // Transform TestSection data to SQL format
          const transformedQuestions = questionData.qns_data.coding.map((q: any) => {
            // Don't load saved code during initialization to prevent code sharing
            return q;
          });
          
          setQuestions(transformedQuestions);

          // Set initial question index from session storage or default to 0
          const savedIndex = sessionStorage.getItem("codingCurrentQuestionIndex");
          const initialIndex = savedIndex ? parseInt(savedIndex, 10) : 0;
          
          // Load initial question data
          const initialQuestion = transformedQuestions[initialIndex];
          setStatus(initialQuestion.status);
          
          // Load saved code for initial question (same logic as question changes)
          const nextQuestionKey = getUserCodeKey(initialQuestion.Qn_name);
          const savedCode = sessionStorage.getItem(nextQuestionKey);

          if (savedCode !== null) {
            const decryptedCode = decryptData(savedCode);
            if (decryptedCode) {
              setSqlQuery(decryptedCode);
            } else {
          setSqlQuery(initialQuestion.entered_ans || "");
            }
          } else {
            setSqlQuery(initialQuestion.entered_ans || "");
          }
          
          // Load table data for initial question
          await updateTableForQuestion(initialQuestion);
          
          // Load expected output (same logic as TestSQLCoding)
          if (initialQuestion.question_data) {
            setExpectedOutput(initialQuestion.question_data.ExpectedOutput || initialQuestion.ExpectedOutput || []);
          } else {
          setExpectedOutput(initialQuestion.ExpectedOutput || []);
          }
          
          // Load question statuses
          const statuses = getQuestionStatusFromSession();
          setQuestionStatuses(statuses);
          
          // Update question statuses based on session storage
          const updatedQuestions = transformedQuestions.map((q: any) => {
            const statusKey = `coding_${q.Qn_name}`;
            const sessionStatus = statuses[statusKey];
            return {
              ...q,
              status: sessionStatus === "Submitted" || q.status
            };
          });
          setQuestions(updatedQuestions);
          
          setLoading(false);

        } catch (error) {
          console.error("Error processing coding questions:", error);
          setLoading(false);
        }
      }
    };

    initializeData();
  }, [questionData]);

  // ===== HANDLE QUESTION INDEX CHANGES =====
  
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex >= 0 && currentQuestionIndex < questions.length) {
      const currentQuestion = questions[currentQuestionIndex];
      if (currentQuestion) {
        setStatus(currentQuestion.status);
        
        // Load saved code for new question (same logic as TestSQLCoding)
        const nextQuestionKey = getUserCodeKey(currentQuestion.Qn_name);
        const savedCode = sessionStorage.getItem(nextQuestionKey);

        if (savedCode !== null) {
          const decryptedCode = decryptData(savedCode);
          if (decryptedCode) {
            setSqlQuery(decryptedCode);
          } else {
        setSqlQuery(currentQuestion.entered_ans || "");
          }
        } else {
          setSqlQuery(currentQuestion.entered_ans || "");
        }
        
        setRunResponseTestCases([]);
        setRunResponseTable([]);
        setSuccessMessage("");
        setAdditionalMessage("");
        setActiveTab("table");
        
        // Update table data for new question
        updateTableForQuestion(currentQuestion);
        
        // Update expected output (same logic as TestSQLCoding)
        if (currentQuestion.question_data) {
          setExpectedOutput(currentQuestion.question_data.ExpectedOutput || currentQuestion.ExpectedOutput || []);
        } else {
        setExpectedOutput(currentQuestion.ExpectedOutput || []);
        }
        
        // Check if we have stored response data for this question
        const questionKey = currentQuestion.Qn_name;
        const storedResponse = questionResponses[questionKey];
        
        if (storedResponse) {
          // Restore the stored response data
          setRunResponseTable(storedResponse.table || []);
          setRunResponseTestCases(storedResponse.testCases || []);
          setSuccessMessage(storedResponse.successMessage || "");
          setAdditionalMessage(storedResponse.additionalMessage || "");
          setActiveTab("output");
        } else {
          // Clear response data for new question
          setRunResponseTable([]);
          setRunResponseTestCases([]);
          setSuccessMessage("");
          setAdditionalMessage("");
          setActiveTab("table");
        }
        

      }
    }
  }, [currentQuestionIndex, questions]);

  // ===== SAVE CURRENT CODE WHEN CODE CHANGES =====
  
  useEffect(() => {
    // Save current code to session storage when sqlQuery changes
    if (questions[currentQuestionIndex]?.Qn_name && sqlQuery) {
      const currentCodeKey = getUserCodeKey(questions[currentQuestionIndex].Qn_name);
      const encryptedCode = encryptData(sqlQuery);
      sessionStorage.setItem(currentCodeKey, encryptedCode);
    } else if (questions[currentQuestionIndex]?.Qn_name && sqlQuery === "") {
      // Explicitly clear session storage if sqlQuery becomes empty for a question
      const key = getUserCodeKey(questions[currentQuestionIndex].Qn_name);
      sessionStorage.removeItem(key);
    }
  }, [sqlQuery]); // Only depend on sqlQuery, not currentQuestionIndex

  // ===== CODE EDITOR HANDLERS =====
  
  /**
   * Handles code changes in the AceEditor
   */
  const handleCodeChange = (newCode: string) => {
    setSqlQuery(newCode);
    
    // Save code to session storage for current question
    if (questions[currentQuestionIndex]?.Qn_name) {
      const key = getUserCodeKey(questions[currentQuestionIndex].Qn_name);
      if (newCode) {
        const encryptedCode = encryptData(newCode);
        sessionStorage.setItem(key, encryptedCode);
      } else {
        sessionStorage.removeItem(key);
      }
    }
  };

  /**
   * Check if submit button should be enabled
   */
  const canSubmitCode = () => {
    const currentQuestionKey = questions[currentQuestionIndex]?.Qn_name;
    if (!currentQuestionKey) {
      return false; // No current question
    }
    
    // Check for stored response using the correct key pattern
    const storedResponse = questionResponses[currentQuestionKey];
    if (!storedResponse) {
      return false; // No run response for this question
    }
    
    const lastRunCodeForQuestion = lastRunCode[currentQuestionKey];
    if (!lastRunCodeForQuestion) {
      return false; // No code was run for this question
    }
    
    const currentCode = sqlQuery.trim().replace(/\n/g, " ").replace(/;$/, "");
    const lastRunCodeTrimmed = lastRunCodeForQuestion.trim().replace(/\n/g, " ").replace(/;$/, "");
    
    return currentCode === lastRunCodeTrimmed;
  };

  /**
   * Handle tab click
   */
  const handleTabClick = (tab: string) => {
    setActiveTab(tab);

    if (tab === "output") {
      // Ensure expected output is properly set when switching to output tab
      const questionForTab = questions[currentQuestionIndex];
      if (questionForTab.question_data) {
        setExpectedOutput(questionForTab.question_data.ExpectedOutput || questionForTab.ExpectedOutput || []);
      } else {
        setExpectedOutput(questionForTab.ExpectedOutput || []);
      }
    } else if (tab === "table") {
      const currentQuestion = questions[currentQuestionIndex];
      if (!Array.isArray(availableTables)) {
        return;
      }
      
      // Parse comma-separated table names from the question
      const tableNamesString = currentQuestion.question_data?.Table || currentQuestion.Table || "";
      const tableNames = tableNamesString.split(',').map(name => name.trim()).filter(name => name);
      
      if (tableNames.length > 0) {
        // Find the first matching table for this question
        let matchingTable: { tab_name: string; data: Data[] } | null = null;
        for (const tableName of tableNames) {
          matchingTable = availableTables.find((table: any) =>
            table.tab_name.toLowerCase() === tableName.toLowerCase()
          ) || null;
          if (matchingTable) {
            break;
          }
        }

        if (matchingTable) {
          setTableData(matchingTable.data || []);
          setTableName(matchingTable.tab_name);
          // Find the index of this table in the question's table names
          const tableIndex = tableNames.findIndex(name => 
            name.toLowerCase() === matchingTable!.tab_name.toLowerCase()
          );
          setCurrentTableIndex(Math.max(0, tableIndex));
        } else {
          // Fallback to first available table
          setTableData(availableTables[0].data || []);
          setTableName(availableTables[0].tab_name);
          setCurrentTableIndex(0);
        }
      } else {
        // No table names specified, use first available table
        setTableData(availableTables[0].data || []);
        setTableName(availableTables[0].tab_name);
        setCurrentTableIndex(0);
      }
    }
  };

  /**
   * Handle table name click
   */
  const handleTableNameClick = () => {
    // Handle table name click if needed
  };

  /**
   * Handle table tab click
   */
  const handleTableTabClick = (tableName: string, index: number) => {
    const matchingTable = availableTables.find((table: any) =>
      table.tab_name.toLowerCase() === tableName.toLowerCase()
    );

    if (matchingTable) {
      setTableData(matchingTable.data || []);
      setTableName(matchingTable.tab_name);
    setCurrentTableIndex(index);
    }
  };

  // ===== SQL CODE EXECUTION =====
  
  /**
   * Execute SQL code with test cases
   */
  const handleRun = async () => {
    if (!sqlQuery.trim()) {
      return;
    }

    setProcessing(true);
    setProcessingQuestions(prev => new Set(prev).add(currentQuestionIndex));
    setRunResponseTestCases([]);
    setRunResponseTable([]);
    setSuccessMessage('');
    setAdditionalMessage('');
    setIsRunBtnClicked(true);

    try {
      const currentQuestion = questions[currentQuestionIndex];
      const updatedSqlQuery = sqlQuery.replace("/*Write a all SQl commands/clauses in UPPERCASE*/", "").replace(/\s*\n\s*/g, " \n ");

      const sendData = {
        student_id: studentId,
        query: updatedSqlQuery,
        ExpectedOutput: currentQuestion?.question_data?.ExpectedOutput || [],
        TestCases: currentQuestion?.question_data?.TestCases || [],
        week_number: 0,
        day_number: 0,
        subject_id: decryptData(sessionStorage.getItem("TestSubjectId") || ""),
        test_id: testId,
        subject: sessionStorage.getItem("TestSubject") || "",
        call_function: "",
        result: runResponseTestCases,
        Qn: currentQuestion.Qn_name,
      };

      const response = await getApiClient().post(`${process.env.REACT_APP_BACKEND_URL}api/student/coding/sql/`, sendData);
      const responseData = response.data;

        // Store response for this question
        const questionKey = currentQuestion.Qn_name;
      const responseDataToStore = {
        response: responseData,
        table: responseData.data,
        testCases: responseData.TestCases,
        successMessage: "",
        additionalMessage: ""
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

        // Update test cases and table data
        if (responseData.data) {
          setRunResponseTable(responseData.data);
        }
        if (responseData.TestCases) {
          setRunResponseTestCases(responseData.TestCases);
        }

      // Check result and set messages
      const resultField = responseData.TestCases.find((testCase: TestCase) => testCase.Result !== undefined);
      if (resultField) {
        if (resultField.Result === "True") {
          setSuccessMessage("Congratulations!");
          setAdditionalMessage("You have passed the test cases. Click the submit code button.");
          responseDataToStore.successMessage = "Congratulations!";
          responseDataToStore.additionalMessage = "You have passed the test cases. Click the submit code button.";
        } else if (resultField.Result === "False") {
          setSuccessMessage("Wrong Answer");
          setAdditionalMessage("You have not passed the test cases");
          responseDataToStore.successMessage = "Wrong Answer";
          responseDataToStore.additionalMessage = "You have not passed the test cases";
        }
      }

      setActiveTab("output");

      // Ensure expected output is properly set when switching to output tab
      const questionForOutput = questions[currentQuestionIndex];
      if (questionForOutput.question_data) {
        setExpectedOutput(questionForOutput.question_data.ExpectedOutput || questionForOutput.ExpectedOutput || []);
      } else {
        setExpectedOutput(questionForOutput.ExpectedOutput || []);
      }

    } catch (error) {
      console.error("SQL execution failed:", error);
      setSuccessMessage("Error");
      setAdditionalMessage("Query execution failed");
    } finally {
      setProcessing(false);
      setProcessingQuestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(currentQuestionIndex);
        return newSet;
      });
    }
  };

  // ===== SUBMIT LOGIC =====
  
  /**
   * Submit the final answer
   */
  const handleTestSectionPage = () => {
    sessionStorage.setItem("codingCurrentQuestionIndex", currentQuestionIndex.toString());
    
    // Get test data from session storage or location state
    let sectionData = (location.state as any)?.sectionData;
    if (!sectionData) {
      const encryptedTestData = sessionStorage.getItem('testSectionData');
      if (encryptedTestData) {
        try {
          sectionData = JSON.parse(CryptoJS.AES.decrypt(encryptedTestData, secretKey).toString(CryptoJS.enc.Utf8));
        } catch (error) {
          console.error("Error decrypting test data for navigation:", error);
        }
      }
    }
    
    // Navigate back to test section with the same data
    navigate('/test-section', { 
      state: { 
        sectionData: sectionData 
      } 
    });
  };

  const handleSubmit = async () => {
    const currentQuestion = questions[currentQuestionIndex];
    const questionKey = currentQuestion.Qn_name;
    const storedResponse = questionResponses[questionKey];
    
    if (!storedResponse) {
      setSuccessMessage("Error");
      setAdditionalMessage("Please run your code before submitting.");
      return;
    }
    
    setProcessing(true);
    
    try {
      // Get course_id from session storage
      const encryptedCourseId = sessionStorage.getItem('CourseId');
      const courseId = encryptedCourseId ? CryptoJS.AES.decrypt(encryptedCourseId, secretKey).toString(CryptoJS.enc.Utf8) : "course19";
      
      const postData = {
        student_id: studentId,
        test_id: testId,
        question_id: currentQuestion.Qn_name,
        answer: sqlQuery,
        subject_id: decryptData(sessionStorage.getItem("TestSubjectId") || ""),
        TestCases: currentQuestion?.question_data?.TestCases || [],
        subject: sessionStorage.getItem("TestSubject") || "",
        final_score: "0/0",
        course_id: courseId,
        result: runResponseTestCases,
        batch_id: decryptData(sessionStorage.getItem("BatchId") || ""),
      };

      const response = await getApiClient().put(`${process.env.REACT_APP_BACKEND_URL}api/student/test/questions/submit/coding/`, postData);
      const responseData = response.data;
      
      if(responseData.message == "Test Already Completed"){
        // Handle test completion
        return;
      }
      
      // Update question status in session storage (same as TestSQLCoding)
      const sessionKey = `${testId}_questionStatus`;
      const sessionStatus = sessionStorage.getItem(sessionKey);
      
      if (sessionStatus) {
        try {
          const decryptedStatuses = CryptoJS.AES.decrypt(sessionStatus, secretKey).toString(CryptoJS.enc.Utf8);
          const statuses = JSON.parse(decryptedStatuses);
          
          // Update the status for this question to "Submitted"
          statuses[`coding_${currentQuestion.Qn_name}`] = "Submitted";
          
          // Re-encrypt and store updated statuses
          const encryptedStatuses = CryptoJS.AES.encrypt(JSON.stringify(statuses), secretKey).toString();
          sessionStorage.setItem(sessionKey, encryptedStatuses);
          
          // Update local state
          setQuestionStatuses(statuses);
          
        } catch (error) {
          console.error("Error updating session status:", error);
        }
      }
        
        // Save code to session storage
        const key = getUserCodeKey(currentQuestion.Qn_name);
      const encryptedCode = encryptData(sqlQuery);
      sessionStorage.setItem(key, encryptedCode);

      // Update local question status
      const updatedQuestions = [...questions];
      updatedQuestions[currentQuestionIndex].status = true;
      setQuestions(updatedQuestions);
      
      setIsNextBtn(true);
      onQuestionSubmitted(currentQuestion.Qn_name);
    } catch (error) {
      setSuccessMessage("Error");
      setAdditionalMessage("There was an error submitting the code.");
      console.error("Error submitting code:", error);
    } finally {
      setProcessing(false);
    }
  };

  // ===== RENDERING =====

  if (loading) {
    return (
      <div className="container-fluid p-0" style={{ height: "100%", maxWidth: "100%", overflowX: "hidden", backgroundColor: "#f2eeee" }}>
        <div className="p-0 my-0 me-2" style={{ backgroundColor: "#F2EEEE", height: "100%" }}>
          <SkeletonCode />
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex" style={{ height: '100%', width: '100%', maxHeight: '100%' }}>
      
      {/* ===== PROBLEM STATEMENT AND TABLE DATA (MIDDLE PANEL) ===== */}
      <div className="col-5 lg-8 bg-white" style={{ height: "100%", display: "flex", flexDirection: "column", marginLeft: "-10px", marginRight: "10px", maxHeight: '100%' }}>
        <div className="bg-white" style={{ height: "45%", backgroundColor: "#E5E5E533" }}>
          <div className="p-3" style={{ height: "100%", overflowY: "auto", overflowX: "hidden" }}>
            <p>Q{currentQuestionIndex + 1}. {questions[currentQuestionIndex]?.question_data?.Qn || questions[currentQuestionIndex]?.Qn || "Question not available"}</p>
          </div>
        </div>
        <div className="bg-white" style={{ height: "50%", backgroundColor: "#E5E5E533" }}>
          <div className="mt-auto">
            <ul className="custom-tabs mt-2 mb-2 mx-3 nav nav-pills" role="tablist" style={{ fontSize: "12px", height: "40px" }}>
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
                  disabled={processingQuestions.has(currentQuestionIndex)}
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
                  disabled={processingQuestions.has(currentQuestionIndex)}
                >
                  Expected Output
                </button>
              </li>
            </ul>
            <div className="tab-content">
                             <div role="tabpanel" className={`ms-3 fade tab-pane ${activeTab === "table" ? "active show" : ""}`} style={{ height: "100%", overflowY: "auto", overflowX: "hidden" }}>
                <div className="d-flex flex-row">
                  {questionTableNames.length > 1 ? (
                    // Multiple tables - show tabs
                    questionTableNames.map((tableName, index) => (
                      <div key={index} className="inline-block" style={{ marginBottom: "-1px" }}>
                        <div
                          className="px-3 py-2 text-white"
                          style={{
                            fontSize: "12px",
                            backgroundColor: currentTableIndex === index ? "#333" : "#666",
                            borderTopLeftRadius: "8px",
                            borderTopRightRadius: "8px",
                            boxShadow: "0 -2px 4px rgba(0,0,0,0.1)",
                            position: "relative",
                            zIndex: 1,
                            cursor: "pointer",
                            marginRight: "2px"
                          }}
                          onClick={() => handleTableTabClick(tableName, index)}
                        >
                          {tableName}
                        </div>
                      </div>
                    ))
                  ) : (
                    // Single table - show single tab
                    <div className="inline-block" style={{ marginBottom: "-1px" }}>
                      <div
                        className="px-3 py-2 text-white"
                        style={{
                          fontSize: "12px",
                          backgroundColor: "#333",
                          borderTopLeftRadius: "8px",
                          borderTopRightRadius: "8px",
                          boxShadow: "0 -2px 4px rgba(0,0,0,0.1)",
                          position: "relative",
                          zIndex: 1
                        }}
                      >
                        {tableName}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  {tableData.length > 0 && (
                    <table className="table table-bordered table-sm rounded" style={{ maxWidth: "100vw", width: "20vw", fontSize: "12px" }}>
                      <thead>
                        <tr>
                          {Object.keys(tableData[0]).map((header) => (
                            <th key={header} className="text-center" style={{ maxWidth: `${100 / Object.keys(tableData[0]).length}vw` }}>
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.map((row, index) => (
                          <tr key={index}>
                            {Object.keys(row).map((header) => (
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
                             <div role="tabpanel" className={`ms-3 fade tab-pane ${activeTab === "output" ? "active show" : ""}`} style={{ height: "100%", overflowY: "auto", overflowX: "hidden", fontSize: "12px" }}>
                <div className="table-responsive" style={{ height: "100%" }}>
                  {expectedOutput.length > 0 && (
                    <table className="table table-bordered table-sm rounded" style={{ maxWidth: "100vw", width: "20vw", fontSize: "12px" }}>
                      <thead>
                        <tr>
                          {Object.keys(expectedOutput[0]).map((header) => (
                            <th key={header} className="text-center" style={{ maxWidth: `${100 / Object.keys(expectedOutput[0]).length}vw` }}>
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {expectedOutput.map((row, index) => (
                          <tr key={index}>
                            {Object.keys(row).map((header) => (
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
        </div>

      {/* ===== CODE EDITOR AND CONTROLS (RIGHT PANEL) ===== */}
       <div className="col-6 lg-8" style={{ height: "100%", display: "flex", flexDirection: "column", width: '55.1%', maxHeight: '100%' }}>
        
        {/* ===== CODE EDITOR ===== */}
        <div className="bg-white me-3" style={{ height: "45%", backgroundColor: "#E5E5E533", padding: "10px" }}>
          <AceEditor
            key={`editor-${currentQuestionIndex}`}
            mode="sql"
            theme="dreamweaver"
            onChange={handleCodeChange}
            value={sqlQuery}
            fontSize={14}
            showPrintMargin={false}
            placeholder="Write a all SQl commands/clauses in UPPERCASE"
            showGutter={false}
            highlightActiveLine={false}
            wrapEnabled={true}
            style={{ width: "100%", height: "100%", margin: '0px' }}
          />
        </div>

        {/* ===== PROCESSING STATUS AND ACTION BUTTONS ===== */}
        <div style={{ height: "6%", marginRight: '37px', backgroundColor: "#E5E5E533" }} className="d-flex flex-column justify-content-center processingDiv">
          <div className="d-flex justify-content-between align-items-center h-100">
            <div className="d-flex flex-column justify-content-center">
              {processingQuestions.has(currentQuestionIndex) ? (
                <h5 className="m-0 processingDivHeadingTag">Processing...</h5>
              ) : (
                <>
                  {(() => {
                    const currentQuestionKey = questions[currentQuestionIndex]?.Qn_name;
                    const storedResponse = questionResponses[currentQuestionKey];
                    if (!storedResponse) return null;
                    return (
                      <>
                        {storedResponse.successMessage && (
                          <h5 className="m-0 ps-1" style={{ fontSize: '14px' }}>
                            {storedResponse.successMessage}
                          </h5>
                        )}
                        {storedResponse.additionalMessage && (
                          <p className="processingDivParaTag m-0 ps-1" style={{ fontSize: "10px" }}>
                            {storedResponse.additionalMessage}
                          </p>
                        )}
                      </>
                    );
                  })()}
                </>
              )}
            </div>
            <div className="d-flex justify-content-end align-items-center">
              {/* Run Code Button */}
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
                disabled={processingQuestions.has(currentQuestionIndex)}
              >
                RUN CODE
              </button>
              
              {/* Submit Code Button */}
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
                disabled={processing || questions[currentQuestionIndex]?.status || !canSubmitCode()}
              >
                {questions[currentQuestionIndex]?.status ? "SUBMITTED" : "SUBMIT CODE"}
              </button>
              
              {/* Next Button */}
              {showNextButton && (
                <button
                  className="btn btn-sm btn-light processingDivButton"
                  style={{
                    whiteSpace: "nowrap",
                    fontSize: "12px",
                    minWidth: "70px",
                    boxShadow: "#888 1px 2px 5px 0px",
                    height: "30px"
                  }}
                  onClick={nextButtonText === "Test Section" ? handleTestSectionPage : onNext}
                  disabled={processingQuestions.has(currentQuestionIndex)}
                >
                  {nextButtonText}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ===== OUTPUT AND TEST RESULTS PANEL ===== */}
        <div className="bg-white me-3" style={{ height: "49%", backgroundColor: "#E5E5E533", position: "relative" }}>
          <div className="p-3" style={{ height: "100%", overflowY: "auto", overflowX: "hidden" }}>
            {/* ===== CODE EXECUTION OUTPUT ===== */}
            {runResponseTable && runResponseTable.length > 0 && (
              <div className="mb-3">
                <h6 style={{ fontSize: "14px", marginBottom: "10px" }}>Query Result:</h6>
                <div className="table-responsive">
                  <table className="table table-bordered table-sm" style={{ fontSize: "12px" }}>
                    <thead>
                      <tr>
                        {Object.keys(runResponseTable[0]).map((header) => (
                          <th key={header} className="text-center">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {runResponseTable.map((row, index) => (
                        <tr key={index}>
                          {Object.keys(row).map((header) => (
                            <td key={header} className="text-center">
                              {row[header]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* ===== TEST CASE RESULTS ===== */}
            {runResponseTestCases && runResponseTestCases.length > 0 && (
              <div className="col mt-3">
                {runResponseTestCases.map((testCase, index) => (
                  <div
                    key={index}
                    className="d-flex align-items-center mb-2 border border-ligth shadow bg-white p-2 rounded-2"
                    style={{ width: "fit-content", fontSize: "12px" }}
                  >
                    <span className="me-2">{Object.keys(testCase)[0]}:</span>
                    <span style={{ color: Object.values(testCase)[0] === "Passed" ? "blue" : Object.values(testCase)[0] === "True" ? "blue" : "red" }}>
                      {Object.values(testCase)[0] as React.ReactNode}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SQLCodeEditor; 