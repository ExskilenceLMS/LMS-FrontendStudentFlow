import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApiClient } from '../utils/apiAuth';
import { getBackNavigationPath } from '../utils/navigationRules';
import PythonEditorComponent from './PythonEditorComponent';
import FrontendEditorComponent from './FrontendEditorComponent';
import SQLCodeEditorComponent from './SQLCodeEditorComponent';
import QuestionNav from './QuestionNav';
import SkeletonCode from './EditorSkeletonCode';
import CryptoJS from 'crypto-js';
import { secretKey } from '../constants';

interface Question {
  Qn: string;
  Ans: string;
  Expl: any[];
  Name: string;
  QNty: string;
  QnTe: string;
  test: any[];
  Hints: any[];
  Level: string;
  Table: string;
  CreatedOn: string;
  TestCases: any[];
  MultiSelect: string;
  ExpectedOutput: any[];
  editor: string; // Editor type: "python_coding", "frontend_coding", "sql_coding"
  // Optional fields that may exist
  Tabs?: Array<{
    name: string;
    type: string;
  }>;
  Tags?: string[];
  type?: string;
  level?: string;
  Examples?: any[];
  CreatedBy?: string;
  Page_Name?: string;
  image_path?: string;
  video_path?: string;
  LastUpdated?: string;
  currentFile?: string;
  subtopic_id?: string;
  Explanations?: any[];
  requirements?: string;
  Code_Validation?: any;
  Last_Updated_by?: string;
  defaulttemplate?: string;
  image_urls?: Array<{ actualUrl: string; expectedUrl: string }>;
  question_id?: string;
}

interface TransformedQuestion {
  Qn_name: string;
  entered_ans: string;
  score: string;
  status: boolean;
  Qn: string;
  Ans: string;
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
  TestCases: any[];
  LastUpdated: string;
  MultiSelect: string;
  Explanations: any[];
  FunctionCall: string;
  QuestionType: string;
  subject_id?: string;
  topic_id?: string;
  subtopic_id?: string;
  Last_Updated_by?: string;
  level?: string;
  Query?: string;
  ExpectedOutput?: any[];
  editor: string; // Editor type: "python_coding", "frontend_coding", "sql_coding"
  // Additional fields for HTML/CSS editor
  Tabs?: Array<{
    name: string;
    type: string;
  }>;
  requirements?: string;
  Code_Validation?: any;
  image_path?: string;
  video_path?: string;
  currentFile?: string;
  image_urls?: Array<{actualUrl: string, expectedUrl: string}>;
  question_id?: string;
}

interface ApiResponse {
  questions: Question[];
}

const SubjectBasedCodingEditor: React.FC = () => {
  const { subject_id } = useParams<{ subject_id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [questions, setQuestions] = useState<TransformedQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);


  useEffect(() => {
    const fetchQuestions = async () => {
      if (!subject_id) {
        setError("Missing required parameters");
        setLoading(false);
        return;
      }

      try {
        // Store subject_id in session storage for the editor components
        // The HTMLCSSEditor expects these specific encrypted keys
        const encryptData = (data: string) => {
          return CryptoJS.AES.encrypt(data, secretKey).toString();
        };
        
        sessionStorage.setItem('SubjectId', encryptData(subject_id));
        sessionStorage.setItem('Subject', encryptData(subject_id));
        sessionStorage.setItem('WeekNumber', encryptData('1')); // Default week
        sessionStorage.setItem('DayNumber', encryptData('1')); // Default day
        sessionStorage.setItem('currentSubTopicId', subject_id); // Use subject_id as subtopic (not encrypted)
        
        // API call to fetch coding questions by subject_id
        const url = `${process.env.REACT_APP_BACKEND_URL}api/student/testing/coding/${subject_id}`;
        
        const response = await getApiClient().get(url);

        const data: ApiResponse = response.data;
        
        if (data.questions && data.questions.length > 0) {
          // Transform the data to match the expected format for the editors
          const transformedQuestions: TransformedQuestion[] = data.questions.map((q, index) => ({
            Qn_name: q.Name || `question_${index + 1}`,
            entered_ans: '',
            score: '0/10',
            status: false,
            Qn: q.Qn || '',
            Ans: q.Ans || '',
            Tags: q.Tags || [],
            test: q.test || [],
            Hints: q.Hints || [],
            Level: q.Level || q.level || '',
            Table: q.Table || '',
            Examples: q.Examples || [],
            Template: q.defaulttemplate || '',
            ConceptID: q.subtopic_id || '',
            CreatedBy: q.CreatedBy || '',
            CreatedON: q.CreatedOn || '',
            TestCases: q.TestCases || [],
            LastUpdated: q.LastUpdated || q.CreatedOn || '',
            MultiSelect: q.MultiSelect || '0',
            Explanations: q.Explanations || q.Expl || [],
            FunctionCall: '',
            QuestionType: q.type || '',
            subject_id: subject_id,
            topic_id: q.subtopic_id || '',
            subtopic_id: q.subtopic_id || '',
            Last_Updated_by: q.Last_Updated_by || '',
            level: q.Level || q.level || '',
            Query: q.Ans || '',
            ExpectedOutput: q.ExpectedOutput || [],
            editor: q.editor || 'python_coding', // Default to python_coding if not specified
            // Additional fields for HTML/CSS editor
            Tabs: q.Tabs,
            requirements: q.requirements,
            Code_Validation: q.Code_Validation,
            image_path: q.image_path,
            video_path: q.video_path,
            currentFile: q.currentFile || q.Name || `question_${index + 1}`,
            image_urls: q.image_urls,
            question_id: q.question_id || ''
          }));
          
          // Store in session storage for the editor components
          sessionStorage.setItem('codingQuestions', JSON.stringify(transformedQuestions));
          sessionStorage.setItem('currentQuestionIndex', '0');
          
          // Set the transformed questions in state
          setQuestions(transformedQuestions);
          setCurrentQuestionIndex(0);
          
        } else {
          setError("No coding questions found for this subject");
        }
      } catch (err: any) {
        console.error("Error fetching coding questions:", err);
        setError(err.response?.data?.message || "Failed to fetch questions");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [subject_id]);

  const handleBackNavigation = () => {
    const backPath = getBackNavigationPath(`/testing/coding/${subject_id}`);
    navigate(backPath, { replace: true });
  };

  // Show loading skeleton while data is being fetched
  if (loading) {
    return (
      <div className="container-fluid p-0" style={{ height: "100vh", maxWidth: "100%", overflowX: "hidden", backgroundColor: "#f2eeee" }}>
        <div className="p-0 my-0 me-2" style={{ backgroundColor: "#F2EEEE"}}>
          <SkeletonCode />
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container-fluid p-0 d-flex justify-content-center align-items-center" style={{ height: "100vh", backgroundColor: "#f2eeee" }}>
        <div className="text-center">
          <h4 className="text-danger mb-3">{error}</h4>
          <button className="btn btn-primary" onClick={handleBackNavigation}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Show no questions state
  if (questions.length === 0) {
    return (
      <div className="container-fluid p-0 d-flex justify-content-center align-items-center" style={{ height: "100vh", backgroundColor: "#f2eeee" }}>
        <div className="text-center">
          <h4>No coding questions available for this subject</h4>
          <button className="btn btn-primary mt-3" onClick={handleBackNavigation}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const handleQuestionChange = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
      sessionStorage.setItem('currentQuestionIndex', index.toString());
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      handleQuestionChange(currentQuestionIndex + 1);
    } else {
      // Navigate back when all questions are done
      handleBackNavigation();
    }
  };

  // Map TransformedQuestion to QuestionData format for FrontendEditorComponent
  const mapToQuestionData = (q: TransformedQuestion): any => {
    return {
      Qn_name: q.Qn_name,
      Page_Name: q.Qn_name,
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

  return (
    <div className="d-flex me-2 mt-2" style={{ height: `calc(100vh - 70px)`}}>
      <QuestionNav
        totalQuestions={questions.length}
        currentIndex={currentQuestionIndex}
        onQuestionClick={handleQuestionChange}
        questionLabel="Q"
      />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {renderEditor()}
      </div>
    </div>
  );
};

export default SubjectBasedCodingEditor;
