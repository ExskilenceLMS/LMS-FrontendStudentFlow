import React, { useState, useEffect } from "react";
import { Modal } from "react-bootstrap";
import html2canvas from "html2canvas";
import apiClient from "./utils/apiAuth";
import { secretKey } from "./constants";
import CryptoJS from "crypto-js";

interface RaiseTicketProps {
  show: boolean;
  onHide: () => void;
  studentId?: string; 
}

const RaiseTicket: React.FC<RaiseTicketProps> = ({ show, onHide, studentId: propStudentId }) => {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [bugDesc, setBugDesc] = useState("");
  const [issueType, setIssueType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actualStudentId= CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualEmail= CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualName= CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);
 
  const getStudentId = () => {
    if (propStudentId) {
      return propStudentId;
    }
    
    const encryptedStudentId = sessionStorage.getItem('StudentId');
    if (!encryptedStudentId) return "";
    
    return CryptoJS.AES.decrypt(encryptedStudentId, secretKey).toString(CryptoJS.enc.Utf8);
  };

  const issueTypes = [
    "UI Related Topics",
    "Functionality Related Topics",
    "Performance Related Topics",
    "Security Vulnerability Related Topics",
    "Other Related Topics",
    "Require Tutor Assistance",
  ];

  useEffect(() => {
    if (show) {
      handleReportBug();
    }
  }, [show]);

  const handleReportBug = async () => {
    try {
      const options = {
        scale: 2, 
        useCORS: true, 
        logging: false, 
        foreignObjectRendering: true,
        removeContainer: true, 
        
        ignoreElements: (element: Element) => {
          const ignore = element.classList.contains('modal') || 
                        element.classList.contains('modal-backdrop');
          return ignore;
        }
      };

      const canvas = await html2canvas(document.body, options);
      const screenshot = canvas.toDataURL("image/png", 2.0); 
      setScreenshot(screenshot);
    } catch (error) {
      console.error("Error capturing screenshot:", error);
    }
  };

  const handleBugSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const url =`${process.env.REACT_APP_BACKEND_URL}api/student/tickets/`
    try {
      const studentId = getStudentId();
      
      const base64Data = screenshot ? screenshot.split(',')[1] : '';
      
      const payload = {
        student_id: studentId,
        issue_type: issueType,
        issue_description: bugDesc,
        img_path: base64Data ? `data:image/png;base64,${base64Data}` : ''
      };

      const response = await apiClient.post(
        url,
        payload
      );
      
      setBugDesc("");
      setIssueType("");
      setScreenshot(null);
      onHide();
    } catch (innerError: any) {
            setError("Failed to submit ticket. Please try again.");
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
                await apiClient.post(
                `${process.env.REACT_APP_BACKEND_URL}api/errorlog/`,
                body
                );
            } catch (loggingError) {
                console.error("Error logging the login error:", loggingError);
            }
 
            console.error("Error fetching login data:", innerError);
            }
            finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      size="lg" 
      centered
      contentClassName="border-0"
    >
      <div className="d-flex justify-content-end p-2">
        <button 
          onClick={onHide}
          className="btn-close"
          aria-label="Close"
        />
      </div>
      <Modal.Body className="p-2">
        <div className="container">
          <div className="row">
            <div className="col-md-6">
              <div className="mb-2">
                <span className="text-dark">Screenshots</span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px",
                  maxHeight: "300px",
                  overflowY: "auto",
                  borderRadius: "8px"
                }}
              >
                {screenshot && (
                  <img
                    src={screenshot}
                    alt="Screenshot"
                    style={{
                      height: "100%",
                      width: "100%",
                      objectFit: "contain",
                    }}
                  />
                )}
              </div>
            </div>

            <div className="col-md-6">
              <form onSubmit={handleBugSubmit}>
                <div className="mb-4">
                  <label className="form-label fw-medium">Support Type</label>
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    required
                    className="form-select"
                    style={{ backgroundColor: '#fff' }}
                  >
                    <option value="">Select</option>
                    {issueTypes.map((type, index) => (
                      <option key={index} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="form-label fw-medium">Description</label>
                  <textarea
                    className="form-control"
                    value={bugDesc}
                    onChange={(e) => setBugDesc(e.target.value)}
                    rows={4}
                    required
                    style={{ backgroundColor: '#fff' }}
                  />
                </div>
                {error && (
                  <div className="alert alert-danger py-2 mb-3" role="alert">
                    {error}
                  </div>
                )}
                <div className="text-end">
                  <button
                    type="submit"
                    className="btn btn-primary px-4"
                    disabled={loading}
                    style={{ backgroundColor: "#0d6efd", borderColor: "#0d6efd" }}
                  >
                    {loading ? "Submitting..." : "Raise Ticket"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default RaiseTicket;