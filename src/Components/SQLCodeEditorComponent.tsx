import React, { useState, useEffect } from "react";
import AceEditor from "react-ace";
import { getApiClient } from "../utils/apiAuth";
import { useAPISWR } from "../utils/swrConfig";
import { resetEditorUndoManager } from "../utils/editorUtils";
import "ace-builds/src-noconflict/mode-sql";
import "ace-builds/src-noconflict/theme-dreamweaver";
import { secretKey } from "../constants";
import CryptoJS from "crypto-js";
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
  const editorRef = React.useRef<any>(null);

  const encryptData = (data: string) => {
    return CryptoJS.AES.encrypt(data, secretKey).toString();
  };

  const decryptData = (encryptedData: string) => {
    const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  };

  const getUserCodeKey = (qnName: string) => {
    return `userCode_${subject}_${weekNumber}_${dayNumber}_${qnName}`;
  };

  const tableNames = question?.Table?.split(',').map(name => name.trim()) || [];

  // Initialize question data
  useEffect(() => {
    if (question) {
      setStatus(question.status || false);
      setExpectedOutput(question.ExpectedOutput || []);
      setRunResponseTable([]);
      setRunResponseTestCases([]);
      setSuccessMessage("");
      setAdditionalMessage("");
      setActiveTab("table");
      setIsRunBtnClicked(false);
      setProcessing(false);
      
      // Load saved code
      const codeKey = getUserCodeKey(question.Qn_name);
      const savedCode = sessionStorage.getItem(codeKey);
      let codeToSet = "";
      if(isTestingContext) {
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
      } else {
          codeToSet = question.entered_ans || question.Query || "";
      }
      setSqlQuery(codeToSet);
      
      // Check submission status
      const statusKey = `submissionStatus_${subject}_${weekNumber}_${dayNumber}_${question.Qn_name}`;
      const submissionStatus = sessionStorage.getItem(statusKey);
      setIsSubmitted(submissionStatus ? decryptData(submissionStatus) === "submitted" : question.status);
    }
  }, [question?.Qn_name, question?.Query, question?.entered_ans, question.Ans, questionIndex, isTestingContext]);

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
      
      const sendData = {
        student_id: studentId,
        week_number: isTestingContext ? null : weekNumber,
        day_number: isTestingContext ? null : dayNumber,
        subject: subject,
        subject_id: subjectId,
        Qn: question.Qn_name,
        query: updatedSqlQuery,
        ExpectedOutput: question.ExpectedOutput || [],
        TestCases: question.TestCases || [],
        batch_id: decryptData(sessionStorage.getItem("BatchId") || ""),
      };

      if (updatedSqlQuery) {
        const response = await getApiClient().post(`${process.env.REACT_APP_BACKEND_URL}api/student/coding/sql/`, sendData);
        const responseData = response.data;

        setRunResponseTable(responseData.data || []);
        setRunResponseTestCases(responseData.TestCases || []);

        const resultField = responseData.TestCases?.find((testCase: TestCase) => testCase.Result !== undefined);
        if (resultField) {
          if (resultField.Result === "True") {
            setSuccessMessage("Congratulations!");
            setAdditionalMessage("You have passed the test cases. Click the submit code button.");
          } else if (resultField.Result === "False") {
            setSuccessMessage("Wrong Answer");
            setAdditionalMessage("You have not passed the test cases");
          }
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

  const handleSubmit = async () => {
    setProcessing(true);
    setIsSubmitted(true);
    
    try {
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

      const codeKey = getUserCodeKey(question.Qn_name);
      sessionStorage.setItem(codeKey, encryptData(sqlQuery));

      const statusKey = `submissionStatus_${subject}_${weekNumber}_${dayNumber}_${question.Qn_name}`;
      sessionStorage.setItem(statusKey, encryptData("submitted"));

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
                              {successMessage && <h5 className="m-0 ps-1" style={{ fontSize: '14px' }}>{successMessage}</h5>}
                              {additionalMessage && <p className="processingDivParaTag m-0 ps-1" style={{ fontSize: "10px" }}>{additionalMessage}</p>}
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
                              disabled={isSubmitted || processing || status || !isRunBtnClicked}
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

