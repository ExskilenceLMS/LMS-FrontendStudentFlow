import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getApiClient } from "./utils/apiAuth";
import { useAPISWR } from "./utils/swrConfig";
import CryptoJS from "crypto-js";
import { secretKey } from "./constants";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-sql";
import "ace-builds/src-noconflict/theme-dreamweaver";
import SkeletonCode from './Components/EditorSkeletonCode'
import "./SQLEditor.css";

interface Data {
  [key: string]: any;
}

interface TestCase {
  [key: string]: string;
}

interface Question {
  Name: string;
  Qn: string;
  Table: string;
  ExpectedOutput: Data[];
  TestCases: TestCase[];
  Tables?: { tab_name: string; data: Data[] }[];
  Qn_name: string;
  status: boolean;
  entered_ans: string;
  Query: string;
}

const SQLEditor: React.FC = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [tableData, setTableData] = useState<Data[]>([]);
  const [expectedOutput, setExpectedOutput] = useState<Data[]>([]);
  const [activeTab, setActiveTab] = useState<string>("table");
  const [sqlQuery, setSqlQuery] = useState<string>("");
  const [runResponse, setRunResponse] = useState<any>(null);
  const [runResponseTable, setRunResponseTable] = useState<Data[]>([]);
  const [runResponseTestCases, setRunResponseTestCases] = useState<TestCase[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [additionalMessage, setAdditionalMessage] = useState<string>("");
  const [executingQuery, setExecutingQuery] = useState<boolean>(false);
  const [clickCount, setClickCount] = useState<number>(0);
  const [tableName, setTableName] = useState<string>("");
  const [isSelected, setIsSelected] = useState<boolean>(false);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isRunBtnClicked, setIsRunBtnClicked] = useState<boolean>(false);
  const [status, setStatus] = useState<boolean>(false);
  const [Ans, setAns] = useState<string>("");
  const [enteredAns, setEnteredAns] = useState<string>("");
  const [isNextBtn, setIsNextBtn] = useState<boolean>(false);
  const [availableTables, setAvailableTables] = useState<{ tab_name: string; data: Data[] }[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");

  // Use SWR for tables API with 1-day cache
  const tablesUrl = `${process.env.REACT_APP_BACKEND_URL}api/student/practicecoding/tables/`;
  const { data: tablesData } = useAPISWR<{ tables: any[] }>(tablesUrl);

  const encryptedStudentId = sessionStorage.getItem('StudentId');
  const decryptedStudentId = CryptoJS.AES.decrypt(encryptedStudentId!, secretKey).toString(CryptoJS.enc.Utf8);
  const studentId = decryptedStudentId;
  const encryptedSubjectId = sessionStorage.getItem('SubjectId');
  const decryptedSubjectId = CryptoJS.AES.decrypt(encryptedSubjectId!, secretKey).toString(CryptoJS.enc.Utf8);
  const subjectId = decryptedSubjectId;
  const encryptedSubject = sessionStorage.getItem('Subject');
  const decryptedSubject = CryptoJS.AES.decrypt(encryptedSubject!, secretKey).toString(CryptoJS.enc.Utf8);
  const subject = decryptedSubject;
  const encryptedWeekNumber = sessionStorage.getItem('WeekNumber');
  const decryptedWeekNumber = CryptoJS.AES.decrypt(encryptedWeekNumber!, secretKey).toString(CryptoJS.enc.Utf8);
  const weekNumber = decryptedWeekNumber;
  const encryptedDayNumber = sessionStorage.getItem('DayNumber');
  const decryptedDayNumber = CryptoJS.AES.decrypt(encryptedDayNumber!, secretKey).toString(CryptoJS.enc.Utf8);
  const dayNumber = decryptedDayNumber;
  const courseId = CryptoJS.AES.decrypt(sessionStorage.getItem('CourseId')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualStudentId= CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualEmail= CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualName= CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);
 
  const getUserCodeKey = (qnName: string) => {
    return `userCode_${subject}_${weekNumber}_${dayNumber}_${qnName}`;
  };

  const encryptData = (data: string) => {
    return CryptoJS.AES.encrypt(data, secretKey).toString();
  };

  const decryptData = (encryptedData: string) => {
    const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  };

  const tableNames = questions[currentQuestionIndex]?.Table.split(',').map(name => name.trim()) || [];

  useEffect(() => {
    if (tableNames.length > 0) {
      setSelectedTable(tableNames[0]);
    }
  }, [tableNames]);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const url = `${process.env.REACT_APP_BACKEND_URL}api/student/practicecoding/${actualStudentId}/${subject}/${subjectId}/${dayNumber}/${weekNumber}/${sessionStorage.getItem('currentSubTopicId')}/`;
        const response = await getApiClient().get(url);
        const questionsData = response.data.questions;
        setQuestions(questionsData);
        
        if (questionsData.length > 0) {
          const firstQuestion = questionsData[0];
          setAns(firstQuestion.entered_ans || "");
          setEnteredAns(firstQuestion.entered_ans || "");
          
          const statusKey = `submissionStatus_${subject}_${weekNumber}_${dayNumber}_${firstQuestion.Qn_name}`;
          const submissionStatus = sessionStorage.getItem(statusKey);
          setStatus(submissionStatus ? decryptData(submissionStatus) === "submitted" : firstQuestion.status);
        }
      } catch (error) {
        console.error("Error fetching questions:", error);
      }
    };

    // Use cached tables data from SWR
    if (tablesData && tablesData.tables) {
      setAvailableTables(tablesData.tables);
      
      if (questions.length > 0) {
        initializeQuestionData(questions[0], tablesData.tables);
      }

      if (tablesData.tables.length > 0) {
        const initialTable = tablesData.tables.find((table: any) =>
          table.tab_name === tableName
        );

        if (initialTable) {
          setTableData(initialTable.data || []);
        } else {
          setTableData(tablesData.tables[0].data || []);
          setTableName(tablesData.tables[0].tab_name);
        }
      }
      setLoading(false);
    }

    fetchQuestions();
  }, [tablesData, questions.length]);

  const handleCodeChange = (newCode: string) => {
    setAns(newCode);

    if (newCode === "") {
      setEnteredAns("");
    }

    if (questions[currentQuestionIndex]?.Qn_name) {
      const codeKey = getUserCodeKey(questions[currentQuestionIndex].Qn_name);
      sessionStorage.setItem(codeKey, encryptData(newCode));
    }
  };

  const initializeQuestionData = (question: Question, tables: { tab_name: string; data: Data[] }[]) => {
    const tableNames = question.Table.split(',').map(name => name.trim());
    // Use question-specific tables if available, otherwise fall back to global tables
    const tablesToUse = question.Tables && question.Tables.length > 0 ? question.Tables : tables;
    // Set selectedTable to the first table name (case-insensitive)
    const firstTableName = tableNames[0];
    setSelectedTable(firstTableName);
    // Find the data for the selected table (case-insensitive)
    const selectedTableData = tablesToUse.find(table => table.tab_name.toLowerCase() === firstTableName.toLowerCase());
    if (selectedTableData) {
      setTableData(selectedTableData.data || []);
      setTableName(selectedTableData.tab_name);
    } else {
      setTableData([]);
      setTableName(firstTableName);
    }
    setExpectedOutput(question.ExpectedOutput || []);
    setTestCases(question.TestCases || []);
  };

  const handleQuestionChange = (index: number) => {
    setAns("");
    setIsRunBtnClicked(false);

    if (questions[currentQuestionIndex]?.Qn_name && Ans) {
      const currentCodeKey = getUserCodeKey(questions[currentQuestionIndex].Qn_name);
      sessionStorage.setItem(currentCodeKey, encryptData(Ans));
    }

    const nextQuestionKey = getUserCodeKey(questions[index].Qn_name);
    const savedCode = sessionStorage.getItem(nextQuestionKey);

    if (savedCode !== null) {
      setEnteredAns(decryptData(savedCode));
      setAns(decryptData(savedCode));
    } else {
      setEnteredAns(questions[index].entered_ans || "");
      setAns(questions[index].entered_ans || "");
    }

    setCurrentQuestionIndex(index);

    const statusKey = `submissionStatus_${subject}_${weekNumber}_${dayNumber}_${questions[index].Qn_name}`;
    const submissionStatus = sessionStorage.getItem(statusKey);
    setStatus(submissionStatus ? decryptData(submissionStatus) === "submitted" : questions[index].status);

    const question = questions[index];
    
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

    setExpectedOutput(question.ExpectedOutput || []);
    setTestCases(question.TestCases || []);

    setSqlQuery("");
    setRunResponseTable([]);
    setRunResponseTestCases([]);
    setSuccessMessage("");
    setAdditionalMessage("");
    setIsSubmitted(false);
    setActiveTab("table");
  };

  const handleNext = () => {
    setIsRunBtnClicked(false);

    if (questions[currentQuestionIndex]?.Qn_name && Ans) {
      const currentCodeKey = getUserCodeKey(questions[currentQuestionIndex].Qn_name);
      sessionStorage.setItem(currentCodeKey, encryptData(Ans));
    }

    setIsNextBtn(false);

    if (currentQuestionIndex === questions.length - 1) {
      navigate('/Subject-Roadmap', { replace: true });
      return;
    }

    const nextIndex = currentQuestionIndex + 1;
    const nextQuestion = questions[nextIndex];
    const nextQuestionKey = getUserCodeKey(nextQuestion.Qn_name);
    const savedCode = sessionStorage.getItem(nextQuestionKey);

    setCurrentQuestionIndex(nextIndex);
    setStatus(nextQuestion.status);

    const codeToSet = savedCode ? decryptData(savedCode) : nextQuestion.entered_ans ?? "";
    setEnteredAns(codeToSet);
    setAns(codeToSet);

    const tableNames = nextQuestion.Table.split(',').map(name => name.trim());
    
    // Use question-specific tables if available, otherwise fall back to global tables
    const tablesToUse = nextQuestion.Tables && nextQuestion.Tables.length > 0 ? nextQuestion.Tables : availableTables;
    
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

    setExpectedOutput(nextQuestion.ExpectedOutput || []);
    setTestCases(nextQuestion.TestCases || []);

    setSqlQuery("");
    setRunResponseTable([]);
    setRunResponseTestCases([]);
    setSuccessMessage("");
    setAdditionalMessage("");
    setIsSubmitted(false);
    setActiveTab("table");
  };

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);

    if (tab === "table") {
      const currentQuestion = questions[currentQuestionIndex];
      if (!currentQuestion) {
        return;
      }
      
      const tableNames = currentQuestion.Table.split(',').map(name => name.trim());
      
      // Use question-specific tables if available, otherwise fall back to global tables
      const tablesToUse = currentQuestion.Tables && currentQuestion.Tables.length > 0 ? currentQuestion.Tables : availableTables;
      
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
  };

  const handleRun = async () => {
    setIsRunBtnClicked(true);

    if (questions[currentQuestionIndex]?.Qn_name) {
      const codeKey = getUserCodeKey(questions[currentQuestionIndex].Qn_name);
      sessionStorage.setItem(codeKey, encryptData(Ans));
    }

    setRunResponseTestCases([]);
    setRunResponseTable([]);
    setClickCount((prevCount) => prevCount + 1);
    setActiveTab("output");
    setProcessing(true);
    setSuccessMessage("");
    setAdditionalMessage("");
    const url = `${process.env.REACT_APP_BACKEND_URL}api/student/coding/sql/`;
    try {
      setActiveTab("output");
      const updatedSqlQuery = Ans;
      const sendData = {
        student_id: studentId,
        week_number: weekNumber,
        day_number: dayNumber,
        subject: subject,
        subject_id: subjectId,
        Qn: questions[currentQuestionIndex].Qn_name,
        query: updatedSqlQuery.replace("/*Write a all SQl commands/clauses in UPPERCASE*/", "").replace(/\s*\n\s*/g, " \n "),
        ExpectedOutput: questions[currentQuestionIndex].ExpectedOutput || [],
        TestCases: questions[currentQuestionIndex].TestCases || [],
        batch_id: decryptData(sessionStorage.getItem("BatchId") || ""),
      };
      if (updatedSqlQuery) {
        setExecutingQuery(true);
        const response = await getApiClient().post(url, sendData);
        const responseData = response.data;
        setRunResponse(responseData);

        setRunResponseTable(responseData.data);
        setRunResponseTestCases(responseData.TestCases);
        setExecutingQuery(false);
        const resultField = responseData.TestCases.find((testCase: TestCase) => testCase.Result !== undefined);
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
    } catch (innerError: any) {
      setSuccessMessage("Error");
      setAdditionalMessage("There was an error executing the SQL query.");console.error("Error fetching sql query data:", innerError);
    }
    finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async () => {
    setProcessing(true);
    setIsSubmitted(true);
    const url =`${process.env.REACT_APP_BACKEND_URL}api/student/coding/`
    try {
      const postData = {
        student_id: studentId,
        week_number: weekNumber,
        day_number: dayNumber,
        subject: subject,
        subject_id: subjectId,
        Qn: questions[currentQuestionIndex].Qn_name,
        Ans: Ans,
        CallFunction: "",
        Result: runResponseTestCases,
        Attempt: 0,
        final_score:"0/0",
        course_id:courseId,
        batch_id: decryptData(sessionStorage.getItem("BatchId") || "")
      };

      const response = await getApiClient().put(
        url,
        postData
      );

      const responseData = response.data;
      const codeKey = getUserCodeKey(questions[currentQuestionIndex].Qn_name);
      sessionStorage.setItem(codeKey, encryptData(Ans));

      const statusKey = `submissionStatus_${subject}_${weekNumber}_${dayNumber}_${questions[currentQuestionIndex].Qn_name}`;
      sessionStorage.setItem(statusKey, encryptData("submitted"));

      setIsNextBtn(true);
    } catch (innerError: any) {
      setSuccessMessage("Error");
      setAdditionalMessage("There was an error executing the code.");console.error("Error fetching sql query data:", innerError);
    }
    finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="container-fluid p-0" style={{ height: "100vh", maxWidth: "100%", overflowX: "hidden", backgroundColor: "#f2eeee" }}>
        <div className="p-0 my-0 me-2" style={{ backgroundColor: "#F2EEEE" }}>
          <SkeletonCode />
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0" style={{ height: 'calc(100vh - 70px)', overflowX: "hidden", overflowY: "hidden", backgroundColor: "#f2eeee" }}>
      <div className="p-0 my-0" style={{ backgroundColor: "#F2EEEE", marginRight: '10px' }}>
        <div className="container-fluid p-0 pt-2" style={{ maxWidth: "100%", overflowX: "hidden", overflowY: "auto", backgroundColor: "#f2eeee" }}>
          <div className="row g-2">
            <div className="col-12">
              <div className="" style={{ height: "100vh", overflow: "hidden", padding: '0px 0px 65px 0px' }}>
                <div className="d-flex" style={{ height: '100%', width: '100%' }}>
                  {/* Question List */}
                  <div className="col-1 lg-8 pb-2" style={{ width: "70px", display: "flex", flexDirection: "column", paddingRight: "15px" , overflowY: "auto"}}>
                    {questions.map((_, index) => (
                      <button
                        key={index}
                        className="btn rounded-2 mb-2 px-1 mx-auto"
                        style={{
                          width: "50px",
                          height: "50px",
                          backgroundColor: currentQuestionIndex === index ? "#42FF58" : "#FFFFFF",
                          color: "#000",
                          cursor: "pointer",
                          boxShadow: "#888 1px 2px 5px 0px"
                        }}
                        onClick={() => handleQuestionChange(index)}
                      >
                        Q{index + 1}
                      </button>
                    ))}
                  </div>
                  <div className="col-5 lg-8 bg-white" style={{ height: "100%", display: "flex", flexDirection: "column", marginLeft: "-10px", marginRight: "10px" }}>
                        <div className="bg-white" style={{ height: "45%", backgroundColor: "#E5E5E533" }}>
                          <div className="p-3" style={{ height: "100%", overflowY: "auto", overflowX: "hidden" }}>
                            <p style={{ wordWrap: "break-word", whiteSpace: "pre-wrap" }}>{questions[currentQuestionIndex]?.Qn}</p>
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
                            <div className="tab-content">
                              <div role="tabpanel" className={`ms-3 fade tab-pane ${activeTab === "table" ? "active show" : ""}`} style={{ height: "40vh", overflowX: "auto" }}>
                                <ul className="nav nav-pills" style={{ fontSize: "12px", display: "flex", flexWrap: "wrap" }}>
                                  {tableNames.map((tableName, index) => (
                                    <li key={index} className="nav-item" role="presentation">
                                      <button
                                        type="button"
                                        className={`nav-link me-2 custom-tab ${selectedTable === tableName ? "active" : ""}`}
                                        onClick={() => {
                                          setSelectedTable(tableName);
                                        }}
                                      >
                                        {tableName}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                                {/* Always display the data for selectedTable, not just tableData */}
                                {(() => {
                                  const currentQuestion = questions[currentQuestionIndex];
                                  const tablesToUse = currentQuestion?.Tables && currentQuestion.Tables.length > 0 ? currentQuestion.Tables : availableTables;
                                  const selectedTableData = tablesToUse.find(table => table.tab_name.toLowerCase() === selectedTable.toLowerCase());
                                  if (selectedTable && selectedTableData && selectedTableData.data && selectedTableData.data.length > 0) {
                                    return (
                                      <div className="table-responsive">
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
                              <div role="tabpanel" className={`ms-3 fade tab-pane ${activeTab === "output" ? "active show" : ""}`} style={{ height: "40vh", overflowX: "auto", fontSize: "12px" }}>
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
                      </div>


                  <div className="col-6 lg-8" style={{ height: "100%", display: "flex", flexDirection: "column", width: '55.1%' }}>

                    <div className="bg-white me-3" style={{ height: "45%", backgroundColor: "#E5E5E533" }}>
                      <AceEditor
                        mode="sql"
                        theme="dreamweaver"
                        onChange={handleCodeChange}
                        value={Ans || enteredAns}
                        fontSize={14}
                        placeholder="Write all SQL commands/clauses in UPPERCASE"
                        showPrintMargin={false}
                        showGutter={false}
                        highlightActiveLine={false}
                        wrapEnabled={true}
                        className="pe-3"
                        style={{ width: "95%", height: "calc(100% - 60px)", marginTop: "20px", margin: '15px' }}
                      />
                    </div>

                    <div style={{ height: "6%", marginRight: '37px', backgroundColor: "#E5E5E533" }} className="d-flex flex-column justify-content-center processingDiv">
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

                          {((isSubmitted || status)) ?
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
                              onClick={handleNext}
                            >
                              NEXT
                            </button> :
                            null
                          }
                        </div>
                      </div>
                    </div>

                    <div className="bg-white me-3" style={{ height: "48%", backgroundColor: "#E5E5E533" }}>
                      <div className="p-3 overflow-auto" style={{ height: "calc(100% - 10px)" }}>
                        {runResponseTable.length > 0 && runResponseTable[0] && (
                          <>
                            {/* Check if the first row contains an error */}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SQLEditor;
