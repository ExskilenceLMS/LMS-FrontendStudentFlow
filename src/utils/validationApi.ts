import apiClient from './apiAuth';

const API_BASE = process.env.REACT_APP_BACKEND_URL;
const VALIDATION_API_BASE = `${API_BASE}api`;

export async function getTasks() {
  try {
    const url = `${VALIDATION_API_BASE}/validation/tasks`;
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.error('Get tasks error:', error);
    throw error;
  }
}

export async function runValidation(taskId = null, projectId = null, containerName = null) {
  try {
    const body: any = {};
    if (projectId) {
      body.project_id = projectId;
    }
    if (containerName) {
      body.container_name = containerName;
    }
    
    const url = `${process.env.REACT_APP_BACKEND_URL}api/validation/run-all`;
    
    const response = await apiClient.post(url, body);
    return response.data;
  } catch (error) {
    console.error('Run validation error:', error);
    throw error;
  }
}

export async function getValidationStatus(jobId: string) {
  try {
    const url = `${VALIDATION_API_BASE}/validation/status/${jobId}`;
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.error('Get validation status error:', error);
    throw error;
  }
}

export async function getValidationResults(jobId: string) {
  try {
    const url = `${VALIDATION_API_BASE}/validation/results/${jobId}`;
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.error('Get validation results error:', error);
    throw error;
  }
}