import React, { useState, useEffect } from "react";
import { getApiClient } from "../utils/apiAuth";
import { secretKey } from "../constants";
import CryptoJS from "crypto-js";

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
        const response = await getApiClient().get(url);
        setData(response.data);
      } catch (error) {
        console.error("Error fetching FAQ data:", error);
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
