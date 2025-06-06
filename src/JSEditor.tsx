import React, { useState, useEffect, useRef, useCallback, ChangeEvent, MouseEvent as ReactMouseEvent } from "react";
import { Button, Modal } from "react-bootstrap";
import CodeMirror from "@uiw/react-codemirror";
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faCircleXmark, faExpand } from '@fortawesome/free-solid-svg-icons';
import axios from "axios";
import { useNavigate } from "react-router-dom";
import SkeletonCode from './Components/EditorSkeletonCode'
import { secretKey } from "./constants";
import CryptoJS from "crypto-js";

interface QuestionData {
  Qn: string;
  Sample_img: string;
  JS_Messages: string[];
  Tabs: string[];
  Qn_name: string;
  Qn_No: string;
  html_file: string;
  css_file: string;
  js_file: string;
  UserAns: string;
}

interface ValidationStatus {
  js: {
    correct: number;
    incorrect: number;
    closures: string;
    brackets: string;
    [key: number]: string;
  };
}

const JSEditor: React.FC = () => {
  const navigate = useNavigate();
  const [questionData, setQuestionData] = useState<QuestionData | null>(null);
  const [jsEdit, setJsEdit] = useState('');
  const [htmlEdit, setHtmlEdit] = useState('');
  const [cssEdit, setCssEdit] = useState('');
  const [activeTab, setActiveTab] = useState('js');
  const [loading, setLoading] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [displ, setdispl] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>({ js: { correct: 0, incorrect: 0, closures: 'pending', brackets: 'pending' } });
  const [splitOffset, setSplitOffset] = useState(window.innerWidth / 2);
  const [isDragging, setIsDragging] = useState(false);
  const [initialX, setInitialX] = useState<number | null>(null);
  const [editorHeightPercentage, setEditorHeightPercentage] = useState(45);
  const [outputHeightPercentage, setOutputHeightPercentage] = useState(45);
  const [isDraggingVertically, setIsDraggingVertically] = useState(false);
  const [initialY, setInitialY] = useState<number | null>(null);
  const [DOMSTR, setDOMSTR] = useState('HTML DOM structure');
  const [DOMTRUE, setDOMTRUE] = useState(false);
  const [isJSSubmitted, setIsJSSubmitted] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
const encryptedStudentId = sessionStorage.getItem('StudentId');
  const decryptedStudentId = CryptoJS.AES.decrypt(encryptedStudentId!, secretKey).toString(CryptoJS.enc.Utf8);
  const studentId = decryptedStudentId;
  const actualStudentId= CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualEmail= CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualName= CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);
 
 

  useEffect(() => {
    const fetchQuestion = async () => {
      const url=`${process.env.REACT_APP_BACKEND_URL}frontend/qns/data/`
      try {
        const response = await axios.post(
          url,
          {
            StudentId: "24TEST0108",
            Course: "Java_Script",
            Qn_name: "QJS2408010000AAXXEM06"
          }
        );
        setQuestionData(response.data.Question);
        setJsEdit(response.data.Question.UserAns || '');
        setHtmlEdit(response.data.Question.html_file || '');
        setCssEdit(response.data.Question.css_file || '');
      } 
      catch (innerError: any) {
            const errorData = innerError.response?.data || {
                message: innerError.message,
                stack: innerError.stack
            };
 
            const body = {
                student_id: actualStudentId,
                Email: actualEmail,
                Name: actualName,
                URL_and_Body: `${url}\n + ""`,
                error: errorData.error,
            };
 
            try {
                await axios.post(
                `${process.env.REACT_APP_BACKEND_URL}api/errorlog/`,
                body
                );
            } catch (loggingError) {
                console.error("Error logging the JS Editor error:", loggingError);
            }
 
            console.error("Error fetching JS Editor question data:", innerError);
            }
 finally {
        setLoading(false);
      }
    };

    fetchQuestion();
  }, []);

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setInitialX(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !initialX) return;
    const dx = e.clientX - initialX;
    setSplitOffset(splitOffset + dx);
    setInitialX(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setInitialX(null);
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, initialX]);

  const handleVerticalMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    setIsDraggingVertically(true);
    setInitialY(e.clientY);
  };

  const handleVerticalMouseMove = (e: MouseEvent) => {
    if (!isDraggingVertically || !initialY) return;

    const dy = e.clientY - initialY;
    const vhUnitChange = (dy / window.innerHeight) * 100;

    setEditorHeightPercentage((prevHeight) => {
      const newHeight = Math.max(30, Math.min(70, prevHeight + vhUnitChange));
      setOutputHeightPercentage(94 - newHeight);
      return newHeight;
    });

    setInitialY(e.clientY);
  };

  const handleVerticalMouseUp = () => {
    setIsDraggingVertically(false);
    setInitialY(null);
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleVerticalMouseMove);
    window.addEventListener('mouseup', handleVerticalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleVerticalMouseMove);
      window.removeEventListener('mouseup', handleVerticalMouseUp);
    };
  }, [isDraggingVertically, initialY]);

  const handleTabClick = (tabKey: string) => {
    setActiveTab(tabKey);
  };

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleCloseAlert = () => {
    setShowAlert(false);
    setdispl('');
  };

  const Handlepreview = () => {
    setdispl('output');
    setShowAlert(true);
  };
  

  const onChangeJavaScript = useCallback((value: string, viewUpdate: any) => {
    setJsEdit(value);
    handleCheckCode();
  }, [jsEdit]);

  const handleCheckCode = () => {
    let codeToTest: string;
    switch (activeTab) {
      case 'js':
        codeToTest = jsEdit;
        break;
      default:
        codeToTest = '';
        break;
    }

    sendDataToCheck(activeTab, codeToTest);
  };

  const sendDataToCheck = (type: string, code: string) => {
    if (!questionData) {
      return;
    }

    const jsValidationData = questionData.JS_Messages;
    let newValidationStatus: ValidationStatus['js'] = { correct: 0, incorrect: 0, closures: 'pending', brackets: 'pending' };

    if (type === 'js') {
      const userCode = typeof code === 'string' ? code.split("\n") : code;
      const expectedCode = Array.isArray(questionData.js_file) ? questionData.js_file : questionData.js_file.split("\n");

      const standardizeCode = (line: string) => {
        const trimmedLine = line.trim();
        if (trimmedLine === '}' || trimmedLine === ']' || trimmedLine === ')' || trimmedLine === '' || trimmedLine === '};' || trimmedLine === '];' || trimmedLine === ');') {
          return '';
        }
        return trimmedLine
          .replace(/\n/g, "")
          .replace(/"/g, "'")
          .replace(/\s+/g, '')
          .trim();
      };

      const standardizedUserCode = userCode.map(standardizeCode).filter(line => line !== '');
      const standardizedExpectedCode = expectedCode.map(standardizeCode).filter(line => line !== '');

      // Check if userCode is empty
      if (standardizedUserCode.length === 0) {
        // Reset validation status to initial state
        setValidationStatus(prevStatus => ({
          ...prevStatus,
          js: {
            correct: 0,
            incorrect: 0,
            closures: 'pending',
            brackets: 'pending',
          }
        }));
        return;
      }

      let satisfiedRequirementsCount = 0;

      // Line-by-line comparison
      standardizedUserCode.forEach((userLine, index) => {
        if (userLine === '' || typeof standardizedExpectedCode[index] === 'undefined') return;
        const expectedLine = standardizedExpectedCode[index];
        const isMatch = userLine === expectedLine;

        if (isMatch) {
          satisfiedRequirementsCount++;
        }

        newValidationStatus[index] = isMatch ? 'correct' : 'incorrect';
      });

      // Validate closures
      const validateClosures = (codeArray: string[]) => {
        const openingBraces = ['{', '[', '('];
        const closingBraces = ['}', ']', ')'];
        let stack = [];

        for (let line of codeArray) {
          for (let i = 0; i < line.length; i++) {
            const char = line[i];

            // Check for opening braces
            if (openingBraces.includes(char)) {
              stack.push(char);
            }

            // Check for closing braces
            else if (closingBraces.includes(char)) {
              const lastBrace = stack.pop();

              // Validate if it's a correct closure for the current character
              if (lastBrace !== undefined && closingBraces.indexOf(char) !== openingBraces.indexOf(lastBrace)) {
                return false;
              }

              // Special case for '})' combination
              if (char === '}' && i > 0 && line[i - 1] === ')') {
                // Ensure last closed parenthesis matches
                const secondLastBrace = stack.pop();
                if (secondLastBrace !== '(') {
                  return false;
                }
              }
            }
          }
        }

        // Ensure no unclosed braces remain
        return stack.length === 0;
      };

      const userClosuresValid = validateClosures(userCode);
      const expectedClosuresValid = validateClosures(standardizedExpectedCode);

      newValidationStatus.closures = (userClosuresValid && expectedClosuresValid) ? 'correct' : 'incorrect';

      // Validate brackets
      const countBrackets = (codeArray: string[]) => {
        let openingCount = 0, closingCount = 0;
        codeArray.forEach(line => {
          openingCount += (line.match(/{/g) || []).length;
          closingCount += (line.match(/}/g) || []).length;
        });
        return { openingCount, closingCount };
      };

      const userBrackets = countBrackets(userCode);
      newValidationStatus.brackets = (userBrackets.openingCount === userBrackets.closingCount) ? 'correct' : 'incorrect';

      // Set the length of common satisfied requirements
      setValidationStatus(prevStatus => ({
        ...prevStatus,
        js: newValidationStatus
      }));
    }
  };

  const renderEditor = () => {
    switch (activeTab) {
      case 'html':
        return (
          <CodeMirror
            className="text-xl text-start custom-codemirror"
            value={htmlEdit}
            height="100%"
            theme="light"
            extensions={[html()]}
            readOnly={true}
            style={{ backgroundColor: 'white', overflow: 'auto' }}
          />
        );
      case 'css':
        return (
          <CodeMirror
            className="text-xl text-start custom-codemirror"
            value={cssEdit}
            height="100%"
            theme="light"
            extensions={[css()]}
            readOnly={true}
            style={{ backgroundColor: 'white', overflow: 'auto' }}
          />
        );
      case 'js':
        return (
          <CodeMirror
            className="text-xl text-start custom-codemirror"
            value={jsEdit || questionData?.UserAns}
            height="100%"
            theme="light"
            extensions={[javascript()]}
            onChange={onChangeJavaScript}
            style={{ backgroundColor: 'white', overflow: 'auto' }}
          />
        );
      default:
        return null;
    }
  };

  const srcCode = `${htmlEdit.replace('</body>', '').replace('</html>', '')} <style>${cssEdit}</style> <script>${jsEdit}</script> </body> </html>`;


const handleSubmit = async () => {
    const url=`${process.env.REACT_APP_BACKEND_URL}api/student/coding/`
  try {
    const postData = {
      student_id: studentId,
      week_number: "1",
      day_number: "9",
      subject: "JS",
      subject_id: "JS",
      Qn: "qds250117182102cem02",
      final_score: "14/19",
      Ans: jsEdit,
      Result: "",
      Attempt: 0
    };

    const response = await axios.put(
      url,
      postData
    );

    const responseData = response.data;
    setIsJSSubmitted(true);


  } catch (innerError: any) {
            const errorData = innerError.response?.data || {
                message: innerError.message,
                stack: innerError.stack
            };
 
            const body = {
                student_id: actualStudentId,
                Email: actualEmail,
                Name: actualName,
                URL_and_Body: `${url}\n + ""`,
                error: errorData.error,
            };
 
            try {
                await axios.post(
                `${process.env.REACT_APP_BACKEND_URL}api/errorlog/`,
                body
                );
            } catch (loggingError) {
                console.error("Error logging the JS Editor error:", loggingError);
            }
 
            console.error("Error fetching JS Editor data:", innerError);
            } finally {
    setProcessing(false);
  }
};

if (loading) {
  return (
    <div className="container-fluid p-0" style={{ height: "100vh", maxWidth: "100%", overflowX: "hidden", backgroundColor: "#f2eeee" }}>
      {/* <Sidebar /> */}
      <div className="p-0 my-0 me-2" style={{ backgroundColor: "#F2EEEE" }}>
        <SkeletonCode />
      </div>
    </div>
  );
}

  return (
    <div className="container-fluid p-0" style={{ height: "calc(100vh - 90px)", maxWidth: "100%", overflow: "hidden", backgroundColor: "#f2eeee" }}>
      {/* <Sidebar /> */}
      <div className="p-0 my-0 me-2" style={{ backgroundColor: "#F2EEEE" }}>
        <div className="container-fluid p-0 pt-2" style={{ maxWidth: "100%", overflowX: "hidden", backgroundColor: "#f2eeee" }}>
          <div className="row g-2">
            <div className="col-12">
              <div className="bg-white border rounded-2 py-3 ps-3" style={{ height: "calc(100vh - 100px)", overflowY: "auto" }}>
                <div className="d-flex h-100">
                  {/* Question List */}
                  <div className="d-flex flex-column align-items-center" style={{ width: "80px", marginLeft: "-20px" }}>
                    <button
                      className="btn border border-dark rounded-2 my-1 px-3 mx-auto"
                      style={{ width: "50px", height: "55px", backgroundColor: "#42FF58", color: "#000", cursor: "pointer" }}
                    >
                      Q1
                    </button>
                  </div>
                  {/* Question Section */}
                  <div className="col-5 lg-8" style={{ height: "100%" }}>
                    <div className="border border-dark rounded-2 d-flex flex-column" style={{ height: "calc(100% - 5px)", backgroundColor: "#E5E5E533" }}>
                      <div className="border-bottom border-dark p-3 d-flex justify-content-between align-items-center">
                        <h5 className="m-0">Problem Statement</h5>
                      </div>
                      <div className="p-3 flex-grow-1 overflow-auto me-1">
                        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{questionData?.Qn}</pre>
                        <div className='d-flex justify-content-start mt-3'>
                          <div className="btn btn-sm" style={{ backgroundColor: '#B8B7B7', color: '#000000' }}>
                            Requirements
                          </div>
                        </div>
                        <div className='mt-2' style={{ fontSize: '14px', maxHeight: '70vh' }}>
                          {questionData?.JS_Messages.map((message, index) => (
                            <div key={index} className='p-2'>
                              {validationStatus.js && validationStatus.js[index] === 'correct' ? (
                                <FontAwesomeIcon icon={faCheckCircle} className='mx-1 text-success' />
                              ) : (
                                <FontAwesomeIcon icon={faCircleXmark} className='mx-1 text-danger' />
                              )}
                              <span className='pb-1' style={{ fontFamily: '"Segoe UI", Arial, sans-serif' }}>{message}</span>
                            </div>
                          ))}
                          {validationStatus.js && validationStatus.js.brackets === 'correct' ? (
                            <div className="p-2">
                              <FontAwesomeIcon icon={faCheckCircle} className="mx-1 text-success" />
                              <span>Brackets are correctly matched!</span>
                            </div>
                          ) : (
                            <div className="p-2">
                              <FontAwesomeIcon icon={faCircleXmark} className="mx-1 text-danger" />
                              <span>Mismatch in opening/closing brackets!</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Editor Section */}
                  <div className="d-flex flex-column" style={{ flex: "1", height: "100%", marginLeft: "20px" }}>
                    {/* Code Editor */}
                    <div className="border border-dark rounded-2 me-3" style={{ height: "45%", overflow: 'hidden' }}>
                      <div className="border-bottom border-dark p-3 d-flex justify-content-between align-items-center">
                        <div>
                          {questionData?.Tabs.map((tab, index) => (
                            <div
                              key={index}
                              style={{
                                width: '70px',
                                height: '30px',
                                borderRadius: '10px',
                                backgroundColor: activeTab === tab.toLowerCase() ? "black" : "transparent",
                                color: activeTab === tab.toLowerCase() ? "white" : "black",
                                border: activeTab === tab.toLowerCase() ? "none" : "1px solid black",
                                display: 'inline-block',
                                textAlign: 'center',
                                lineHeight: '30px',
                                marginRight: '8px',
                                cursor: 'pointer'
                              }}
                              className={`tab-button me-1 ${activeTab === tab.toLowerCase() ? 'selected-tab' : ''}`}
                              onClick={() => handleTabClick(tab.toLowerCase())}
                            >
                              {tab}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="col top" style={{ height: `calc(100% - 60px)`, overflowY: 'auto', marginBottom: '10px' }}>
                        {renderEditor()}
                      </div>
                    </div>

                    {/* Controls */}
                    <div style={{ height: "9%", padding: "10px 0" }} className="d-flex flex-column justify-content-center me-3">
                      <div className="d-flex justify-content-between align-items-center h-100">
                        <div className="d-flex flex-column justify-content-center">

                        </div>
                        <div className="d-flex justify-content-end align-items-center">
                          <Button
                            variant="light"
                            className="me-2 border border-dark"
                            style={{
                              minWidth: "100px",
                              boxShadow: "1px 2px 1px #888"
                            }}
                          >
                            SUBMIT
                          </Button>
                          <Button
                            variant="warning"
                            className="border border-dark"
                            style={{
                              backgroundColor: "#FBEFA5DB",
                              minWidth: "100px",
                              boxShadow: "1px 2px 1px #888"
                            }}
                          >
                            NEXT
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Output Section */}
                    <div className="border border-dark rounded-2 me-3" style={{ height: "45%", backgroundColor: "#E5E5E533", overflowY: 'auto' }}>
                      <div className="border-bottom border-dark p-3 d-flex justify-content-between align-items-center">
                        <h5 className="m-0">Output</h5>
                      </div>
                      <div className="p-3" style={{ height: "calc(100% - 58px)", overflow: 'hidden' }}>
                        <div className='d-flex justify-content-start mt-1'>
                          <div className="btn btn-sm mb-2" style={{ backgroundColor: '#B8B7B7', color: '#000000' }}>
                            Your Output
                          </div>
                          <FontAwesomeIcon icon={faExpand} className='px-1 mt-2' onClick={Handlepreview} style={{ cursor: 'pointer' }} />
                        </div>
                        <iframe
                          style={{ width: '100%', height: '100%', backgroundColor: '', color: 'black', borderColor: 'white', outline: 'none', resize: 'none' }}
                          className="w-full h-full"
                          srcDoc={srcCode}
                          title="output"
                          sandbox="allow-scripts allow-same-origin"
                          width="100%"
                          height="100%"
                        ></iframe>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Modal show={showAlert} onHide={handleCloseAlert} size='lg' aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Body className='text-dark w-100' style={{ height: '250px' }}>
          {displ === 'output' ? (
            <iframe
              style={{ width: '100%', height: '95%', backgroundColor: '', color: 'black', borderColor: 'white', outline: 'none', resize: 'none' }}
              className="w-full h-full"
              srcDoc={srcCode}
              title="output"
              sandbox="allow-scripts allow-same-origin"
              width="100%"
              height="100%"
            ></iframe>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="dark" onClick={handleCloseAlert}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default JSEditor;
