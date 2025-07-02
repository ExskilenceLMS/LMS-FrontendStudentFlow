import React, { useEffect } from 'react';
import apiClient from "../utils/apiAuth";
import CryptoJS from "crypto-js";
import { secretKey } from "../constants";

interface ErrorLogProps {
  url: string;
  body?: any;
  response?: any;
}

const ErrorLogMethod: React.FC<ErrorLogProps> = ({ url, body, response }) => {
  const actualStudentId= CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualEmail= CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualName= CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);
 
 
  useEffect(() => {
    const logError = async () => {
    const url =`${process.env.REACT_APP_BACKEND_URL}api/error/`
    try {
      const encryptedStudentId = sessionStorage.getItem('StudentId');
      const decryptedStudentId = CryptoJS.AES.decrypt(encryptedStudentId!, secretKey).toString(CryptoJS.enc.Utf8);
      const studentId = decryptedStudentId;

      const encryptedEmail = sessionStorage.getItem('Email');
      const decryptedEmail = CryptoJS.AES.decrypt(encryptedEmail!, secretKey).toString(CryptoJS.enc.Utf8);
      const email = decryptedEmail;

      const encryptedName = sessionStorage.getItem('Name');
      const decryptedName = CryptoJS.AES.decrypt(encryptedName!, secretKey).toString(CryptoJS.enc.Utf8);
      const name = decryptedName;

      apiClient.post(url, {
        student_id: studentId,
        email: email,
        name: name,
        url: url,
        body: body,
        response: response
      }, {
        headers: {
          "Content-Type": "application/json",
        }
      });
    } catch (innerError: any) {
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
                console.error("Error logging the error log method error:", loggingError);
            }
 
            console.error("Error fetching error log method data:", innerError);
            }
             };

  logError();
  }, [url, body, response]);

  return null;
};


export default ErrorLogMethod;
