import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DynamicCodingEditor from "./DynamicCodingEditor";
import { getBackNavigationPath, navigateBackWithReplace } from "../utils/navigationRules";
import { secretKey } from "../constants";
import CryptoJS from "crypto-js";

/**
 * DynamicCodingEditorWrapper Component
 * Wrapper that handles props for DynamicCodingEditor
 */
const DynamicCodingEditorWrapper: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract question data from location state
  const questionData = location.state?.sectionData;
  
  // Handle back navigation using navigation rules with history replacement
  const handleBack = () => {
    const currentPath = location.pathname;
    
    // Pass the question data back to maintain state
    if (getBackNavigationPath(currentPath) === '/test-section') {
      // Get test data from location state or session storage as fallback
      let sectionData = questionData;
      if (!sectionData) {
        const encryptedTestData = sessionStorage.getItem('testSectionData');
        if (encryptedTestData) {
          try {
            sectionData = JSON.parse(CryptoJS.AES.decrypt(encryptedTestData, secretKey).toString(CryptoJS.enc.Utf8));
          } catch (error) {
            console.error("Error decrypting test data for navigation:", error);
          }
        }
      }
      
      // Use navigateBackWithReplace to prevent back button access
      navigateBackWithReplace(navigate, currentPath, { 
        sectionData: sectionData 
      });
    } else {
      navigateBackWithReplace(navigate, currentPath);
    }
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