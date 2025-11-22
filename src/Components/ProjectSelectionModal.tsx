import React, { useEffect, useState } from "react";
import { Modal, Button, Spinner, Alert, Form, Card } from "react-bootstrap";
import { useApiLoading } from "../Dashboard";
import { getApiClient } from "../utils/apiAuth";
import { INDUSTRY_OPTIONS } from "../constants/constants";
import CryptoJS from "crypto-js";
import { secretKey } from "../constants";

interface ProjectSelectionModalProps {
  show: boolean;
  internship: any | null;
  onClose: () => void;
}

const ProjectSelectionModal: React.FC<ProjectSelectionModalProps> = ({
  show,
  internship,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { studentId } = useApiLoading();
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [stage, setStage] = useState<"filters" | "details">("filters");
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [projectDetails, setProjectDetails] = useState<any | null>(null);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);

  useEffect(() => {
    if (show && internship) {
      setStage("filters");
      setSelectedProject(null);
      setProjectDetails(null);
      setSelectedCompany("");
      setSelectedDomain("");
      setProjects([]);
      setError(null);
      setProjectError(null);
      fetchCompanies();
    }
  }, [show, internship]);

  useEffect(() => {
    if (selectedCompany && selectedDomain) {
      fetchProjects();
    } else {
      setProjects([]);
    }
  }, [selectedCompany, selectedDomain]);

  const fetchCompanies = async () => {
    if (!internship) return;
    setLoadingCompanies(true);
    try {
      const response = await getApiClient().get(
        `${process.env.REACT_APP_BACKEND_URL}api/studentdashboard/internships/${internship.title}/companies`,
        { params: { student_id: studentId } }
      );
      setCompanies(response.data?.companies || []);
    } catch (err) {
      setError("Failed to load companies. Please try again.");
    } finally {
      setLoadingCompanies(false);
    }
  };

  const fetchProjects = async () => {
    if (!internship || !selectedCompany || !selectedDomain) return;
    setLoading(true);
    setError(null);
    try {
      // Get batch_id from session storage
      const encryptedBatchId = sessionStorage.getItem("BatchId");
      const batchId = encryptedBatchId 
        ? CryptoJS.AES.decrypt(encryptedBatchId, secretKey).toString(CryptoJS.enc.Utf8) 
        : "";
      
      const response = await getApiClient().get(
        `${process.env.REACT_APP_BACKEND_URL}api/student/get-all-projects/${batchId}`,
        {
          params: {
            company: selectedCompany,
            domain: selectedDomain
          }
        }
      );
      setProjects(response.data?.projects || []);
    } catch (err) {
      setError("Failed to load projects. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectDetails = async (project: any) => {
    if (!project?.project_id) return;
    setLoadingDetails(true);
    setProjectError(null);
    try {
      // Get batch_id from session storage
      const encryptedBatchId = sessionStorage.getItem("BatchId");
      const batchId = encryptedBatchId 
        ? CryptoJS.AES.decrypt(encryptedBatchId, secretKey).toString(CryptoJS.enc.Utf8) 
        : "";
      
      const response = await getApiClient().get(
        `${process.env.REACT_APP_BACKEND_URL}api/student/get-all-projects/${batchId}`,
        {
          params: {
            project_id: project.project_id
          }
        }
      );
      // Find the project in the response
      const projectData = response.data?.projects?.find((p: any) => p.project_id === project.project_id);
      setProjectDetails(projectData || project);
    } catch (err) {
      setProjectError("Failed to load project details. Please try again.");
      setProjectDetails(project);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleProjectClick = (project: any) => {
    setSelectedProject(project);
    setProjectDetails(project); // Use the project data directly from listing
    setStage("details");
  };

  const handleClose = () => {
    onClose();
  };

  const handleBackToFilters = () => {
    setStage("filters");
    setProjectDetails(null);
    setSelectedProject(null);
  };

  const renderFiltersStage = () => (
    <>
      <Form>
        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <Form.Label>Company</Form.Label>
            <Form.Select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              disabled={loadingCompanies}
            >
              <option value="">Select company</option>
              {companies.map((company) => (
                <option key={company.id || company.name} value={company.id || company.name}>
                  {company.name}
                </option>
              ))}
            </Form.Select>
          </div>
          <div className="col-md-6">
            <Form.Label>Domain</Form.Label>
            <Form.Select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
            >
              <option value="">Select domain</option>
              {INDUSTRY_OPTIONS.map((industry) => (
                <option key={industry.value} value={industry.value}>
                  {industry.label}
                </option>
              ))}
            </Form.Select>
          </div>
        </div>
      </Form>

      {loading && (
        <div className="d-flex justify-content-center py-3">
          <Spinner animation="border" />
        </div>
      )}

      {error && <Alert variant="danger">{error}</Alert>}

      {!loading && !error && projects.length === 0 && selectedCompany && selectedDomain && (
        <p className="text-muted">No projects available for the selected filters.</p>
      )}

      {!loading && !error && projects.length > 0 && (
        <div className="row g-3">
          {projects.map((project, index) => (
            <div key={project.project_id || index} className="col-md-6">
              <Card 
                className="h-100 cursor-pointer"
                style={{ cursor: "pointer" }}
                onClick={() => handleProjectClick(project)}
              >
                <Card.Body>
                  <Card.Title className="h6">{project.project_name || `Project ${index + 1}`}</Card.Title>
                  <Card.Text className="text-muted small">
                    {project.project_description || "No description available."}
                  </Card.Text>
                  {project.slots_left && (
                    <small className="text-muted">
                      Slots left: {project.slots_left}
                    </small>
                  )}
                </Card.Body>
              </Card>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const renderDetailsStage = () => {
    const project = projectDetails || selectedProject;
    const videoUrl = project?.video_otp && project?.video_playback_info
      ? `https://player.vdocipher.com/v2/?otp=${project.video_otp}&playbackInfo=${project.video_playback_info}`
      : null;

    return (
      <div className="row g-3">
        {/* Left side - Project list */}
        <div className="col-md-5">
          <Button variant="link" onClick={handleBackToFilters} className="px-0 mb-3">
            ← Back to project list
          </Button>
          
          {loadingDetails && (
            <div className="d-flex justify-content-center py-3">
              <Spinner animation="border" />
            </div>
          )}

          {projectError && <Alert variant="danger">{projectError}</Alert>}

          {project && (
            <div>
              <h5>{project.project_name || "Project Name"}</h5>
              <p className="text-muted mb-3">{project.project_description || "Description not available."}</p>
              {project.slots_left && (
                <div className="mb-2">
                  <strong>Slots left:</strong> {project.slots_left}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right side - Video */}
        <div className="col-md-7">
          {loadingDetails ? (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
              <Spinner animation="border" />
            </div>
          ) : videoUrl ? (
            <div
              className="h-100 overflow-hidden p-0"
              style={{ backgroundColor: "transparent", minHeight: "400px" }}
            >
              <iframe
                className="w-100 h-100"
                src={videoUrl}
                title="Video Player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                style={{
                  boxShadow: "0px 2px 8px rgba(0,0,0,0.1)",
                  borderRadius: "0px",
                  backgroundColor: "transparent",
                  minHeight: "400px"
                }}
              />
            </div>
          ) : (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
              <p className="text-muted">Video not available</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!internship) {
    return null;
  }

  return (
    <Modal show={show} onHide={onClose} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Select Project</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {stage === "filters" && (
          <p className="mb-3">
            Select a project for: <strong>{internship.title}</strong>
          </p>
        )}
        {stage === "filters" ? renderFiltersStage() : renderDetailsStage()}
      </Modal.Body>
      <Modal.Footer>
        {stage === "details" ? (
          <>
            <Button variant="secondary" onClick={handleBackToFilters}>
              Close
            </Button>
            <Button variant="primary" disabled={!selectedProject}>
              Select
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default ProjectSelectionModal;

