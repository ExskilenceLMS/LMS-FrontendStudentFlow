import React, { useState, useEffect } from "react";
import axios from "axios";
import { secretKey } from "../constants";
interface FAQData {
  FAQ: {
    [category: string]: { question: string; answer: string }[];
  };
}

const FAQ: React.FC = () => {
  const [data, setData] = useState<FAQData | null>(null);
  const actualStudentId= CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualEmail= CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualName= CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);

  useEffect(() => {
    const fetchData = async () => {
      const url= `${process.env.REACT_APP_BACKEND_URL}api/student/faq/`
      try{
        const response = await fetch(
       url
      );
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onload = () => {
        try {
          const jsonData = JSON.parse(reader.result as string);
          setData(jsonData);
        } catch (error) {
          console.error("Error parsing JSON:", error);
        }
      };

      reader.readAsText(blob);
      }
      catch (innerError: any) {
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
                await axios.post(
                `${process.env.REACT_APP_BACKEND_URL}api/errorlog/`,
                body
                );
            } catch (loggingError) {
                console.error("Error logging the FAQ:", loggingError);
            }
 
            console.error("Error fetching FAQ data:", innerError);
            }

    };

    fetchData();
  }, []);

  return (
    <>
      <div style={{ backgroundColor: "#F2EEEE", minHeight: "100vh" }}>
        <div
          className="p-0 my-0 me-2"
          style={{ backgroundColor: "#F2EEEE"}}
        >
          <div className="container-fluid bg-white mt-4 border rounded-1">
            <div className="ps-2 pt-2">
              {data?.FAQ ? (
                Object.entries(data.FAQ).map(([category, questions]) => (
                  <div key={category}>
                    <span className="fs-6 mb-5">{category}</span>
                    <ul style={{ listStyle: "decimal" }}>
                      {questions.map((item, index) => (
                        <li key={index}>
                          <p className="m-0">{item.question}</p>
                          <p className="m-0">{item.answer}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <p>Loading...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FAQ;
