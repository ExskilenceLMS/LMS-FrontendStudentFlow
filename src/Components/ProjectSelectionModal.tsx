import React, { useEffect, useState } from "react";
import { Modal, Button, Spinner, Alert, Form, Card } from "react-bootstrap";
import { useApiLoading } from "../Dashboard";
import { getApiClient } from "../utils/apiAuth";
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
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [industries, setIndustries] = useState<string[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [viewingProject, setViewingProject] = useState<any | null>(null);
  const [modalView, setModalView] = useState<"list" | "details">("list");

  const getBatchId = () => {
    const encryptedBatchId = sessionStorage.getItem('BatchId');
    if (!encryptedBatchId) return '';
    try {
      return CryptoJS.AES.decrypt(encryptedBatchId, secretKey).toString(CryptoJS.enc.Utf8);
    } catch (error) {
      return '';
    }
  };

  useEffect(() => {
    if (show && internship) {
      resetState();
      fetchData();
    }
  }, [show, internship]);

  useEffect(() => {
    filterProjects();
  }, [selectedCompany, selectedDomain, allProjects]);

  const resetState = () => {
    setSelectedProject(null);
    setSelectedCompany("");
    setSelectedDomain("");
    setProjects([]);
    setAllProjects([]);
    setError(null);
    setViewingProject(null);
    setModalView("list");
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [companiesRes, industriesRes, projectsRes] = await Promise.all([
        getApiClient().get(`${process.env.REACT_APP_BACKEND_URL}api/admin/company/`),
        getApiClient().get(`${process.env.REACT_APP_BACKEND_URL}api/admin/company/get-all-industry`),
        getApiClient().get(`${process.env.REACT_APP_BACKEND_URL}api/student/get-all-projects/${getBatchId()}`)
      ]);

      setCompanies(companiesRes.data?.companies?.filter((c: any) => !c.del_row) || []);
      setIndustries(industriesRes.data?.industry || []);
      setAllProjects(projectsRes.data?.projects || projectsRes.data || []);
    } catch (err) {
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filterProjects = () => {
    if (!selectedCompany || !selectedDomain) {
      setProjects([]);
      return;
    }

    const filtered = allProjects.filter((project: any) => 
      project.company_id === selectedCompany && project.industry === selectedDomain
    );
    setProjects(filtered);
  };

  const handleSelectProject = async () => {
    if (!selectedProject || !studentId) return;

    setSubmitting(true);
    try {
      await getApiClient().post(`${process.env.REACT_APP_BACKEND_URL}api/student/select-project/`, {
        student_id: studentId,
        project_id: selectedProject.project_id || selectedProject.id
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to select project.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} size="lg" centered>
      <Modal.Header 
        closeButton 
        className="border-0"
        style={{ 
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: "0.5rem 0.5rem 0 0"
        }}
      >
        <Modal.Title className="text-white fw-bold">
          {modalView === "details" ? "Project Details" : "Select Project"}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {modalView === "list" ? (
          <>
            {error && <Alert variant="danger">{error}</Alert>}
        
        <Form className="mb-4">
          <div className="row g-3">
            <div className="col-md-6">
              <Form.Label>Company</Form.Label>
              <Form.Select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
              >
                <option value="">Select company</option>
                {companies.map((company) => (
                  <option key={company.company_id} value={company.company_id}>
                    {company.company_name}
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
                {industries.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </Form.Select>
            </div>
          </div>
        </Form>

        {loading && (
          <div className="text-center py-4">
            <Spinner animation="border" />
          </div>
        )}

        {!loading && projects.length === 0 && selectedCompany && selectedDomain && (
          <div className="text-center py-4 text-muted">
            No projects available for selected filters.
          </div>
        )}

        {!loading && projects.length > 0 && (
          <div className="row g-3">
            {projects.map((project) => (
              <div key={project.project_id} className="col-md-6">
                <Card 
                  className={`h-100 ${selectedProject?.project_id === project.project_id ? "border-primary" : ""}`}
                  style={{ 
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    minHeight: "150px"
                  }}
                  onClick={() => setSelectedProject(project)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-5px)";
                    e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
                  }}
                >
                  <Card.Body className="d-flex flex-column h-100">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <Card.Title 
                        className="h6 text-decoration-underline"
                        style={{ textUnderlineOffset: "4px" }}
                      >
                        {project.project_name}
                      </Card.Title>
                      {selectedProject?.project_id === project.project_id && (
                        <i className="bi bi-check-circle-fill text-primary"></i>
                      )}
                    </div>
                    <Card.Text className="text-muted small">
                      {project.project_description && project.project_description.length > 80 
                        ? `${project.project_description.slice(0, 80)}...` 
                        : project.project_description}
                    </Card.Text>
                    <div className="d-flex justify-content-between align-items-center gap-2 mt-auto">
                      {project.slots_left && (
                        <span 
                          className={`badge rounded-pill px-2 py-1 ${
                            parseInt(project.slots_left) > 0 ? "bg-success text-white" : "bg-secondary text-white"
                          }`}
                          style={{ fontSize: "0.75rem" }}
                        >
                          {project.slots_left} slots available
                        </span>
                      )}
                      {project.project_description && project.project_description.length > 80 && (
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="p-0 text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingProject(project);
                            setModalView("details");
                          }}
                        >
                          View More
                        </Button>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </div>
            ))}
          </div>
        )}
          </>
        ) : (
          // Project Details View
          viewingProject && (
            <div className="p-2">
              <div className="row">
                {viewingProject.image && (
                  <div className="col-md-4 mb-3">
                    <img 
                      src={viewingProject.image} 
                      alt={viewingProject.project_name}
                      className="img-fluid rounded"
                      style={{ width: "100%", height: "200px", objectFit: "cover" }}
                    />
                  </div>
                )}
                <div className={viewingProject.image ? "col-md-8" : "col-12"}>
                  <h5 className="text-decoration-underline mb-3" style={{ textUnderlineOffset: "4px" }}>
                    {viewingProject.project_name}
                  </h5>
                  <p className="text-muted mb-3">
                    {viewingProject.project_description}
                  </p>
                  {viewingProject.slots_left && (
                    <span 
                      className={`badge rounded-pill px-3 py-2 ${
                        parseInt(viewingProject.slots_left) > 0 ? "bg-success text-white" : "bg-secondary text-white"
                      }`}
                    >
                      {viewingProject.slots_left} slots available
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        )}
      </Modal.Body>
      
      <Modal.Footer>
        {modalView === "details" ? (
          <>
            <Button 
              variant="secondary" 
              onClick={() => {
                setModalView("list");
                setViewingProject(null);
              }}
            >
              <i className="bi bi-arrow-left me-2"></i>Back to Projects
            </Button>
            <Button 
              variant="primary" 
              onClick={() => {
                setSelectedProject(viewingProject);
                setModalView("list");
                setViewingProject(null);
              }}
            >
              Select This Project
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              disabled={!selectedProject || submitting}
              onClick={handleSelectProject}
            >
              {submitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Selecting...
                </>
              ) : (
                "Select Project"
              )}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default ProjectSelectionModal;