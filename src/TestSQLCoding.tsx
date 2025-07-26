import React, { useState, useEffect } from "react";
import { getApiClient } from './utils/apiAuth';
import AceEditor from "react-ace";
import { useNavigate, useLocation } from "react-router-dom";
import "ace-builds/src-noconflict/mode-sql";
import "ace-builds/src-noconflict/theme-dreamweaver";
import SkeletonCode from './Components/EditorSkeletonCode'
import { secretKey } from "./constants";
import CryptoJS from "crypto-js";
import './SQLEditor.css';

interface Data {
  [key: string]: any;
}

interface TestCase {
  [key: string]: string;
}

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

const TestSQLCoding: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [questionStatuses, setQuestionStatuses] = useState<{[key: string]: string}>({});

  const encryptedStudentId = sessionStorage.getItem('StudentId');
  const decryptedStudentId = CryptoJS.AES.decrypt(encryptedStudentId!, secretKey).toString(CryptoJS.enc.Utf8);
  const studentId = decryptedStudentId;
  const encryptedTestId = sessionStorage.getItem("TestId") || "";
  const decryptedTestId = CryptoJS.AES.decrypt(encryptedTestId!, secretKey).toString(CryptoJS.enc.Utf8);
  const testId = decryptedTestId;
  const encryptedSubject = sessionStorage.getItem("Subject") || "";
  const decryptedSubject = CryptoJS.AES.decrypt(encryptedSubject!, secretKey).toString(CryptoJS.enc.Utf8);
  const subject = decryptedSubject;
  const encryptedSubjectId = sessionStorage.getItem("SubjectId") || "";
  const decryptedSubjectId = CryptoJS.AES.decrypt(encryptedSubjectId!, secretKey).toString(CryptoJS.enc.Utf8);
  const subjectId = decryptedSubjectId;
  const actualStudentId= CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualEmail= CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualName= CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);
 
  const getUserCodeKey = (qnName: string) => {
    return `userCode_${qnName}`;
  };

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

  const encryptData = (data: string): string => {
    return CryptoJS.AES.encrypt(data, secretKey).toString();
  };

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

  const updateTableForQuestion = async (question: Question) => {
    // Get tables from session storage
    const encryptedTables = sessionStorage.getItem('sqlTables');
    if (encryptedTables) {
      try {
        const decryptedTables = JSON.parse(CryptoJS.AES.decrypt(encryptedTables, secretKey).toString(CryptoJS.enc.Utf8));
        setAvailableTables(decryptedTables);

        if (decryptedTables.length > 0) {
          // Get the table name from question data and convert to lowercase for comparison
          const questionTableName = (question.question_data?.Table || question.Table || "").toLowerCase();
          console.log('Question table name for update:', questionTableName);
          
          // Find table that matches the question table name (case-insensitive)
          const matchingTable = decryptedTables.find((table: any) =>
            table.tab_name.toLowerCase() === questionTableName
          );

          if (matchingTable) {
            setTableData(matchingTable.data || []);
            setTableName(matchingTable.tab_name);
            console.log('Updated to matching table:', matchingTable.tab_name);
          } else {
            setTableData([]);
            setTableName(question.question_data?.Table || question.Table || "Table");
            console.log('No matching table found for question');
          }
        }
      } catch (error) {
        console.error("Error decrypting tables from session:", error);
      }
    }
  };

  useEffect(() => {
    const initializeData = async () => {
    // Get test data from location.state (passed from TestSection)
    const testData = (location.state as any)?.sectionData;
    
    if (testData && testData.qns_data && testData.qns_data.coding) {
      try {
          console.log('testData.qns_data.coding',testData.qns_data.coding);
        // Use the coding questions from the test data
        const codingQuestions = testData.qns_data.coding.map((q: Question) => {
          const savedCodeKey = getUserCodeKey(q.Qn_name);
          const savedCode = sessionStorage.getItem(savedCodeKey);

          if (savedCode !== null) {
            const decryptedCode = decryptData(savedCode);
              if (decryptedCode) {
            return { ...q, entered_ans: decryptedCode };
              }
          }
          return q;
        });

        setQuestions(codingQuestions);

        const urlParams = new URLSearchParams(location.search);
        const indexParam = urlParams.get('index');
        const initialIndex = indexParam ? parseInt(indexParam, 10) : 0;

        setCurrentQuestionIndex(initialIndex);
        setStatus(codingQuestions[initialIndex].status);
        setEnteredAns(codingQuestions[initialIndex].entered_ans);

        // Load question statuses from session storage
        const statuses = getQuestionStatusFromSession();
        setQuestionStatuses(statuses);

        const savedCodeKey = getUserCodeKey(codingQuestions[initialIndex].Qn_name);
        const savedCode = sessionStorage.getItem(savedCodeKey);
          setSqlQuery(savedCode !== null ? (decryptData(savedCode) || codingQuestions[initialIndex].user_answer) : codingQuestions[initialIndex].user_answer);

          // Load tables from session storage for the initial question
          await updateTableForQuestion(codingQuestions[initialIndex]);

        if (codingQuestions.length > 0) {
          // Initialize question data using the question_data structure
          const question = codingQuestions[initialIndex];
            
            // Set up data from question_data structure (same logic as handleQuestionChange)
            if (question.question_data) {
              setExpectedOutput(question.question_data.ExpectedOutput || question.ExpectedOutput || []);
              // setTestCases(question.question_data.TestCases || question.TestCases || []);
            } else {
          setExpectedOutput(question.ExpectedOutput || []);
          setTestCases(question.TestCases || []);
            }
            // Removed setTableData([]) and setTableName(...) here to avoid clearing the table after setting it
        }
      } catch (error) {
        console.error("Error processing coding questions:", error);
        navigate("/test-section");
      } finally {
        setLoading(false);
      }
    } else {
      // If no test data available, redirect back to test section
      console.error("No coding test data found, redirecting to test section");
      navigate('/test-section');
    }
    };

    initializeData();
  }, [location.search, location.state, navigate]);



  const handleQuestionChange = async (index: number) => {
  setIsRunBtnClicked(false);

  if (questions[currentQuestionIndex]?.Qn_name && sqlQuery) {
    const currentCodeKey = getUserCodeKey(questions[currentQuestionIndex].Qn_name);
    const encryptedCode = encryptData(sqlQuery);
    sessionStorage.setItem(currentCodeKey, encryptedCode);
    console.log('Saved query for question:', questions[currentQuestionIndex].Qn_name, 'Key:', currentCodeKey);
  }

  const nextQuestionKey = getUserCodeKey(questions[index].Qn_name);
  const savedCode = sessionStorage.getItem(nextQuestionKey);
  console.log('Loading query for question:', questions[index].Qn_name, 'Key:', nextQuestionKey, 'Saved:', !!savedCode);

  if (savedCode !== null) {
    const decryptedCode = decryptData(savedCode);
    if (decryptedCode) {
    setSqlQuery(decryptedCode);
      console.log('Loaded saved query:', decryptedCode.substring(0, 50) + '...');
    } else {
      setSqlQuery(questions[index].user_answer || '');
      console.log('Failed to decrypt saved query, using default');
    }
  } else {
    setSqlQuery(questions[index].user_answer || '');
    console.log('Loaded default query:', (questions[index].user_answer || '').substring(0, 50) + '...');
  }

  setCurrentQuestionIndex(index);
  setStatus(questions[index].status);
  setEnteredAns(questions[index].entered_ans);

  const statusKey = `status_${questions[index].Qn_name}`;
  const encryptedStatus = sessionStorage.getItem(statusKey);
  const isSubmitted = encryptedStatus ? (decryptData(encryptedStatus) === "submitted") : false;
  setIsSubmitted(isSubmitted);

  const question = questions[index];
  
  // Set up data from question_data structure
  if (question.question_data) {
    setExpectedOutput(question.question_data.ExpectedOutput || question.ExpectedOutput || []);
    // setTestCases(question.question_data.TestCases || question.TestCases || []);
    
    // Update table data for the new question
    await updateTableForQuestion(question);
  } else {
    // Fallback to original structure
    if (!Array.isArray(availableTables)) {
      return;
    }
    const initialTable = availableTables.find((table: any) =>
      table.tab_name === (question.Tables?.[0]?.tab_name || question.Table)
    ) || availableTables[0];

    if (initialTable) {
      setTableData(initialTable.data || []);
      setTableName(initialTable.tab_name);
    }

    setExpectedOutput(question.ExpectedOutput || []);
    // setTestCases(question.question_data?.TestCases || []);
  }

  setRunResponseTable([]);
  setRunResponseTestCases([]);
  setRunResponse(null);
  setSuccessMessage("");
  setAdditionalMessage("");
  setActiveTab("table");

  sessionStorage.setItem("codingCurrentQuestionIndex", index.toString());
};

  const handleNext = async () => {
    setIsRunBtnClicked(false);

    if (questions[currentQuestionIndex]?.Qn_name && sqlQuery) {
      const currentCodeKey = getUserCodeKey(questions[currentQuestionIndex].Qn_name);
      const encryptedCode = encryptData(sqlQuery);
      sessionStorage.setItem(currentCodeKey, encryptedCode);
    }

    setIsNextBtn(false);
    if (currentQuestionIndex === questions.length - 1) {
      handleTestSectionPage();
    } else {
      const nextIndex = (currentQuestionIndex + 1) % questions.length;
      setCurrentQuestionIndex(nextIndex);

      const nextQuestionKey = getUserCodeKey(questions[nextIndex].Qn_name);
      const savedCode = sessionStorage.getItem(nextQuestionKey);

      setStatus(questions[nextIndex].status);

      if (savedCode !== null) {
        const decryptedCode = decryptData(savedCode);
        if (decryptedCode) {
        setSqlQuery(decryptedCode);
        } else {
          setSqlQuery(questions[nextIndex].user_answer);
        }
      } else {
        setSqlQuery(questions[nextIndex].user_answer);
      }

      const question = questions[nextIndex];

      setEnteredAns(questions[nextIndex].entered_ans);

      // Set up data from question_data structure
      if (question.question_data) {
        setExpectedOutput(question.question_data.ExpectedOutput || question.ExpectedOutput || []);
        // setTestCases(question.question_data.TestCases || question.TestCases || []);
        
        // Update table data for the new question
        await updateTableForQuestion(question);
      } else {
        // Fallback to original structure
        if (!Array.isArray(availableTables)) {
          return;
        }
        const initialTable = availableTables.find((table: any) =>
          table.tab_name === (question.Tables?.[0]?.tab_name || question.Table)
        ) || availableTables[0];

        if (initialTable) {
          setTableData(initialTable.data || []);
          setTableName(initialTable.tab_name);
        }

        setExpectedOutput(question.ExpectedOutput || []);
        // setTestCases(question.question_data?.TestCases || []);
      }

      setRunResponseTable([]);
      setRunResponseTestCases([]);
      setRunResponse(null);
      setSuccessMessage("");
      setAdditionalMessage("");
      setIsSubmitted(false);
      setActiveTab("table");

      sessionStorage.setItem("codingCurrentQuestionIndex", nextIndex.toString());
    }
  };

  const handleCodeChange = (newCode: string) => {
    setSqlQuery(newCode);

    if (questions[currentQuestionIndex]?.Qn_name) {
      const codeKey = getUserCodeKey(questions[currentQuestionIndex].Qn_name);
      const encryptedCode = encryptData(newCode);
      sessionStorage.setItem(codeKey, encryptedCode);
      console.log('Auto-saved query for question:', questions[currentQuestionIndex].Qn_name, 'Key:', codeKey);
    }
  };

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);

    if (tab === "table") {
      const currentQuestion = questions[currentQuestionIndex];
      if (!Array.isArray(availableTables)) {
        return;
      }
      
      const questionTableName = (currentQuestion.question_data?.Table || currentQuestion.Table || "").toLowerCase();
      const matchingTable = availableTables.find((table: any) =>
        table.tab_name.toLowerCase() === questionTableName
      );

      if (matchingTable) {
        setTableData(matchingTable.data || []);
        setTableName(matchingTable.tab_name);
      } else {
        const initialTable = availableTables.find((table: any) =>
          table.tab_name === (currentQuestion.Tables?.[0]?.tab_name || currentQuestion.Table)
        ) || availableTables[0];

        if (initialTable) {
          setTableData(initialTable.data || []);
          setTableName(initialTable.tab_name);
        }
      }
    }
  };

  const handleTableNameClick = () => {
    setIsSelected(!isSelected);
  };

  const handleRun = async () => {
    setProcessing(true);
    setIsProcessing(true);
    setIsRunBtnClicked(true);

    if (questions[currentQuestionIndex]?.Qn_name) {
      const codeKey = getUserCodeKey(questions[currentQuestionIndex].Qn_name);
      const encryptedCode = encryptData(sqlQuery);
      sessionStorage.setItem(codeKey, encryptedCode);
    }

    setRunResponseTestCases([]);
    setRunResponseTable([]);
    setClickCount((prevCount) => prevCount + 1);
    setActiveTab("output");
    setSuccessMessage("");
    setAdditionalMessage("");
    const url = `${process.env.REACT_APP_BACKEND_URL}api/student/coding/sql/`;

    try {
      setActiveTab("output");
      const updatedSqlQuery = sqlQuery.trim().replace(/\n/g, " ").replace(/;$/, "");
      const sendData = {
        student_id: studentId,
        query: updatedSqlQuery.replace("/*Write a all SQl commands/clauses in UPPERCASE*/", "").replace(/\s*\n\s*/g, " \n "),
        ExpectedOutput: questions[currentQuestionIndex]?.question_data?.ExpectedOutput || [],
        TestCases: questions[currentQuestionIndex]?.question_data?.TestCases || [],
        week_number:0,
        day_number:0,
        subject_id:decryptData(sessionStorage.getItem("TestSubjectId") || ""),
        test_id:testId,
        subject:sessionStorage.getItem("TestSubject") || "",
        call_function:"",
        result:runResponseTestCases,
        Qn:questions[currentQuestionIndex].Qn_name,
      };
      if (updatedSqlQuery) {
        setExecutingQuery(true);
        const response = await getApiClient().post(url, sendData);
        const responseData = await response.data;
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
      setAdditionalMessage("There was an error executing the SQL query.");console.error("Error fetching executing SQL query data:", innerError);
            }
    finally {
      setIsProcessing(false);
      setProcessing(false);
    }
  };


  const handleSubmit = async () => {
  setIsProcessing(true);
  setProcessing(true);
  setIsSubmitted(true);
  const url= `${process.env.REACT_APP_BACKEND_URL}api/student/test/questions/submit/coding/`
  try {
    const postData = {
      student_id: studentId,
      test_id: testId,
      question_id: questions[currentQuestionIndex].Qn_name,
      answer: sqlQuery,
      subject_id: decryptData(sessionStorage.getItem("TestSubjectId") || ""),
      TestCases: questions[currentQuestionIndex]?.question_data?.TestCases || [],
      subject: sessionStorage.getItem("TestSubject") || "",
      final_score:"0/0",
      result: runResponseTestCases,
    };

    const response = await getApiClient().put(url, postData);

    const responseData = response.data;
    if(responseData.message == "Test Already Completed"){
    navigate('/test')
    }
    
    // Update question status in session storage after successful submission
    const sessionKey = `${testId}_questionStatus`;
    const sessionStatus = sessionStorage.getItem(sessionKey);
    
    if (sessionStatus) {
      try {
        const decryptedStatuses = CryptoJS.AES.decrypt(sessionStatus, secretKey).toString(CryptoJS.enc.Utf8);
        const statuses = JSON.parse(decryptedStatuses);
        
        // Update the status for this question to "Submitted"
        statuses[`coding_${questions[currentQuestionIndex].Qn_name}`] = "Submitted";
        
        // Re-encrypt and store updated statuses
        const encryptedStatuses = CryptoJS.AES.encrypt(JSON.stringify(statuses), secretKey).toString();
        sessionStorage.setItem(sessionKey, encryptedStatuses);
        
        // Update local state
        setQuestionStatuses(statuses);
        
      } catch (error) {
        console.error("Error updating session status:", error);
      }
    }
    
    const codeKey = getUserCodeKey(questions[currentQuestionIndex].Qn_name);
    const encryptedCode = encryptData(sqlQuery);
    sessionStorage.setItem(codeKey, encryptedCode);

    const statusKey = `status_${questions[currentQuestionIndex].Qn_name}`;
    const encryptedStatus = encryptData("submitted");
    sessionStorage.setItem(statusKey, encryptedStatus);

    setIsNextBtn(true);
  } 
  catch (innerError: any) {
    setSuccessMessage("Error");
    setAdditionalMessage("There was an error executing the code.");console.error("Error fetching executing the sql code data:", innerError);
            }
     finally {
    setIsProcessing(false);
    setProcessing(false);
  }
};

  const handleTestSectionPage = () => {
    sessionStorage.setItem("codingCurrentQuestionIndex", currentQuestionIndex.toString());
    // Navigate back to test section with the same data
    navigate('/test-section', { 
      state: { 
        sectionData: (location.state as any)?.sectionData 
      } 
    });
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
    <div className="container-fluid p-0" style={{ height: '100%', overflowX: "hidden", overflowY: "hidden", backgroundColor: "#f2eeee" }}>
      <div className="p-0 my-0" style={{ backgroundColor: "#F2EEEE", marginRight: '10px' }}>
        <div className="container-fluid p-0 pt-2" style={{ maxWidth: "100%", overflowX: "hidden", overflowY: "auto", backgroundColor: "#f2eeee" }}>
          <div className="row g-2">
            <div className="col-12">
              <div className="" style={{ height: `calc(100vh - 90px)`, overflow: "hidden", padding: '0px 0px 15px 0px' }}>
                <div className="d-flex" style={{ height: '100%', width: '100%' }}>
                  {/* Question List */}
                  <div className="col-1 lg-8" style={{ width: "70px", display: "flex", flexDirection: "column", paddingRight: "15px", height: "100%", overflowY: "auto" }}>
                    {questions.map((_, index) => (
                      <button
                        key={index}
                        className="btn rounded-2 mb-2 px-1 mx-auto"
                        style={{
                          width: "50px",
                          height: "50px",
                          backgroundColor: (() => {
                            const questionStatus = questionStatuses[`coding_${questions[index]?.Qn_name}`];
                            if (questionStatus === "Submitted" || questionStatus === "Attempted") {
                              return "#42FF58"; // Green for submitted/attempted
                            } else if (currentQuestionIndex === index) {
                              return "grey"; // Grey for current question
                            } else {
                              return "#fff"; // White for others
                            }
                          })(),
                          color: currentQuestionIndex === index ? "#fff" : "#000",
                          cursor: "pointer",
                          boxShadow: "#888 1px 2px 5px 0px"
                        }}
                        onClick={() => handleQuestionChange(index)}
                        // disabled={isProcessing}
                      >
                        Q{index + 1}
                      </button>
                    ))}
                  </div>

                  <div className="col-5 lg-8 bg-white " style={{ height: "100%", display: "flex", flexDirection: "column", marginLeft: "-10px", marginRight: "10px" }}>
                    <div className="bg-white" style={{ height: "45%", backgroundColor: "#E5E5E533" }}>
                      <div className="p-3 flex-grow-1 overflow-auto" >
                        <p>{questions[currentQuestionIndex]?.question_data?.Qn || questions[currentQuestionIndex]?.Qn || "Question not available"}</p>
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
                              disabled={isProcessing}
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
                              disabled={isProcessing}
                            >
                              Expected Output
                            </button>
                          </li>
                        </ul>
                        <div className="tab-content">
                          <div role="tabpanel" className={`ms-3 fade tab-pane ${activeTab === "table" ? "active show" : ""}`} style={{ height: "35vh", overflowX: "auto" }}>
                            <div className="d-flex flex-row">
                              <div className="inline-block" style={{ marginBottom: "-1px" }}>
                                <div
                                  className="px-3 py-2 text-white "
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
                          <div role="tabpanel" className={`ms-3 fade tab-pane ${activeTab === "output" ? "active show" : ""}`} style={{ height: "40vh", overflowX: "auto", fontSize: "12px" }}>
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

                  <div className="col-6 lg-8" style={{ height: "100%", display: "flex", flexDirection: "column", width: '55.1%' }}>

                    <div className="bg-white me-3" style={{ height: "45%", backgroundColor: "#E5E5E533" }}>
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
                            disabled={isProcessing}
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
                            disabled={isProcessing || isSubmitted || status == true || !isRunBtnClicked}
                          >
                            {(isSubmitted || status == true) ? "SUBMITTED" : "SUBMIT CODE"}
                          </button>

                          {((isSubmitted || status == true || questions[currentQuestionIndex].question_status == "Submitted"))
                            ?
                            <button
                              className="btn btn-sm btn-light processingDivButton"
                              style={{
                                whiteSpace: "nowrap",
                                fontSize: "12px",
                                minWidth: "70px",
                                boxShadow: "#888 1px 2px 5px 0px",
                                height: "30px"
                              }}
                              onClick={handleNext}
                              disabled={isProcessing}
                            >
                              {currentQuestionIndex == questions.length - 1 ? "Test Section" : "NEXT"}
                            </button> :
                            null
                          }
                        </div>
                      </div>
                    </div>

                    <div className="bg-white me-3" style={{ height: "48%", backgroundColor: "#E5E5E533" }}>
                      <div className="p-3 overflow-auto" style={{ height: "calc(100% - 10px)" }}>
                        {runResponseTable.length > 0 && (
                          <table className="table table-bordered table-sm rounded" style={{ maxWidth: "100vw", width: "20vw", fontSize: "12px" }}>
                            <thead>
                              <tr>
                                {Object.keys(runResponseTable[0]).map((header) => (
                                  <th key={header} className="text-center" style={{ maxWidth: `${100 / Object.keys(tableData[0]).length}vw` }}>
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {runResponseTable.map((row, index) => (
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
                        <div className="mt-3">
                          {runResponseTestCases.map((testCase, index) => (
                            <div
                              key={index}
                              className="d-flex align-items-center mb-2 border border-ligth shadow bg-white p-2 rounded-2"
                              style={{ width: "fit-content", fontSize: "12px" }}
                            >
                              <span className="me-2">{Object.keys(testCase)[0]}:</span>
                              <span style={{ color: Object.values(testCase)[0] === "Passed" ? "blue" : Object.values(testCase)[0] === "True" ? "blue" : "red" }}>
                                {Object.values(testCase)[0]}
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

export default TestSQLCoding;
