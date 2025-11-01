import { useState, useRef } from 'react';

export interface QuestionData {
  Qn_name: string;
  Page_Name: string;
  level: string;
  subtopic_id: string;
  type: string;
  Tabs: Array<{ name: string; type: string }>;
  Qn: string;
  requirements: string;
  Code_Validation: { [key: string]: { template: string; structure?: any[] } };
  defaulttemplate: string;
  image_path: string;
  video_path: string;
  CreatedBy: string;
  CreatedOn: string;
  LastUpdated: string;
  status?: boolean;
  score?: string;
  entered_ans?: { [key: string]: string };
  image_urls?: Array<{actualUrl: string, expectedUrl: string}>;
}

export interface ModalContent {
  type: 'image' | 'video' | 'output';
  src: string;
  title: string;
}

export const useHtmlCssEditorState = () => {
  // File and content state
  const [fileContents, setFileContents] = useState<{[key: string]: string}>({});
  const [activeTab, setActiveTab] = useState('');
  const [editorInstances, setEditorInstances] = useState<{[key: string]: any}>({});
  
  // UI state
  const [isMaximized, setIsMaximized] = useState(false);
  const [showRequirement, setShowRequirement] = useState(false);
  const [activeSection, setActiveSection] = useState<'output' | 'console' | 'testcases'>('output');
  const [activeOutputTab, setActiveOutputTab] = useState('image');
  
  // Processing state
  const [processing, setProcessing] = useState<boolean>(false);
  const [hasRunCode, setHasRunCode] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  
  // Messages and results
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [additionalMessage, setAdditionalMessage] = useState<string>('');
  const [structureErrorMessage, setStructureErrorMessage] = useState<string>('');
  const [testResults, setTestResults] = useState<{[key: string]: boolean[]}>({});
  const [structureResults, setStructureResults] = useState<{[key: string]: boolean[]}>({});
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState<number | null>(null);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<ModalContent | null>(null);
  
  // Ref for tracking auto-saved code
  const hasLoadedAutoSavedCode = useRef(false);

  // Helper functions
  const getFileType = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension || 'text';
  };

  const getCurrentFileContent = (): string => {
    return fileContents[activeTab] || '';
  };

  const updateFileContent = (fileName: string, content: string) => {
    setFileContents(prev => ({
      ...prev,
      [fileName]: content
    }));
  };

  const handleTabClick = (fileName: string) => {
    setActiveTab(fileName);
    // Force re-render of editor by clearing the instance for this file
    setEditorInstances(prev => {
      const newInstances = { ...prev };
      delete newInstances[fileName];
      return newInstances;
    });
  };

  const openModal = (type: 'image' | 'video' | 'output', src: string, title: string) => {
    setModalContent({ type, src, title });
    setShowModal(true);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setShowModal(false);
    setModalContent(null);
    // Restore body scroll when modal is closed
    document.body.style.overflow = 'unset';
  };

  const resetMessages = () => {
    setSuccessMessage('');
    setAdditionalMessage('');
    setStructureErrorMessage('');
  };

  const resetTestResults = () => {
    setTestResults({});
    setStructureResults({});
    setSelectedTestCaseIndex(null);
  };

  const resetEditorState = () => {
    setEditorInstances({});
    setActiveSection('output');
    setActiveOutputTab('image');
    resetMessages();
    resetTestResults();
  };

  return {
    // State
    fileContents,
    setFileContents,
    activeTab,
    setActiveTab,
    editorInstances,
    setEditorInstances,
    isMaximized,
    setIsMaximized,
    showRequirement,
    setShowRequirement,
    activeSection,
    setActiveSection,
    activeOutputTab,
    setActiveOutputTab,
    processing,
    setProcessing,
    hasRunCode,
    setHasRunCode,
    isSubmitted,
    setIsSubmitted,
    successMessage,
    setSuccessMessage,
    additionalMessage,
    setAdditionalMessage,
    structureErrorMessage,
    setStructureErrorMessage,
    testResults,
    setTestResults,
    structureResults,
    setStructureResults,
    selectedTestCaseIndex,
    setSelectedTestCaseIndex,
    showModal,
    setShowModal,
    modalContent,
    setModalContent,
    hasLoadedAutoSavedCode,
    
    // Helper functions
    getFileType,
    getCurrentFileContent,
    updateFileContent,
    handleTabClick,
    openModal,
    closeModal,
    resetMessages,
    resetTestResults,
    resetEditorState,
  };
};
