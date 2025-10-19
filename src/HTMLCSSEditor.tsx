import React, { useState, useEffect,  useCallback, ChangeEvent, MouseEvent as ReactMouseEvent } from "react";
import { Button, Modal } from "react-bootstrap";
import CodeMirror from "@uiw/react-codemirror";
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faCircleXmark, faExpand } from '@fortawesome/free-solid-svg-icons';
import { getApiClient } from "./utils/apiAuth";
import { useNavigate } from "react-router-dom";
import SkeletonCode from "./Components/EditorSkeletonCode"
import { secretKey } from "./constants";
import CryptoJS from "crypto-js";
interface QuestionData {
  Qn: string;
  Sample_img: string;
  Code_Validation: {
    HTML: any[];
    CSS: any[];
    HTML_Messages: string[];
    CSS_Messages: string[];
  };
  Tabs: string[];
  Qn_name: string;
  Qn_No: string;
  UserAnsHTML: string;
  UserAnsCSS: string;
  UserSubmitedHTML: string;
  UserSubmitedCSS: string;
}

const HTMLCSSEditor: React.FC = () => {
  const navigate = useNavigate();
  const [questionData, setQuestionData] = useState<QuestionData | null>(null);
  const [htmlEdit, setHtmlEdit] = useState('');
  const [cssEdit, setCssEdit] = useState('');
  const [activeTab, setActiveTab] = useState('html');
  const [loading, setLoading] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [displ, setdispl] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [validationStatus, setValidationStatus] = useState({ html: [] as number[], css: [] as number[] });
  const [splitOffset, setSplitOffset] = useState(window.innerWidth / 2);
  const [isDragging, setIsDragging] = useState(false);
  const [initialX, setInitialX] = useState<number | null>(null);
  const [editorHeightPercentage, setEditorHeightPercentage] = useState(45);
  const [outputHeightPercentage, setOutputHeightPercentage] = useState(45);
  const [isDraggingVertically, setIsDraggingVertically] = useState(false);
  const [initialY, setInitialY] = useState<number | null>(null);
  const [DOMSTR, setDOMSTR] = useState('HTML DOM structure');
  const [DOMTRUE, setDOMTRUE] = useState(false);
  const [isHtmlSubmitted, setIsHTMLSubmitted] = useState<boolean>(false);
  const [isCSSSubmitted, setIsCSSSubmitted] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
const encryptedStudentId = sessionStorage.getItem('StudentId');
  const decryptedStudentId = CryptoJS.AES.decrypt(encryptedStudentId!, secretKey).toString(CryptoJS.enc.Utf8);
  const studentId = decryptedStudentId;
  const actualStudentId= CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualEmail= CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualName= CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);
 
 

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        
        // Check if we're in testing context (from SubjectBasedCodingEditor)
        const isTestingContext = window.location.pathname.includes('/testing/coding/');
        
        if (isTestingContext) {
          // In testing mode, load questions from session storage set by SubjectBasedCodingEditor
          const storedQuestions = sessionStorage.getItem('codingQuestions');
          if (storedQuestions) {
            try {
              const questions = JSON.parse(storedQuestions);
              setQuestions(questions);
              
              // Set initial question index from session storage or default to 0
              const storedIndex = sessionStorage.getItem("currentQuestionIndex");
              const initialIndex = storedIndex ? 
                Math.max(0, Math.min(parseInt(storedIndex) || 0, questions.length - 1)) : 0;
              
              setCurrentQuestionIndex(initialIndex);
              
              // Set current question based on stored index
              if (questions.length > 0) {
                const currentQuestion = questions[initialIndex];
                setQuestionData(currentQuestion);
                
                // Initialize file contents from Code_Validation
                const fileContents: {[key: string]: string} = {};
                
                // Process each file in Code_Validation
                Object.keys(currentQuestion.Code_Validation).forEach(fileName => {
                  if (isTestingContext) {
                    // In testing mode, use Ans field from Code_Validation if available
                    const fileValidation = currentQuestion.Code_Validation[fileName] as any;
                    if (fileValidation && fileValidation.Ans) {
                      fileContents[fileName] = fileValidation.Ans;
                    } else if (fileName === 'index.html') {
                      // Fallback to template for index.html if no Ans field
                      const defaultTemplate = currentQuestion.Template || currentQuestion.defaulttemplate || '';
                      fileContents[fileName] = defaultTemplate;
                    } else {
                      // Other files start empty if no Ans field
                      fileContents[fileName] = '';
                    }
                  } else {
                    // In practice mode, use defaulttemplate for index.html only
                    if (fileName === 'index.html') {
                      const defaultTemplate = currentQuestion.Template || currentQuestion.defaulttemplate || '';
                      fileContents[fileName] = defaultTemplate;
                    } else {
                      // Other files start empty in practice mode
                      fileContents[fileName] = '';
                    }
                  }
                });
                setFileContents(fileContents);
                
                // Set active tab to the first file
                if (currentQuestion.Tabs.length > 0) {
                  setActiveTab(currentQuestion.Tabs[0].name);
                }
              }
            } catch (error) {
              console.error('Error loading questions from session storage:', error);
            }
          }
          setLoading(false);
          return;
        }
        
        // Only fetch from practice coding API in non-testing mode
        const url = `${process.env.REACT_APP_BACKEND_URL}api/student/practicecoding/` +
          `${studentId}/` +
          `${subject}/` +
          `${subjectId}/` +
          `${dayNumber}/` +
          `${weekNumber}/` +
          `${sessionStorage.getItem("currentSubTopicId")}/`;
        
        const response = await getApiClient().get(url);
        const apiQuestions = response.data.questions;
        const questionsWithSavedCode = apiQuestions.map((q: any) => {
          // Check for saved code in session storage
          const savedCodeKey = `userCode_${subject}_${weekNumber}_${dayNumber}_${q.Qn_name}`;
          const savedCode = sessionStorage.getItem(savedCodeKey);
          let savedFileContents: {[key: string]: string} = {};
          
          if (savedCode) {
            try {
              const decryptedCode = CryptoJS.AES.decrypt(savedCode, secretKey).toString(CryptoJS.enc.Utf8);
              savedFileContents = JSON.parse(decryptedCode);
            } catch (error) {
              console.error('Error decrypting saved code:', error);
            }
          }
          
          // Determine tabs dynamically from API or use default
          const tabs = q.Tabs || [
            { name: "index.html", type: "HTML" },
            { name: "styles.css", type: "CSS" }
          ];
          
          // Build Code_Validation dynamically
          const codeValidation: {[key: string]: any} = {};
          tabs.forEach((tab: any) => {
            const fileName = tab.name;
            codeValidation[fileName] = {
              template: ""
            };
          });
          
          return {
            Qn_name: q.Qn_name,
            Page_Name: q.Page_Name || "HTML/CSS Question",
            level: q.level || "level1",
            subtopic_id: q.subtopic_id || "",
            type: q.type || "coding",
            Tabs: tabs,
            Qn: q.Qn || q.question || "",
            requirements: q.requirements || "",
            Code_Validation: q.Code_Validation || codeValidation,
            defaulttemplate: q.defaulttemplate || "",
            image_path: q.image_path || "",
            video_path: q.video_path || "",
            CreatedBy: q.CreatedBy || "",
            CreatedOn: q.CreatedOn || "",
            LastUpdated: q.LastUpdated || "",
            status: q.status || false,
            entered_ans: q.entered_ans || {},
            image_urls: q.image_urls || []
          };
        });
        
        setQuestions(questionsWithSavedCode);
        
        // Set initial question index from session storage or default to 0
        const storedIndex = sessionStorage.getItem("currentQuestionIndex");
        const initialIndex = storedIndex ? 
          Math.max(0, Math.min(parseInt(storedIndex) || 0, questionsWithSavedCode.length - 1)) : 0;
        
        setCurrentQuestionIndex(initialIndex);
        
        // Set current question based on stored index
        if (questionsWithSavedCode.length > 0) {
          const currentQuestion = questionsWithSavedCode[initialIndex];
          setQuestionData(currentQuestion);
          const submitStatusKey = `submitStatus_${studentId}_${subject}_${weekNumber}_${dayNumber}_${currentQuestion.Qn_name}`;
          const encryptedSubmitStatus = sessionStorage.getItem(submitStatusKey);
          const isSubmittedStatus = encryptedSubmitStatus ? 
            CryptoJS.AES.decrypt(encryptedSubmitStatus, secretKey).toString(CryptoJS.enc.Utf8) === 'true' : false;
          
          if (currentQuestion.status === true || isSubmittedStatus) {
            setIsSubmitted(true);
            setHasRunCode(true);
          }
          
          // Initialize file contents from Code_Validation
          const fileContents: {[key: string]: string} = {};
          
          // Process each file in Code_Validation
          Object.keys(currentQuestion.Code_Validation).forEach(fileName => {
            // Check if question is submitted and has entered_ans
            if (currentQuestion.status === true && currentQuestion.entered_ans && currentQuestion.entered_ans[fileName]) {
              fileContents[fileName] = currentQuestion.entered_ans[fileName];
            } else if (fileName === 'index.html') {
              const defaultTemplate = currentQuestion.Template || currentQuestion.defaulttemplate || '';
              fileContents[fileName] = defaultTemplate;
            } else {
              // Other files start empty if not submitted
              fileContents[fileName] = '';
            }
          });
          
          // Check session storage first for auto-saved code
          const sessionKey = isTestingContext 
            ? `testing_userCode_${currentQuestion.Qn_name}` 
            : `userCode_${subject}_${weekNumber}_${dayNumber}_${currentQuestion.Qn_name}`;
          const encryptedSessionCode = sessionStorage.getItem(sessionKey);
          
          if (encryptedSessionCode && !currentQuestion.status && !isSubmittedStatus) {
            // Load from session storage if available and question is not submitted
            try {
              const decryptedCode = CryptoJS.AES.decrypt(encryptedSessionCode, secretKey).toString(CryptoJS.enc.Utf8);
              const sessionCode = JSON.parse(decryptedCode);
              
              // Merge session code with current file contents
              Object.keys(sessionCode).forEach(fileName => {
                if (fileContents.hasOwnProperty(fileName)) {
                  fileContents[fileName] = sessionCode[fileName];
                }
              });
            } catch (error) {
              console.error('Error loading session storage code:', error);
            }
          } else if (!currentQuestion.status && !isSubmittedStatus && !isTestingContext) {
            // Only fetch from backend if no session storage data AND question is not submitted AND not in testing mode
            try {
              const autoSavedCode = await loadAutoSavedCode(currentQuestion, sessionKey, studentId, QUESTION_STATUS.PRACTICE, false);
                // Merge auto-saved code with current file contents
                Object.keys(autoSavedCode).forEach(fileName => {
                  if (fileContents.hasOwnProperty(fileName)) {
                    fileContents[fileName] = autoSavedCode[fileName];
                  }
                });
            } catch (error) {
              console.error('Error loading auto-saved code from backend:', error);
            }
          }
          
          setFileContents(fileContents);
          
          // Set active tab to the first file
          if (currentQuestion.Tabs.length > 0) {
            setActiveTab(currentQuestion.Tabs[0].name);
          }
        }
      } catch (error) {
        console.error("Error fetching questions:", error);
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [studentId, subject, subjectId, dayNumber, weekNumber, isTestingContext]);



  const handleQuestionChange = async (index: number) => {
    if (index >= 0 && index < questions.length) {
      const question = questions[index];
      setQuestionData(question);
      setCurrentQuestionIndex(index);
      
      // Reset output tab to image (default)
      setActiveOutputTab('image');
      
      // Save current question index to session storage
      sessionStorage.setItem("currentQuestionIndex", index.toString());
      
      // Check if question is already submitted
        const submitStatusKey = `submitStatus_${studentId}_${subject}_${weekNumber}_${dayNumber}_${question.Qn_name}`;
        const encryptedSubmitStatus = sessionStorage.getItem(submitStatusKey);
        const isSubmittedStatus = encryptedSubmitStatus ? 
          CryptoJS.AES.decrypt(encryptedSubmitStatus, secretKey).toString(CryptoJS.enc.Utf8) === 'true' : false;
        
      const isSubmitted = question.status === true || isSubmittedStatus;
      
      // Load file contents using shared utility
      const sessionKey = isTestingContext 
        ? `testing_userCode_${question.Qn_name}` 
        : `userCode_${subject}_${weekNumber}_${dayNumber}_${question.Qn_name}`;
      let fileContents: {[key: string]: string} = {};
      
      if (isTestingContext) {
        // In testing mode, initialize file contents without API calls
        Object.keys(question.Code_Validation).forEach(fileName => {
          const fileValidation = question.Code_Validation[fileName] as any;
          if (fileValidation && fileValidation.Ans) {
            // Use Ans field from Code_Validation if available
            fileContents[fileName] = fileValidation.Ans;
          } else if (fileName === 'index.html') {
            // Fallback to template for index.html if no Ans field
            const defaultTemplate = question.Template || question.defaulttemplate || '';
            fileContents[fileName] = defaultTemplate;
          } else {
            // Other files start empty if no Ans field
            fileContents[fileName] = '';
          }
        });
        
        // Check session storage for auto-saved code in testing mode
        const encryptedSessionCode = sessionStorage.getItem(sessionKey);
        if (encryptedSessionCode && !isSubmitted) {
          try {
            const decryptedCode = CryptoJS.AES.decrypt(encryptedSessionCode, secretKey).toString(CryptoJS.enc.Utf8);
            const sessionCode = JSON.parse(decryptedCode);
            
            // Merge session code with current file contents
            Object.keys(sessionCode).forEach(fileName => {
              if (fileContents.hasOwnProperty(fileName)) {
                fileContents[fileName] = sessionCode[fileName];
              }
            });
          } catch (error) {
            console.error('Error loading testing session storage code:', error);
          }
  
          if (!bodyContent || bodyContent[1].trim() === '') {
            return false;
          }
  
          const bodyMatches = bodyContent[1].match(tagPattern);
          for (let tag of bodyMatches || []) {
            const tagName = tag.replace(/<\/?|\/?>/g, '').split(' ')[0].toLowerCase();
            if (bodyTags.includes(tagName) || !isValidTag(tagName)) {
              setDOMSTR(`Invalid ${tagName} tag inside body tag`);
              setDOMTRUE(true);
              return false;
            }
            setDOMSTR('HTML DOM structure');
            setDOMTRUE(false);
          }
  
          const selfClosingMatches = bodyContent[1].match(/<([a-z][a-z0-9]*)\s*\/?>/gi);
          for (let tag of selfClosingMatches || []) {
            const tagName = tag.replace(/<\/?|\/?>/g, '').toLowerCase();
            if (selfClosingTags.includes(tagName)) {
              setDOMSTR(`Invalid self-closing tag: ${tagName}`);
              setDOMTRUE(true);
              return false;
            } else {
              if (!nonSelfClosingTags.includes(tagName)) {
                setDOMSTR(`Invalid non-self-closing tag: ${tagName}`);
                setDOMTRUE(true);
                return false;
              }
            }
          }
  
          setDOMSTR('HTML DOM structure');
          setDOMTRUE(false);
          return true;
        }
      };
  
      const isHeadAndBodyValid = validateHTML(code);
  
      if (!isHTMLValid) {
      } else {
        if (isHeadAndBodyValid) {
        } else {
        }
      }
  
      presentIndices = htmlValidationData.map((item, index) => missingHTMLValues.includes(item) ? null : index).filter(index => index !== null) as number[];
      setValidationStatus(prevState => ({ ...prevState, html: presentIndices }));
    } else if (type === 'css') {
      if (typeof code !== 'string') {
        return;
      }
  
      const validateRules = (rules: any[], blocks: string[]) => {
        return rules.filter(expectedRule => {
          const foundRule = blocks.find(block => {
            const selector = block.split('{')[0].trim();
            const properties = block.split('{')[1].split(';').map(prop => prop.trim()).filter(prop => prop !== '');
  
            if (selector !== expectedRule.selector) {
              return false;
            }
  
            return expectedRule.properties.every((expectedProp: any) => {
              const foundProp = properties.find(prop => {
                const property = prop.split(':')[0].trim();
                let value = prop.split(':')[1].trim();
  
                const finalvalue = value.toString().split('\n').map(line => line.replace(/\s*,\s*/g, ', ')).join('\n');
                return expectedProp.property === property && expectedProp.value === finalvalue;
              });
              return foundProp !== undefined;
            });
          });
          return !foundRule;
        });
      };
  
      const mediaQueryRegex = /@media[^{]+\{([\s\S]+?})\s*}/g;
      let match;
      const mediaQueryBlocks: string[] = [];
      while ((match = mediaQueryRegex.exec(code)) !== null) {
        mediaQueryBlocks.push(match[0]);
      }
  
      const normalCSS = code.replace(mediaQueryRegex, '');
      const normalBlocks = normalCSS.split('}').map(block => block.trim()).filter(block => block !== '');
  
      const missingCSSRules = validateRules(cssValidationData.filter(rule => !rule.media_query), normalBlocks);
  
      const missingMediaQueryRules: { [key: string]: any[] } = {};
      cssValidationData.filter(rule => rule.media_query).forEach(mediaQuery => {
        const mediaQueryBlock = mediaQueryBlocks.find(block => block.includes(mediaQuery.media_query));
        if (mediaQueryBlock) {
          const startIndex = mediaQueryBlock.indexOf('{') + 1;
          const endIndex = mediaQueryBlock.lastIndexOf('}');
          const mediaQueryContent = mediaQueryBlock.substring(startIndex, endIndex).trim();
  
          const blocks = mediaQueryContent.split('}').map(block => block.trim()).filter(block => block !== '');
  
          const missingRules = validateRules(mediaQuery.rules, blocks);
          if (missingRules.length > 0) {
            missingMediaQueryRules[mediaQuery.media_query] = missingRules;
          }
        } else {
          missingMediaQueryRules[mediaQuery.media_query] = mediaQuery.rules;
        }
      });
  
      const isCSSValid = missingCSSRules.length === 0 && Object.keys(missingMediaQueryRules).length === 0;
  
      presentIndices = cssValidationData.map((item, index) => {
        if (item.media_query) {
          return missingMediaQueryRules[item.media_query] ? null : index;
        }
        return missingCSSRules.includes(item) ? null : index;
      }).filter(index => index !== null) as number[];
  
      setValidationStatus(prevState => ({ ...prevState, css: presentIndices }));
    }
  };
  

  const renderEditor = () => {
    switch (activeTab) {
      case 'html':
        return (
          <CodeMirror
            className="text-xl text-start custom-codemirror"
            value={htmlEdit || questionData?.UserAnsHTML}
            height="100%"
            extensions={[html()]}
            onChange={onChangeHtml}
            style={{ backgroundColor: 'white', overflow: 'auto' }}
          />
        );
      case 'css':
        return (
          <CodeMirror
            className="text-xl text-start custom-codemirror"
            value={cssEdit || questionData?.UserAnsCSS}
            height="95%"
            theme="light"
            extensions={[css()]}
            onChange={onChangeCss}
            style={{ backgroundColor: 'white', overflow: 'auto' }}
          />
        );
      default:
        return null;
    }
  };

  const srcCode = `
    ${htmlEdit.replace('</body>', '').replace('</html>', '')}
    <style>${cssEdit}</style>
    </body>
    </html>
  `;

      const handleSubmit = async () => {
    const url=`${process.env.REACT_APP_BACKEND_URL}api/student/coding/`
        try {
          const postData = {
            student_id: studentId,
            week_number: "1",
            day_number: "9",
            subject: "HTML",
            subject_id: "HTML",
            Qn: "qds250117182102cem02",
            final_score: "14/19",
            Ans: htmlEdit,
            Result: "",
            Attempt: 0
          };
    
          const response = await getApiClient().put(
            url,
            postData
          );
    
          const responseData = response.data;
          setIsHTMLSubmitted(true);
          setIsCSSSubmitted(true);

     
        }finally {
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
    <div className="container-fluid p-0" style={{ height: "calc(100vh - 90px)", maxWidth: "100%", overflow: "hidden", backgroundColor: "#f2eeee" }}>
      <div className="p-0 my-0 me-2" style={{ backgroundColor: "#F2EEEE" }}>
        <div className="container-fluid p-0 pt-2" style={{ maxWidth: "100%", overflowX: "hidden", backgroundColor: "#f2eeee" }}>
          <div className="row g-2">
            <div className="col-12">
              <div className="bg-white border rounded-2 py-3 ps-3" style={{ height: "calc(100vh - 100px)", overflowY: "auto" }}>
                <div className="d-flex h-100">
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
                            Expected output
                            </div>
                            <FontAwesomeIcon icon={faExpand} className='px-1 mt-2 text-dark' onClick={handleImgView} style={{ cursor: 'pointer' }} />
                        </div>
                        <img src={questionData?.Sample_img} className="img-fluid mt-3" alt="image" style={{ pointerEvents: 'none' }} />
                        <div className='d-flex justify-content-start mt-3'>
                            <div className="btn btn-sm" style={{ backgroundColor: '#B8B7B7', color: '#000000' }}>
                            Requirements
                            </div>
                        </div>
                        <div className='mt-2' style={{ fontSize: '14px', maxHeight: '70vh'}}>
                            {(() => {
                            switch (activeTab) {
                                case 'html':
                                return (
                                    <>
                                    <span className='p-2 ' style={{ fontFamily: '"Segoe UI", Arial, sans-serif' }}>
                                        {DOMTRUE ? (
                                        <>
                                            <FontAwesomeIcon icon={faCircleXmark} className="mx-1 text-danger" />
                                            {DOMSTR}
                                        </>
                                        ) : (
                                        <>
                                            <FontAwesomeIcon icon={faCheckCircle} className="mx-1 text-success" />
                                            {`HTML DOM structure`}
                                        </>
                                        )}
                                    </span>
                                    {questionData?.Code_Validation.HTML_Messages.map((message, index) => (
                                        <div key={index} className='p-2'>
                                        {validationStatus.html && validationStatus.html.includes(index) ? (
                                            <FontAwesomeIcon icon={faCheckCircle} className='mx-1 text-success' />
                                        ) : (
                                            <FontAwesomeIcon icon={faCircleXmark} className='mx-1 text-danger' />
                                        )}
                                        {message}
                                        </div>
                                    ))}
                                    </>
                                );
                                case 'css':
                                return (
                                    <>
                                    {questionData?.Code_Validation.CSS_Messages.map((message, index) => (
                                        <div key={index} className='p-2'>
                                        {validationStatus.css && validationStatus.css.includes(index) ? (
                                            <FontAwesomeIcon icon={faCheckCircle} className='mx-1 text-success' />
                                        ) : (
                                            <FontAwesomeIcon icon={faCircleXmark} className='mx-1 text-danger' />
                                        )}
                                        {message}
                                        </div>
                                    ))}
                                    </>
                                );
                                default:
                                return null;
                            }
                            })()}
                        </div>
                        </div>
                    </div>
                  </div>


                  <div className="d-flex flex-column" style={{ flex: "1", height: "100%", marginLeft: "20px" }}>
                    <div className="border border-dark rounded-2 me-3" style={{ height: "45%",  overflow: 'hidden' }}>
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
                            onClick={handleSubmit}
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
                            disabled={true}
                          >
                            NEXT
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="border border-dark rounded-2 me-3" style={{ height: "45%", backgroundColor: "#E5E5E533", overflowY: 'auto' }}>
                <div className="border-bottom border-dark p-3 d-flex justify-content-between align-items-center">
                    <h5 className="m-0">Output</h5>
                </div>
                <div className="p-3" style={{ height: "calc(100% - 58px)", overflow: 'auto' }}>
                    <div className='d-flex justify-content-start mt-2'>
                    <div className="btn btn-sm" style={{ backgroundColor: '#B8B7B7', color: '#000000' }}>
                        Your Output
                    </div>
                    <FontAwesomeIcon icon={faExpand} className='px-1 mt-2' onClick={Handlepreview} style={{ cursor: 'pointer' }} />
                    </div>
                    <iframe
                    style={{ width: '100%', height: '100%', backgroundColor: '', color: 'black', borderColor: 'white', outline: 'none', resize: 'none' }}
                    className="w-full h-full"
                    srcDoc={srcCode}
                    title="output"
                    sandbox="allow-scripts"
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
        <Modal.Body className='text-dark w-100 '>
                {displ === 'image' ? (
                <img
                    src={questionData?.Sample_img}
                    className="img-fluid mt-3"
                    alt="image"
                    style={{ pointerEvents: 'none', maxWidth: '100%', maxHeight: '100%' }}
                />
                ) : displ === 'output' ? (
                <iframe
                    style={{ width: '100%', height: '95%', backgroundColor: '', color: 'black', borderColor: 'white', outline: 'none', resize: 'none' }}
                    className="w-full h-full"
                    srcDoc={srcCode}
                    title="output"
                    sandbox="allow-scripts"
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

export default HTMLCSSEditor;