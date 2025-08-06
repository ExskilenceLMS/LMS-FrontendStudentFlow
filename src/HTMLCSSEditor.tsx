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
    const fetchQuestion = async () => {
      const url=`${process.env.REACT_APP_BACKEND_URL}frontend/qns/data/`
      try {
        const response = await getApiClient().post(
          url,
          {
            StudentId: "24TEST0108",
            Course: "HTMLCSS",
            Qn_name: "QHC2408010000AAXXEM10"
          }
        );
        setQuestionData(response.data.Question);
        setHtmlEdit(response.data.Question.UserAnsHTML || '');
        setCssEdit(response.data.Question.UserAnsCSS || '');
      } catch (error) {
        console.error("Error fetching question data:", error);
      } finally {
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

  const handleImgView = () => {
    setdispl('image');
    setShowAlert(true);
  };

  const Handlepreview = () => {
    setdispl('output');
    setShowAlert(true);
  };

  
  const onChangeHtml = useCallback((value: string, viewUpdate: any) => {
    setHtmlEdit(value);
    handleCheckCode();
  }, [htmlEdit]);

  const onChangeCss = useCallback((value: string, viewUpdate: any) => {
    setCssEdit(value);
    handleCheckCode();
  }, [cssEdit]);

  const handleCheckCode = () => {
    let codeToTest: string;
    switch (activeTab) {
      case 'html':
        codeToTest = htmlEdit;
        break;
      case 'css':
        codeToTest = cssEdit;
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
  
    const htmlValidationData = questionData.Code_Validation.HTML;
    const cssValidationData = questionData.Code_Validation.CSS;
    let presentIndices: number[];
  
    if (type === 'html') {
      const extractAttributes = (html: string) => {
        const tagMatches = [...html.matchAll(/<(\w+)([^>]*)>/g)].map(match => {
          const attributes: { [key: string]: string[] } = {};
          const selfClosingTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
          const attributeMatches = [...match[2].matchAll(/(\w+)\s*=\s*["']([^"']*)["']/g)];
  
          attributeMatches.forEach(attrMatch => {
            const attrName = attrMatch[1];
            let attrValue = attrMatch[2];
  
            if (['href', 'src', 'data-url', 'url'].includes(attrName)) {
              const fullMatch = match[2].match(new RegExp(`${attrName}\\s*=\\s*["']([^"']*\\{\\{\\s*url_for\\s*\\([^\\)]+\\)\\s*[^"']*)["']`));
              if (fullMatch) {
                attrValue = fullMatch[1];
              }
            }
  
            if (!attributes[attrName]) {
              attributes[attrName] = [];
            }
            attributes[attrName].push(attrValue);
          });
  
          return {
            tag: match[1],
            attributes,
            isSelfClosing: selfClosingTags.includes(match[1].toLowerCase()),
            hasClosingTag: !selfClosingTags.includes(match[1].toLowerCase()) && new RegExp(`</${match[1]}>`).test(html)
          };
        });
        return tagMatches;
      };
  
      const normalizedAttributes = extractAttributes(code);
  
      const relevantAttributes = ['type', 'id', 'name', 'required', 'class', 'url'];
  
      const missingHTMLValues = htmlValidationData.filter(expectedTag => {
        const foundTags = normalizedAttributes.filter(actualTag => actualTag.tag === expectedTag.tag);
        let isTagMissing = false;
  
        const hasMatchingTag = foundTags.some(foundTag => {
          const expectedAttributes = expectedTag.attributes;
          const actualAttributes = foundTag.attributes;
  
          if (!foundTag.isSelfClosing && !foundTag.hasClosingTag) {
            return false;
          }
  
          return Object.keys(expectedAttributes).every(attr => {
            const expectedValues = Array.isArray(expectedAttributes[attr]) ? expectedAttributes[attr] : [expectedAttributes[attr]];
            const actualValues = Array.isArray(actualAttributes[attr]) ? actualAttributes[attr] : [actualAttributes[attr]];
  
            if (!actualValues || actualValues.length === 0) {
              expectedTag.missingAttributes = expectedTag.missingAttributes || {};
              expectedTag.missingAttributes[attr] = expectedValues;
              return false;
            }
  
            const allValuesMatch = expectedValues.every((val: string) => (actualValues as string[]).includes(val));
            if (!allValuesMatch) {
              expectedTag.missingAttributes = expectedTag.missingAttributes || {};
              expectedTag.missingAttributes[attr] = expectedValues.filter((val: string) => !(actualValues as string[]).includes(val));
              return false;
            }
  
            return true;
          });
        });
  
        if (!hasMatchingTag) {
          isTagMissing = true;
        }
  
        return isTagMissing;
      }).map(tag => {
        if (tag.missingAttributes) {
        }
        return tag;
      });
  
      const isHTMLValid = missingHTMLValues.length === 0;
  
      presentIndices = htmlValidationData.map((item, index) => missingHTMLValues.includes(item) ? null : index).filter(index => index !== null) as number[];
      setValidationStatus(prevState => ({ ...prevState, html: presentIndices }));
  
      const validHTMLTags = [
        'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio',
        'b', 'base', 'bdi', 'bdo', 'blockquote', 'body', 'br', 'button',
        'canvas', 'caption', 'cite', 'code', 'col', 'colgroup',
        'data', 'datalist', 'dd', 'del', 'details', 'dialog', 'div',
        'dl', 'dt', 'em', 'embed', 'fieldset', 'figcaption', 'figure',
        'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head',
        'header', 'hr', 'html', 'i', 'iframe', 'img', 'input', 'ins',
        'kbd', 'label', 'legend', 'li', 'link', 'main', 'map', 'mark',
        'meta', 'meta', 'nav', 'noscript', 'object', 'ol', 'optgroup', 'option',
        'output', 'p', 'param', 'picture', 'pre', 'progress', 'q',
        'rp', 'rt', 'ruby', 's', 'samp', 'script', 'section', 'select',
        'small', 'source', 'span', 'strong', 'style', 'sub', 'summary',
        'sup', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot',
        'th', 'thead', 'title', 'tr', 'track', 'u', 'ul', 'var', 'video',
        'wbr'
      ];
  
      const validateHTML = (html: string) => {
        const tagPattern = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
        const headTags = ['title', 'meta', 'link', 'style', 'script'];
        const bodyTags = ['head', 'html', ...headTags];
        const selfClosingTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
        const nonSelfClosingTags = [
          'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base', 'bdi', 'bdo',
          'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'cite', 'code', 'col',
          'colgroup', 'data', 'datalist', 'dd', 'del', 'details', 'dialog', 'div', 'dl', 'dt',
          'em', 'embed', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2',
          'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hr', 'html', 'i', 'iframe', 'img',
          'input', 'ins', 'kbd', 'label', 'legend', 'li', 'link', 'main', 'map', 'mark',
          'menu', 'menuitem', 'meta', 'meter', 'nav', 'noscript', 'object', 'ol', 'optgroup',
          'option', 'output', 'p', 'param', 'picture', 'pre', 'progress', 'q', 'rp', 'rt',
          'ruby', 's', 'samp', 'script', 'section', 'select', 'small', 'source', 'span',
          'strong', 'style', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'template',
          'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track', 'u', 'ul',
          'var', 'video', 'wbr'
        ];
  
        const HtmlTags = ['html', 'head', 'body'];
  
        const doctypeContent = html.match(/<!DOCTYPE html[^>]*>([\s\S]*?)<\/html>/);
        const htmlContent = html.match(/<html[^>]*>([\s\S]*?)<\/html>/);
        const headContent = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
        const bodyContent = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  
        const isValidTag = (tagName: string) => validHTMLTags.includes(tagName);
  
        if (htmlContent == null) {
          setDOMSTR('Invalid DOM structure');
          setDOMTRUE(true);
          return false;
        } else {
          if (doctypeContent) {
            const docMatches = doctypeContent[1].match(tagPattern);
            for (let tag of docMatches || []) {
              const tagName = tag.replace(/<\/?|\/?>/g, '').split(' ')[0].toLowerCase();
              if (HtmlTags.includes(tagName) || !isValidTag(tagName)) {
              }
            }
            setDOMSTR('HTML DOM structure');
            setDOMTRUE(false);
          }
  
          if (htmlContent) {
            const htmlMatches = htmlContent[1].match(tagPattern);
            for (let tag of htmlMatches || []) {
              const tagName = tag.replace(/<\/?|\/?>/g, '').split(' ')[0].toLowerCase();
              if (!isValidTag(tagName)) {
                setDOMSTR(`Invalid ${tagName} tag inside html tag due to possible spelling error`);
                setDOMTRUE(true);
                return false;
              }
            }
            setDOMSTR('HTML DOM structure');
            setDOMTRUE(false);
          }
  
          if (headContent) {
            const headMatches = headContent[1].match(tagPattern);
            for (let tag of headMatches || []) {
              const tagName = tag.replace(/<\/?|\/?>/g, '').split(' ')[0].toLowerCase();
              if (!headTags.includes(tagName) || !isValidTag(tagName)) {
                setDOMSTR(`Invalid ${tagName} tag inside head tag`);
                setDOMTRUE(true);
                return false;
              }
            }
            setDOMSTR('HTML DOM structure');
            setDOMTRUE(false);
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