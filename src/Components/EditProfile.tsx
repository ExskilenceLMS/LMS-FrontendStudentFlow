import React, { useState, useEffect, useCallback } from 'react';
import apiClient from "../utils/apiAuth";
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaTrash, FaFile, FaVideo, FaLinkedin, FaCode, FaHackerrank, FaGithub } from 'react-icons/fa';
import { secretKey } from "../constants";
import CryptoJS from "crypto-js";

interface ProfileDetails {
  college: string;
  branch: string;
  gender: string;
  address: string;
  email: string;
  phone: string;
  college_batch: string;
}

interface EducationDetails {
  degree: string;
  institute: string;
  branch: string;
  cgpa: number;
  yop: number;
}

interface College {
  [key: string]: string[];
}

interface SocialMedia {
  linkedin: string;
  github: string;
  leetcode: string;
  hackerrank: string;
  resume?: string;
  video?: string;
}

const EditProfile: React.FC = () => {
  const navigate = useNavigate();
  
  // Constants
  const DEGREE_OPTIONS = ['Select Degree', 'BE', '12th', '10th'];
  const BRANCH_OPTIONS_12TH = ['Select Branch', 'PCMB', 'PCMC', 'PCME'];
  const API_BASE_URL = `${process.env.REACT_APP_BACKEND_URL}api`;

  const YEAR_OPTIONS = (() => {
    const currentYear = new Date().getFullYear();
    const years = ['Select Year'];
    for (let year = 2001; year <= currentYear + 20; year++) {
      years.push(year.toString());
    }
    return years;
  })();

  const [profileDetails, setProfileDetails] = useState<ProfileDetails>({
    college: '',
    branch: '',
    gender: '',
    address: '',
    email: '',
    phone: '',
    college_batch: ''
  });

  const [educationDetails, setEducationDetails] = useState<EducationDetails[]>([
    { degree: '', institute: '', branch: '', cgpa: 0, yop: 0 }
  ]);

  const [socialMedia, setSocialMedia] = useState<SocialMedia>({
    linkedin: '',
    github: '',
    leetcode: '',
    hackerrank: '',
    resume: '',
    video: ''
  });

  const [colleges, setColleges] = useState<College>({});
  const [branches, setBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const actualStudentId= CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualEmail= CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualName= CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);

  const encryptedStudentId = sessionStorage.getItem('StudentId');
  const studentId = encryptedStudentId 
    ? CryptoJS.AES.decrypt(encryptedStudentId, secretKey).toString(CryptoJS.enc.Utf8) 
    : '';

  const fetchColleges = useCallback(async () => {
    const url=`${API_BASE_URL}/colleges`
    try {
      const response = await apiClient.get(url);
      setColleges(response.data);
      return response.data;
    } catch (innerError: any) {
      console.error("Error fetching Colleges in EditProfile data:", innerError);
      return {};
    }
  }, [API_BASE_URL]);

  const fetchProfileData = useCallback(async () => {
    if (!studentId) return;
    const url=`${API_BASE_URL}/student/profile/${studentId}`
    try {
      setLoading(true);
      const response = await apiClient.get(url);
      const { profile_details, education_details, social_media } = response.data;

      setProfileDetails({
        college: profile_details?.college || '',
        branch: profile_details?.branch || '',
        gender: profile_details?.gender || '',
        address: profile_details?.address || '',
        email: profile_details?.email || '',
        phone: profile_details?.phone || '',
        college_batch: profile_details?.college_batch || ''
      });

      if (education_details && education_details.length > 0) {
        setEducationDetails(education_details);
      }

      if (social_media) {
        setSocialMedia({
          linkedin: social_media.linkedin || '',
          github: social_media.github || '',
          leetcode: social_media.leetcode || '',
          hackerrank: social_media.hackerrank || '',
          resume: social_media.resume || '',
          video: social_media.video || ''
        });
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, studentId]);

  useEffect(() => {
    const loadInitialData = async () => {
      await fetchColleges();
      await fetchProfileData();
    };
    
    loadInitialData();
  }, [fetchColleges, fetchProfileData]);

  useEffect(() => {
    if (Object.keys(colleges).length > 0 && educationDetails.length > 0) {
      educationDetails.forEach((edu) => {
        if (edu.degree === 'BE' && edu.institute && colleges[edu.institute]) {
          setBranches(colleges[edu.institute]);
        }
      });
    }
  }, [colleges, educationDetails]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfileDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleSocialMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSocialMedia(prev => ({ ...prev, [name]: value }));
  };

  const handleInstituteChange = (index: number, e: React.ChangeEvent<HTMLSelectElement>) => {
    const institute = e.target.value;
    const updatedEducation = [...educationDetails];
    updatedEducation[index] = {
      ...updatedEducation[index],
      institute,
      branch: '' 
    };

    setEducationDetails(updatedEducation);

    if (updatedEducation[index].degree === 'BE' && institute && colleges[institute]) {
      setBranches(colleges[institute]);
    }
  };

  const handleEducationChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const updatedEducation = [...educationDetails];

    if (name === 'degree') {
      const degreeExists = educationDetails.some(
        (edu, i) => i !== index && edu.degree === value && value !== 'Select Degree'
      );

      if (degreeExists) {
        alert(`You already have an entry for ${value}. Please select a different degree or update the existing one.`);
        return;
      }

      updatedEducation[index] = {
        ...updatedEducation[index],
        degree: value,
        institute: '',
        branch: '',
      };

      if (value === 'BE') {
        fetchColleges();
      }
    } else if (name === 'cgpa') {
      updatedEducation[index] = {
        ...updatedEducation[index],
        [name]: value === '' ? 0 : parseFloat(value)
      };
    } else if (name === 'yop') {
      updatedEducation[index] = {
        ...updatedEducation[index],
        [name]: value === 'Select Year' ? 0 : parseInt(value, 10)
      };
    } else {
      updatedEducation[index] = {
        ...updatedEducation[index],
        [name]: value
      };
    }

    setEducationDetails(updatedEducation);
  };

  const addEducationRow = () => {
    const hasEmptyDegree = educationDetails.some(edu => !edu.degree || edu.degree === 'Select Degree');

    if (hasEmptyDegree) {
      alert('Please complete the current education details before adding a new one.');
      return;
    }

    const usedDegrees = educationDetails.map(edu => edu.degree);
    const availableDegrees = DEGREE_OPTIONS.filter(
      degree => degree === 'Select Degree' || !usedDegrees.includes(degree)
    );

    if (availableDegrees.length <= 1) { 
      alert('You have already added all available education types.');
      return;
    }

    setEducationDetails([
      ...educationDetails,
      { degree: '', institute: '', branch: '', cgpa: 0, yop: 0 }
    ]);
  };

  const removeEducationRow = (index: number) => {
    setEducationDetails(prevDetails => prevDetails.filter((_, i) => i !== index));
  };

  const getAvailableDegrees = (currentIndex: number) => {
    const usedDegrees = educationDetails
      .filter((_, index) => index !== currentIndex && educationDetails[index].degree !== '')
      .map(edu => edu.degree);

    return DEGREE_OPTIONS.filter(degree => degree === 'Select Degree' || !usedDegrees.includes(degree));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validEducation = educationDetails
      .filter(edu => 
        edu.degree && edu.degree !== 'Select Degree' &&
        edu.institute &&
        (edu.degree === '10th' || edu.branch) &&
        edu.yop && edu.yop !== 0
      )
      .map(edu => ({
        degree: edu.degree,
        institute: edu.institute,
        branch: edu.degree === '10th' ? '' : edu.branch,
        cgpa: edu.cgpa,
        yop: edu.yop
      }));

    const requestData = {
      student_id: studentId,
      college: profileDetails.college,
      branch: profileDetails.branch,
      gender: profileDetails.gender,
      address: profileDetails.address,
      phone: profileDetails.phone,
      college_batch: profileDetails.college_batch,
      linkedin: socialMedia.linkedin,
      github: socialMedia.github,
      leetcode: socialMedia.leetcode,
      hackerrank: socialMedia.hackerrank,
      resume: socialMedia.resume,
      video: socialMedia.video,
      education_details: validEducation
    };
    const url=`${API_BASE_URL}/student/profile/`
    try {
      const response = await apiClient.put(
        url,
        requestData
      );

      if (response.status === 200) {
        alert('Profile updated successfully!');
        navigate('/Profile', { replace: true });
      }
    } 
    catch (innerError: any) {
      alert('Failed to update profile. Please try again.');
      console.error("Error updating profile:", innerError);
    }
  };

  if (loading) {
    return <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>;
  }

  return (
    <div className="container-fuild mt-3" style={{ height: 'calc(100vh - 80px)', overflow: 'auto' }}>
      <form onSubmit={handleSubmit}>
        <div className="card mb-4">
          <div className="card-header">
            <h4>Profile Details</h4>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6 mb-3">
                <label>College</label>
                <input
                  type="text"
                  className="form-control"
                  name="college"
                  value={profileDetails.college}
                  readOnly
                  style={{ cursor: 'not-allowed' }}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label>Branch</label>
                <input
                  type="text"
                  className="form-control"
                  name="branch"
                  value={profileDetails.branch}
                  readOnly
                  style={{ cursor: 'not-allowed' }}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label>Gender</label>
                <input
                  type="text"
                  className="form-control"
                  name="gender"
                  value={profileDetails.gender}
                  readOnly
                  style={{ cursor: 'not-allowed' }}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label>Address</label>
                <input
                  type="text"
                  className="form-control"
                  name="address"
                  value={profileDetails.address}
                  onChange={handleProfileChange}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label>Email</label>
                <input
                  type="email"
                  className="form-control"
                  name="email"
                  value={profileDetails.email}
                  readOnly
                  style={{ cursor: 'not-allowed' }}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label>Phone</label>
                <input
                  type="tel"
                  className="form-control"
                  name="phone"
                  value={profileDetails.phone}
                  onChange={handleProfileChange}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label>College Batch</label>
                <input
                  type="text"
                  className="form-control"
                  name="college_batch"
                  value={profileDetails.college_batch || ''}
                  onChange={handleProfileChange}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-4">
          <div className="card-header">
            <h4>Social Media Platforms</h4>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-4 mb-3">
                <label className="d-flex align-items-center">
                  <FaLinkedin className="me-2" /> LinkedIn Profile
                </label>
                <input
                  className="form-control"
                  name="linkedin"
                  value={socialMedia.linkedin}
                  onChange={handleSocialMediaChange}
                  placeholder="https://www.linkedin.com/in/username"
                />
              </div>
              <div className="col-md-4 mb-3">
                <label className="d-flex align-items-center">
                  <FaGithub className="me-2" /> GitHub Profile
                </label>
                <input
                  className="form-control"
                  name="github"
                  value={socialMedia.github}
                  onChange={handleSocialMediaChange}
                  placeholder="https://github.com/username"
                />
              </div>
              <div className="col-md-4 mb-3">
                <label className="d-flex align-items-center">
                  <FaCode className="me-2" /> LeetCode Profile
                </label>
                <input
                  className="form-control"
                  name="leetcode"
                  value={socialMedia.leetcode}
                  onChange={handleSocialMediaChange}
                  placeholder="https://leetcode.com/username"
                />
              </div>
              <div className="col-md-4 mb-3">
                <label className="d-flex align-items-center">
                  <FaHackerrank className="me-2" /> HackerRank Profile
                </label>
                <input
                  className="form-control"
                  name="hackerrank"
                  value={socialMedia.hackerrank}
                  onChange={handleSocialMediaChange}
                  placeholder="https://www.hackerrank.com/username"
                />
              </div>
              <div className="col-md-4 mb-3">
                <label className="d-flex align-items-center">
                  <FaFile className="me-2" /> Resume Link
                </label>
                <input
                  className="form-control"
                  name="resume"
                  value={socialMedia.resume}
                  onChange={handleSocialMediaChange}
                  placeholder="https://drive.google.com/your-resume"
                />
              </div>
              <div className="col-md-4 mb-3">
                <label className="d-flex align-items-center">
                  <FaVideo className="me-2" /> Video Profile
                </label>
                <input
                  type="url"
                  className="form-control"
                  name="video"
                  value={socialMedia.video}
                  onChange={handleSocialMediaChange}
                  placeholder="https://youtu.be/your-video"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h4>Education Details</h4>
            <button
              type="button"
              className="btn btn-success btn-sm"
              onClick={addEducationRow}
            >
              <FaPlus /> <span className="ms-1">Add Education</span>
            </button>
          </div>
          <div className="card-body">
            {educationDetails.map((edu, index) => (
              <div key={index} className="row mb-3 align-items-center">
                <div className="col-md-2">
                  <label>Course / Degree</label>
                  <select
                    className="form-control"
                    name="degree"
                    value={edu.degree}
                    onChange={(e) => handleEducationChange(index, e)}
                  >
                    {getAvailableDegrees(index).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <label>School / College</label>
                  {edu.degree === 'BE' ? (
                    <select
                      className="form-control"
                      name="institute"
                      value={edu.institute}
                      onChange={(e) => handleInstituteChange(index, e)}
                    >
                      <option value="">Select College</option>
                      {Object.keys(colleges).map((college) => (
                        <option key={college} value={college}>
                          {college}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="form-control"
                      name="institute"
                      value={edu.institute}
                      onChange={(e) => handleEducationChange(index, e)}
                      placeholder={
                        edu.degree === "12th" ? "Global PU College" : "Global High School"
                      }
                    />
                  )}
                </div>

                <div className="col-md-2">
                  <label>Branch</label>
                  {edu.degree === 'BE' && edu.institute ? (
                    <select
                      className="form-control"
                      name="branch"
                      value={edu.branch}
                      onChange={(e) => handleEducationChange(index, e)}
                    >
                      <option value="">Select Branch</option>
                      {branches.map((branch) => (
                        <option key={branch} value={branch}>
                          {branch}
                        </option>
                      ))}
                    </select>
                  ) : edu.degree === '12th' ? (
                    <select
                      className="form-control"
                      name="branch"
                      value={edu.branch}
                      onChange={(e) => handleEducationChange(index, e)}
                    >
                      {BRANCH_OPTIONS_12TH.map((branch) => (
                        <option key={branch} value={branch}>
                          {branch}
                        </option>
                      ))}
                    </select>
                  ) : edu.degree === '10th' ? (
                    <input
                      type="text"
                      className="form-control"
                      name="branch"
                      value="Not applicable"
                      readOnly
                      disabled={true}
                      style={{ cursor: 'not-allowed' }}
                    />
                  ) : (
                    <select
                      className="form-control"
                      name="branch"
                      value={edu.branch || ''}
                      onChange={(e) => handleEducationChange(index, e)}
                      disabled={!edu.degree}
                    >
                      <option value="">Select Branch</option>
                    </select>
                  )}
                </div>

                <div className="col-md-2">
                  <label>Percentage / CGPA</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    name="cgpa"
                    value={edu.cgpa || ''}
                    onChange={(e) => handleEducationChange(index, e)}
                    placeholder="Enter CGPA"
                  />
                </div>

                <div className="col-md-2">
                  <label>Year of Passing</label>
                  <select
                    className="form-control"
                    name="yop"
                    value={edu.yop || ''}
                    onChange={(e) => handleEducationChange(index, e)}
                  >
                    {YEAR_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-1 d-flex align-items-end">
                  {educationDetails.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm mt-4"
                      onClick={() => removeEducationRow(index)}
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 d-flex justify-content-end">
          <button
            type="button"
            className="btn btn-secondary me-2"
            onClick={() => navigate('/Profile', { replace: true })}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-info text-white"
          >
            Update Profile
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProfile;