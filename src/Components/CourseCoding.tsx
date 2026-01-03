import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiClient } from '../utils/apiAuth';
import { useAPISWR } from '../utils/swrConfig';
import CryptoJS from 'crypto-js';
import { secretKey } from '../constants';
import PythonEditorComponent from './PythonEditorComponent';
import FrontendEditorComponent from './FrontendEditorComponent';
import SQLCodeEditorComponent from './SQLCodeEditorComponent';
import QuestionNav from './QuestionNav';
import CodingEditorLoader from './CodingEditorLoader';

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
  Name: string;
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
  editor?: string; // Editor type: "python_coding", "frontend_coding", "sql_coding"
  // Additional fields for HTML/CSS editor
  Tabs?: Array<{
    name: string;
    type: string;
  }>;
  requirements?: string;
  Code_Validation?: any;
  image_path?: string;
  video_path?: string;
  Page_Name?: string;
  image_urls?: Array<{ actualUrl: string; expectedUrl: string }>;
}

const CourseCoding: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);

  // Session storage data
  const encryptedStudentId = sessionStorage.getItem('StudentId');
  const decryptedStudentId = encryptedStudentId ? CryptoJS.AES.decrypt(encryptedStudentId, secretKey).toString(CryptoJS.enc.Utf8) : "";
  const actualStudentId = decryptedStudentId;
  
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

  // Use SWR for tables API
  const tablesUrl = `${process.env.REACT_APP_BACKEND_URL}api/student/practicecoding/tables/`;
  const { data: tablesData } = useAPISWR<{ tables: any[] }>(tablesUrl);

  // Fetch questions
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!actualStudentId || !subject || !subjectId || !dayNumber || !weekNumber) {
        console.error("Missing required session storage data");
        setLoading(false);
        return;
      }

      try {
        const currentSubTopicId = sessionStorage.getItem('currentSubTopicId') || subjectId;
        const url = `${process.env.REACT_APP_BACKEND_URL}api/student/practicecoding/${actualStudentId}/${subject}/${subjectId}/${dayNumber}/${weekNumber}/${currentSubTopicId}/`;
        
        const response = await getApiClient().get(url);
        const questionsData = response.data.questions;
        setQuestions(questionsData);
        
        if (questionsData.length > 0) {
          setCurrentQuestionIndex(0);
        }
      } catch (error) {
        console.error("Error fetching questions:", error);
      } finally {
        setLoading(false);
      }
    };

    if (tablesData) {
      fetchQuestions();
    }
  }, [tablesData, actualStudentId, subject, subjectId, dayNumber, weekNumber]);

  const handleQuestionChange = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  const handleNext = () => {
    // Check if last question
    if (currentQuestionIndex === questions.length - 1) {
      navigate('/Subject-Roadmap', { replace: true });
      return;
    }

    // Move to next question
    handleQuestionChange(currentQuestionIndex + 1);
  };

  // Map Question to QuestionData format for FrontendEditorComponent
  const mapToQuestionData = (q: Question): any => {
    return {
      Qn_name: q.Qn_name,
      Page_Name: q.Page_Name || q.Qn_name,
      level: q.level || q.Level || '',
      subtopic_id: q.subtopic_id || q.ConceptID || '',
      type: q.QuestionType || '',
      Tabs: q.Tabs || [],
      Qn: q.Qn,
      requirements: q.requirements || '',
      Code_Validation: q.Code_Validation || {},
      defaulttemplate: q.Template || '',
      Template: q.Template || '',
      image_path: q.image_path || '',
      video_path: q.video_path || '',
      CreatedBy: q.CreatedBy || '',
      CreatedOn: q.CreatedON || '',
      LastUpdated: q.LastUpdated || '',
      status: q.status,
      score: q.score,
      entered_ans: q.entered_ans,
      image_urls: q.image_urls,
    };
  };

  // Determine which editor to render based on editor field from current question
  const renderEditor = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return null;

    const editorType = currentQuestion.editor || 'python_coding';
    const commonProps = {
      questionIndex: currentQuestionIndex,
      totalQuestions: questions.length,
      onNext: handleNext,
      onQuestionChange: handleQuestionChange,
    };

    switch (editorType) {
      case 'python_coding':
        return <PythonEditorComponent {...commonProps} question={currentQuestion as any} />;
      case 'frontend_coding':
        return <FrontendEditorComponent {...commonProps} question={mapToQuestionData(currentQuestion)} />;
      case 'sql_coding':
        return <SQLCodeEditorComponent {...commonProps} question={currentQuestion as any} />;
      default:
        return <PythonEditorComponent {...commonProps} question={currentQuestion as any} />;
    }
  };

  // Show loading state
  if (loading) {
    return <CodingEditorLoader />;
  }

  // Show error if no questions
  if (!questions || questions.length === 0) {
    return (
      <div className="container-fluid p-0 d-flex justify-content-center align-items-center" style={{ height: "100vh", backgroundColor: "#f2eeee" }}>
        <div className="text-center">
          <h4 className="text-danger mb-3">No questions found</h4>
          <button className="btn btn-primary" onClick={() => navigate('/Subject-Roadmap')}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex me-2 mt-2" style={{ height: `calc(100vh - 70px)` }}>
      <QuestionNav
        totalQuestions={questions.length}
        currentIndex={currentQuestionIndex}
        onQuestionClick={handleQuestionChange}
      />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {renderEditor()}
      </div>
    </div>
  );
};

export default CourseCoding;
