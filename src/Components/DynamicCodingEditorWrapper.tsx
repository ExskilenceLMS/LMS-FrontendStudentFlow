import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DynamicCodingEditor from "./DynamicCodingEditor";

/**
 * DynamicCodingEditorWrapper Component
 * Wrapper that handles props for DynamicCodingEditor
 */
const DynamicCodingEditorWrapper: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract question data from location state
  const questionData = location.state?.sectionData;
  
  // Handle back navigation
  const handleBack = () => {
    navigate("/test-section");
  };
  
  // Show loading if no data
  if (!questionData) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }
  
  return (
    <DynamicCodingEditor
      questionData={questionData}
      onBack={handleBack}
    />
  );
};

export default DynamicCodingEditorWrapper; 