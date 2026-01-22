import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import ProjectCodingSidebar from './ProjectCodingSidebar'
import ProjectCodingEditor from './ProjectCodingEditor'
import { getApiClient } from './utils/apiAuth'
import CryptoJS from 'crypto-js'
import { secretKey } from './constants'
import { getProjectId } from './utils/projectStorageUtils'
import LoaderComponent from './Components/LoaderComponent'

const ProjectComponent = () => {
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [containerStatus, setContainerStatus] = useState<any>(null)

  const setQuestionDataToSessionStorage = (question: any, fullResponse?: any) => {
    if (question.Name) sessionStorage.setItem('currentQuestionContent', question.Name)
    if (question.image_id) sessionStorage.setItem('projectCoding_imageId', question.image_id.toString())
    if (question.docker_image) sessionStorage.setItem('projectCoding_dockerImage', question.docker_image)
    if (question.master_repo_tag) sessionStorage.setItem('projectCoding_githubTag', question.master_repo_tag)
    if (question.master_repo_url) sessionStorage.setItem('projectCoding_githubRepoUrl', question.master_repo_url)
    if (question.Qn) sessionStorage.setItem('projectCoding_pageName', question.Qn)
    if (question.Qn_name) sessionStorage.setItem('projectCoding_questionId', question.Qn_name)
    // Store full question data for use in submit
    if (fullResponse) {
      sessionStorage.setItem('projectCoding_questionData', JSON.stringify(fullResponse))
    }
  }

  const provisionContainer = async (questionDataResponse: any, studentId: string, projectId: string) => {
    try {
      if (!questionDataResponse?.questions?.length) throw new Error("No questions found in response")

      const firstQuestion = questionDataResponse.questions[0]
      const questionId = firstQuestion.Qn_name
      const masterRepoUrl = firstQuestion.master_repo_url
      const tag = firstQuestion.master_repo_tag
      
      if (!questionId || !masterRepoUrl || !tag) {
        throw new Error("Missing required question data")
      }

      const apiClient = getApiClient()

      // Fork repository
      await apiClient.post(
        `${process.env.REACT_APP_BACKEND_URL}api/student/project/repository/fork/`,
        { student_id: studentId, project_id: projectId, question_id: questionId, master_repo_url: masterRepoUrl, tag, organization: "exskilence-lms" }
      )
      // Create branch
      await apiClient.post(
        `${process.env.REACT_APP_BACKEND_URL}api/student/project/branch/create/`,
        { student_id: studentId, project_id: projectId, question_id: questionId, parent_question_id: null }
      )

      // Provision VS Code
      const provisionResponse = await apiClient.post(
        `${process.env.REACT_APP_BACKEND_URL}api/student/vscode/provision`,
        { student_id: studentId, batch_project_id: Number(projectId), question_id: questionId }
      )
      
      if (provisionResponse.data?.access_url) {
        setContainerStatus({
          success: true,
          containerUrl: provisionResponse.data.access_url,
          containerName: provisionResponse.data.container_id.toString()
        })
      } else {
        throw new Error("Invalid provision response format")
      }
    } catch (provisionError: any) {
      console.error("Error provisioning container:", provisionError)
    }
  }

  useEffect(() => {
    const fetchQuestionData = async () => {
      try {
        setLoading(true)
        setError(null)

        const encryptedStudentId = sessionStorage.getItem("StudentId") || ""
        if (!encryptedStudentId) throw new Error("Student ID not found")
        
        const studentId = CryptoJS.AES.decrypt(encryptedStudentId, secretKey).toString(CryptoJS.enc.Utf8)
        const projectId = getProjectId("projectId") || ""

        // Check location state first (data passed via navigate)
        const questionDataFromState = (location.state as any)?.questionData
        if (questionDataFromState?.questions?.length) {
          setQuestionDataToSessionStorage(questionDataFromState.questions[0], questionDataFromState)
          setLoading(false)
          await provisionContainer(questionDataFromState, studentId, projectId)
          return
        }

        const phaseId = getProjectId("phaseId") || ""
        const partId = getProjectId("partId") || ""
        const taskId = getProjectId("taskId") || ""
        const subtaskId = sessionStorage.getItem("currentSubtaskId") || ""

        if (!projectId || !phaseId || !partId || !taskId || !subtaskId) {
          throw new Error("Missing required project IDs")
        }

        const response = await getApiClient().get(
          `${process.env.REACT_APP_BACKEND_URL}api/student/project/practice/project_coding/${studentId}/${projectId}/${phaseId}/${partId}/${taskId}/${subtaskId}/`
        )

        if (response.data?.questions?.length) {
          setQuestionDataToSessionStorage(response.data.questions[0], response.data)
          await provisionContainer(response.data, studentId, projectId)
        } else {
          throw new Error("Invalid response format")
        }
      } catch (err: any) {
        console.error("Error fetching question data:", err)
        setError(err.response?.data?.detail || err.message || "Failed to load question data")
      } finally {
        setLoading(false)
      }
    }

    fetchQuestionData()
  }, [location.state])

  if (loading) {
    return <LoaderComponent />
  }

  if (error) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="text-center">
          <p className="text-danger">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className='mt-2 me-2' style={{ display: 'flex', height: `calc(100vh - 70px)` }}>
        <div style={{ width: '30%', overflow: 'auto' }}>
          <ProjectCodingSidebar />
        </div>
        <div style={{ width: '70%', overflow: 'hidden' }}>
          <ProjectCodingEditor containerStatus={containerStatus} />
        </div>
    </div>
  )
};

export default ProjectComponent