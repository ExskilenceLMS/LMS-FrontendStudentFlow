import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApiClient } from '../utils/apiAuth';
import { getBackNavigationPath } from '../utils/navigationRules';
import PyEditor from '../PyEditor';
import SQLEditor from '../SQLEditor';
import HTMLCSSEditor from '../HTMLCSSEditor';
import SkeletonCode from './EditorSkeletonCode';
import CryptoJS from 'crypto-js';
import { secretKey } from '../constants';

interface Question {
  Qn: string;
  Tabs: Array<{
    name: string;
    type: string;
  }>;
  Tags: string[];
  type: string;
  Hints: any[];
  level: string;
  Examples: any[];
  CreatedBy: string;
  CreatedOn: string;
  Page_Name: string;
  TestCases: any[];
  image_path?: string;
  video_path?: string;
  LastUpdated: string;
  currentFile: string;
  subtopic_id: string;
  Explanations: any[];
  requirements: string;
  Code_Validation: any;
  Last_Updated_by: string;
  defaulttemplate?: string;
  image_urls?: Array<{ actualUrl: string; expectedUrl: string }>;
}

interface TransformedQuestion {
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
          const transformedQuestions: TransformedQuestion[] = data.questions.map((q, index) => {
            // Extract Ans from Code_Validation for HTML subjects
            let ansValue = '';
            if (q.Code_Validation && typeof q.Code_Validation === 'object') {
              const fileKeys = Object.keys(q.Code_Validation);
              if (fileKeys.length > 0) {
                // For HTML subjects, look for index.html file in Code_Validation
                const htmlFile = fileKeys.find(fileName => fileName === 'index.html');
                if (htmlFile && q.Code_Validation[htmlFile] && q.Code_Validation[htmlFile].Ans) {
                  ansValue = q.Code_Validation[htmlFile].Ans;
                } else if (fileKeys[0] && q.Code_Validation[fileKeys[0]] && q.Code_Validation[fileKeys[0]].Ans) {
                  // Fallback to first file if index.html not found
                  ansValue = q.Code_Validation[fileKeys[0]].Ans;
                }
              }
            }
            
            return {
            Qn_name: q.currentFile || `question_${index}`,
            entered_ans: '',
            score: '0/10',
            status: false,
            Qn: q.Qn,
            Ans: ansValue,
            Name: q.Page_Name,
            QNty: q.type,
            QnTe: q.defaulttemplate || '',
            QnTy: q.type,
            Tags: q.Tags,
            test: [],
            Hints: q.Hints,
            Level: q.level,
            Table: '',
            Examples: q.Examples,
            Template: q.defaulttemplate || '',
            ConceptID: q.subtopic_id,
            CreatedBy: q.CreatedBy,
            CreatedON: q.CreatedOn,
            TestCases: q.TestCases,
            LastUpdated: q.LastUpdated,
            MultiSelect: '',
            Explanations: q.Explanations,
            FunctionCall: '',
            QuestionType: q.type,
            subject_id: subject_id,
            topic_id: q.subtopic_id,
            subtopic_id: q.subtopic_id,
            Last_Updated_by: q.Last_Updated_by,
            level: q.level,
            // Additional fields for HTML/CSS editor
            Tabs: q.Tabs,
            requirements: q.requirements,
            Code_Validation: q.Code_Validation,
            image_path: q.image_path,
            video_path: q.video_path,
            currentFile: q.currentFile,
            image_urls: q.image_urls
            };
          });
          
          // Store in session storage for the editor components
          sessionStorage.setItem('codingQuestions', JSON.stringify(transformedQuestions));
          sessionStorage.setItem('currentQuestionIndex', '0');
          
          // Set the transformed questions in state
          setQuestions(transformedQuestions);
          
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

  // Determine which editor to render based on subject_id
  const renderEditor = () => {
    const subject = subject_id?.toLowerCase();
    
    switch (subject) {
      case 'py':
      case 'python':
        return <PyEditor />;
      case 'sq':
      case 'sql':
        return <SQLEditor />;
      case 'html':
      case 'css':
      case 'html-css':
      default:
        return <HTMLCSSEditor />;
    }
  };

  return (
    <div>
      {renderEditor()}
    </div>
  );
};

export default SubjectBasedCodingEditor;
