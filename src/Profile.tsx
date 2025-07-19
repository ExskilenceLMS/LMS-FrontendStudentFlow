import React, { useState, useEffect } from "react";
import { FaLinkedin, FaCode, FaHackerrank } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { getApiClient } from "./utils/apiAuth";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import CryptoJS from "crypto-js";
import { secretKey } from "./constants";
import UserPic from "./Components/images/UserPic.jpg";
interface EducationDetails {
  degree: string;
  institute: string;
  branch: string;
  cgpa: number;
  yop: number;
}

interface ProfileDetails {
  college: string;
  branch: string;
  gender: string;
  address: string;
  email: string;
  phone: string;
}

interface SocialMedia {
  linkedin: string;
  leetcode: string;
  hackerrank: string;
  resume: string;
  video: string;
}

interface ProfileType {
  student_id: string;
  student_name: string;
  course_name: string;
  batch_name: string | null;
  subjects: string[];
  profile_details: ProfileDetails;
  social_media: SocialMedia;
  education_details: EducationDetails[];
}

const Profile: React.FC = () => {
  const [data, setData] = useState<any>({});
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const encryptedStudentId = sessionStorage.getItem('StudentId');
  const decryptedStudentId = CryptoJS.AES.decrypt(encryptedStudentId!, secretKey).toString(CryptoJS.enc.Utf8);
  const studentId = decryptedStudentId;
  const actualStudentId= CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualEmail= CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualName= CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);
 
 
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const url=`${process.env.REACT_APP_BACKEND_URL}api/student/profile/${studentId}`
      try {
        const response = await getApiClient().get<ProfileType>(
          url
        );
        setProfile(response.data);
      }catch (innerError: any) {console.error("Error fetching profile data:", innerError);
            }finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const educationOrder = ["BE", "12th", "10th"];

const orderedEducation = educationOrder.map((degreeTitle) => {
  const match = profile?.education_details?.find(
    (edu) => edu.degree === degreeTitle
  );
  return {
    degree: degreeTitle,
    institute: match?.institute || "--",
    branch: match?.branch || "--",
    cgpa: match?.cgpa || "--",
    yop: match?.yop || "--",
  };
});


  if (loading) {
    return (
      <div style={{ backgroundColor: "#F2EEEE", height: "calc(100vh - 60px)" }}>
        <div
          className="p-0 my-0 me-2"
          style={{ backgroundColor: "#F2EEEE" }}
        >
          <div
            className="container-fluid p-0 pt-2"
            style={{
              maxWidth: "100%",
              overflowX: "hidden",
              overflowY: "auto",
              backgroundColor: "#f2eeee",
            }}
          >
            <div className="row g-2">
              <div className="col-12 col-md-3 col-sm-12">
                <div
                  className="bg-white border rounded-2 py-2 ps-2"
                  style={{
                    height: "calc(100vh - 60px)",
                    overflowY: "auto",
                  }}
                >
                  <div className="m-3">
                    <div className="border-black border-bottom w-75 mx-auto pb-3">
                      <div className="d-flex justify-content-center align-items-center position-relative">
                        <Skeleton circle={true} height={150} width={150} />
                      </div>
                      <p className="text-center m-0 mt-2 fs-5 fw-bold">
                        <Skeleton width={150} />
                      </p>
                      <p className="text-center m-0 fs-5 fw-bold">
                        <Skeleton width={120} />
                      </p>
                    </div>
                  </div>

                  <div className="m-3 border-black border-bottom">
                  <table className="table table-borderless border-collapse">
                  <tbody>
                        <tr>
                          <th style={{ fontSize: "14px"}}>Course</th>
                          <td ><Skeleton /></td>
                        </tr>
                        <tr>
                          <th style={{ fontSize: "14px"}}>Batch</th>
                          <td ><Skeleton /></td>
                        </tr>
                        <tr>
                          <th style={{ fontSize: "14px"}}>Subjects</th>
                          <td> <Skeleton width={100} /> </td>
                        </tr>
                    </tbody>
                    </table>
                  </div>

                  <div className="mt-3">
                    <p
                      className="fw-bold ps-4 mb-3"
                      style={{ fontSize: "18px" }}
                    >
                      Social Media Platforms
                    </p>
                    <div className="left-4 ms-5">
                      <p className="m-3 mb-3 fs-6 row align-items-center">
                        <span className="col-auto">
                          <Skeleton circle={true} height={20} width={20} />
                        </span>
                        <strong className="col-auto">
                          <Skeleton width={80} />
                        </strong>
                      </p>
                      <p className="m-3 mb-3 fs-6 row align-items-center">
                        <span className="col-auto">
                          <Skeleton circle={true} height={20} width={20} />
                        </span>
                        <strong className="col-auto">
                          <Skeleton width={80} />
                        </strong>
                      </p>
                      <p className="m-3 mb-3 fs-6 row align-items-center">
                        <span className="col-auto">
                          <Skeleton circle={true} height={20} width={20} />
                        </span>
                        <strong className="col-auto">
                          <Skeleton width={80} />
                        </strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-9 col-sm-12">
                <div
                  className="bg-white border rounded-2 py-2 ps-2"
                  style={{
                    height: `calc(100vh - 60px)`,
                    overflowY: "auto",
                  }}
                >
                  <div className="border border-dark rounded-2 mx-4 mt-3">
                    <p className="fs-4 fw-bold ps-4 pt-3">Profile details</p>
                    <div className="row mx-5">
                      <div className="col-6 ps-5">
                        <span className="">
                          <span className="fs-5 fw-bold">College</span>
                          <br />
                          <Skeleton />
                          <br />
                          <br />
                        </span>
                        <span className="">
                          <span className="fs-5 fw-bold">Gender</span>
                          <br />
                          <Skeleton />
                          <br />
                          <br />
                        </span>
                        <span className="">
                          <span className="fs-5 fw-bold">Email Address</span>
                          <br />
                          <Skeleton />
                          <br />
                          <br />
                        </span>
                      </div>
                      <div className="col-6 ps-5">
                        <span className="">
                          <span className="fs-5 fw-bold">Branch</span>
                          <br />
                          <Skeleton />
                          <br />
                          <br />
                        </span>
                        <span className="">
                          <span className="fs-5 fw-bold">Address</span>
                          <br />
                          <Skeleton />
                          <br />
                          <br />
                        </span>
                        <span className="">
                          <span className="fs-5 fw-bold">Phone Number</span>
                          <br />
                          <Skeleton />
                          <br />
                          <br />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="border border-dark rounded-2 mx-4 mt-3">
                    <p className="fs-4 fw-bold ps-3 pt-3">
                      Education details
                    </p>
                    <div className="mx-5">
                      <table
                        className="table table-borderless"
                        style={{ width: "100%", borderCollapse: "collapse" }}
                      >
                        <thead>
                          <tr className="border-black border-bottom mx-auto">
                            <th className="p-3 text-center fs-5">Degree</th>
                            <th className="p-3 text-center fs-5">Institution</th>
                            <th className="p-3 text-center fs-5">Branch</th>
                            <th className="p-3 text-center fs-5">CGPA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: 3 }).map((_, index) => (
                            <tr key={index}>
                              <td className="p-3 text-center ">
                                <Skeleton />
                              </td>
                              <td className="p-3 text-center">
                                <Skeleton />
                              </td>
                              <td className="p-3 text-center">
                                <Skeleton />
                              </td>
                              <td className="p-3 text-center">
                                <Skeleton />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#F2EEEE", height: "calc(100vh - 60px)", overflowY: "hidden"  }}>
      <div
        className="p-0 my-0 me-2"
        style={{ backgroundColor: "#F2EEEE" }}
      >
        <div
          className="container-fluid p-0 pt-2"
          style={{
            maxWidth: "100%",
            overflowX: "hidden",
            overflowY: "auto",
            backgroundColor: "#f2eeee",
          }}
        >
          <div className="row g-2">
            <div className="col-12 col-md-3 col-sm-12">
              <div
                className="bg-white border rounded-2 py-2 ps-2"
                style={{
                  height: `calc(100vh - 60px)`,
                  overflowY: "auto",
                }}
              >
                <div className="m-3">
                  <div className="border-black border-bottom w-75 mx-auto pb-3">
                    <div className="d-flex justify-content-end">
                    <button className="btn btn-info btn-sm" style={{ fontSize:'10px'}} onClick={() => navigate("/EditProfile",  { state: { userData: profile } })}>Edit Profile</button>
                    </div>
                    {profile?.profile_details && (
                      <div className="d-flex justify-content-center align-items-center position-relative">
                        <img
                          className="border rounded-pill"
                          src={UserPic}
                          alt="Profile"
                          style={{
                            width: "150px",
                            height: "150px",
                            objectFit: "cover",
                          }}
                        />
                      </div>
                    )}
                    {profile?.student_id && (
                      <p className="text-center m-0 mt-2 fs-5 fw-bold">
                        {profile?.student_id}
                      </p>
                    )}
                    {profile?.student_name && (
                      <p className="text-center m-0 fs-5 fw-bold">
                        {profile?.student_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="m-3 border-black border-bottom">
                <table className="table table-borderless border-collapse">
                    <tbody>
                      {profile?.course_name && (
                        <tr>
                          <th style={{ fontSize: "14px"}}>Course</th>
                          <td style={{ fontSize: "12px"}}>{profile.course_name}</td>
                        </tr>
                      )}
                      {profile?.batch_name && (
                        <tr>
                          <th style={{ fontSize: "14px"}}>Batch</th>
                          <td style={{ fontSize: "12px"}}>{profile.batch_name}</td>
                        </tr>
                      )}
                      {profile?.subjects && (
                        <tr>
                          <th style={{ fontSize: "14px"}}>Subjects</th>
                          <td style={{ fontSize: "12px"}}>{profile.subjects.join(", ")}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  </div>

                <div className="mt-3">
                  <p
                    className="fw-bold ps-4 mb-3"
                    style={{ fontSize: "18px" }}
                  >
                    Social Media Platforms
                  </p>
                  <div className="left-4 ms-5">
                    {profile?.social_media?.linkedin && (
                      <p className="m-3 mb-3 fs-6 row align-items-center">
                        <span className="col-auto">
                          <a
                            href={profile?.social_media?.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FaLinkedin size={20} className="text-dark me-2" />
                          </a>
                        </span>
                        <a href={profile?.social_media?.linkedin} className="col-auto">LinkedIn</a>
                      </p>
                    )}
                    {profile?.social_media?.leetcode && (
                      <p className="m-3 mb-3 fs-6 row align-items-center">
                        <span className="col-auto">
                          <a
                            href={profile?.social_media?.leetcode}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FaCode size={20} className="text-dark me-2" />
                          </a>
                        </span>
                        <a href={profile?.social_media?.leetcode} className="col-auto">LeetCode</a>
                      </p>
                    )}
                    {profile?.social_media?.hackerrank && (
                      <p className="m-3 mb-3 fs-6 row align-items-center">
                        <span className="col-auto">
                          <a
                            href={profile?.social_media?.hackerrank}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FaHackerrank size={20} className="text-dark me-2" />
                          </a>
                        </span>
                        <a href={profile?.social_media?.hackerrank} className="col-auto">HackerRank</a>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-9 col-sm-12">
              <div
                className="bg-white border rounded-2 py-2 ps-2"
                style={{ height: `calc(100vh - 60px)`, overflowY: "auto" }}
              >
                <div className="border border-dark rounded-2 mx-4 mt-3">
                  <p className="fs-4 fw-bold ps-4 pt-3">Profile details</p>
                  <div className="row mx-5">
                    <div className="col-6 ps-5">
                      {profile?.profile_details?.college && (
                        <span className="">
                          <span className="fs-5 fw-bold">College</span>
                          <br />
                          <span>{profile?.profile_details?.college}</span>
                          <br />
                          <br />
                        </span>
                      )}
                      {profile?.profile_details?.gender && (
                        <span className="">
                          <span className="fs-5 fw-bold">Gender</span>
                          <br />
                          <span>{profile?.profile_details?.gender}</span>
                          <br />
                          <br />
                        </span>
                      )}
                      {profile?.profile_details?.email && (
                        <span className="">
                          <span className="fs-5 fw-bold">Email Address</span>
                          <br />
                          <span>{profile?.profile_details?.email}</span>
                          <br />
                          <br />
                        </span>
                      )}
                    </div>
                    <div className="col-6 ps-5">
                      {profile?.profile_details?.branch && (
                        <span className="">
                          <span className="fs-5 fw-bold">Branch</span>
                          <br />
                          <span>{profile?.profile_details?.branch}</span>
                          <br />
                          <br />
                        </span>
                      )}
                      {profile?.profile_details?.address && (
                        <span className="">
                          <span className="fs-5 fw-bold">Address</span>
                          <br />
                          <span>{profile?.profile_details?.address}</span>
                          <br />
                          <br />
                        </span>
                      )}
                      {profile?.profile_details?.phone && (
                        <span className="">
                          <span className="fs-5 fw-bold">Phone Number</span>
                          <br />
                          <span>{profile?.profile_details?.phone}</span>
                          <br />
                          <br />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="border border-dark rounded-2 mx-4 mt-3">
                  <p className="fs-4 fw-bold ps-3 pt-3">Education details</p>
                  <div className="mx-5">
                    <table
                      className="table table-borderless"
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr className="border-black border-bottom mx-auto">
                          <th className="p-3 text-center fs-5">Course / Degree</th>
                          <th className="p-3 text-center fs-5">School / College</th>
                          <th className="p-3 text-center fs-5">Branch</th>
                          <th className="p-3 text-center fs-5">Percentage / CGPA</th>
                          <th className="p-3 text-center fs-5">Year of Passing</th>
                        </tr>
                      </thead>
                      <tbody>
                      {orderedEducation.map((edu, index) => (
                        <tr key={index}>
                          <td className="p-3 text-center">{edu.degree}</td>
                          <td className="p-3 text-center">{edu.institute}</td>
                          <td className="p-3 text-center">{edu.branch}</td>
                          <td className="p-3 text-center">{edu.cgpa}</td>
                          <td className="p-3 text-center">{edu.yop}</td>
                        </tr>
                      ))}
                    </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
