import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";
import { secretKey } from "../constants";
import CryptoJS from "crypto-js";
interface SpecialDates {
  [key: string]: { title: string; subject: string }[];
}

const Calendar: React.FC = () => {
  const [, setData] = useState<any>(null);
  const [year, setYear] = useState<number>(2025);
  const [month, setMonth] = useState<number>(0);
  const [currentDate, setCurrentDate] = useState<Date>(new Date(year, month));
  const [specialDates, setSpecialDates] = useState<SpecialDates>({});
  const encryptedStudentId = sessionStorage.getItem('StudentId');
  const decryptedStudentId = CryptoJS.AES.decrypt(encryptedStudentId!, secretKey).toString(CryptoJS.enc.Utf8);
  const studentId = decryptedStudentId;
  const actualStudentId= CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualEmail= CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualName= CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);
  
  useEffect(() => {
    const fetchData = async () => {
      const url=`${process.env.REACT_APP_BACKEND_URL}api/studentdashboard/event/calender/${studentId}/`
      try {
        const response = await axios.get(url);
        setData(response.data);
        setYear(parseInt(response.data.year));
        setMonth(parseInt(response.data.month)); 
        setCurrentDate(new Date(response.data.year, response.data.month)); 

        const transformedSpecialDates: SpecialDates = {};
        response.data.calendar.forEach((event: { datetime: string; title: string; subject: string }) => {
          if (!transformedSpecialDates[event.datetime]) {
            transformedSpecialDates[event.datetime] = [];
          }
          transformedSpecialDates[event.datetime].push({ title: event.title, subject: event.subject });
        });

        setSpecialDates(transformedSpecialDates);
      }  
      catch (innerError: any) {
            const errorData = innerError.response?.data || {
                message: innerError.message,
                stack: innerError.stack
            };
 
            const body = {
                student_id: actualStudentId,
                Email: actualEmail,
                Name: actualName
                
                ,
                URL_and_Body: `${url}\n + ""`,
                error: errorData.error,
            };
 
            try {
                await axios.post(
                `${process.env.REACT_APP_BACKEND_URL}api/errorlog/`,
                body
                );
            } catch (loggingError) {
                console.error("Error logging the Calendar error:", loggingError);
            }
 
            console.error("Error fetching Calendar data:", innerError);
            }
    };
    fetchData();
  }, [studentId]);

  const daysOfWeek: string[] = ["S", "M", "T", "W", "T", "F", "S"];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    return { daysInMonth, startingDay };
  };

  const previousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDay } = getDaysInMonth(currentDate);
    const days: React.ReactElement[] = [];
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    for (let i = 0; i < startingDay; i++) {
      const prevMonthDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        -i
      );
      days.unshift(
        <div
          key={`prev-${i}`}
          className="text-muted text-center p-0 py-2"
          style={{ fontSize: "12px" }}
        >
          {prevMonthDate.getDate()}
        </div>
      );
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentDate.getFullYear()}-${String(
        currentDate.getMonth() + 1
      ).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      const specialDay = specialDates[dateStr];
      let backgroundColor = "";
      let tooltipText = "";

      if (dateStr === todayStr) {
        backgroundColor = "#D2E3FC";
      } else {
        if (specialDay) {
          specialDay.forEach((event) => {
            switch (event.title) {
              case "Weekly Test":
                backgroundColor = "#F8D3C9";
                break;
              case "workshop":
                backgroundColor = "#ADFEB4";
                break;
              case "Onsite Workshop":
                backgroundColor = "#ADFEB4";
                break;
              case "Final Test":
                backgroundColor = "#FEADFD";
                break;
              default:
                backgroundColor = "";
                break;
            }
            tooltipText += `${event.title} - ${event.subject}\n`;
          });
        }
      }

      days.push(
        <div
          key={i}
          className="text-center p-0 py-2 position-relative"
          style={{ fontSize: "12px"}}
          title={tooltipText.trim()}
        >
          {backgroundColor && (
            <div
              className="position-absolute rounded-circle"
              style={{
                backgroundColor,
                width: "1.5rem",
                height: "1.5rem",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                cursor: "help"
              }}
            ></div>
          )}
          <span
            className="position-relative"
            style={{ zIndex: 1, fontSize: "12px", cursor: "help" }}
          >
            {i}
          </span>
        </div>
      );
    }

    const totalCells = 42;
    const remainingCells = totalCells - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push(
        <div
          key={`next-${i}`}
          className="text-muted text-center p-0 py-2"
          style={{ fontSize: "12px" }}
        >
          {i}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="card mx-auto border-0 p-3 m-0" style={{ height: "265px" }}>
      <div className="card-header p-0 m-0 bg-white d-flex justify-content-between align-items-center border-0">
        <h5
          className="card-title p-0 m-0 mb-0 ps-1 fw-bold"
          style={{ margin: 0, fontSize: "18px" }}
        >
          {currentDate.toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </h5>
        <div className="d-flex gap-2" style={{ fontSize: '10px'}}>
          <button
            className="btn btn-sm p-0"
            style={{ background: "none", border: "none" }}
            onClick={previousMonth}
          >
            <ChevronLeft className="icon" size={15} />
          </button>
          <button
            className="btn btn-sm p-0"
            style={{ background: "none", border: "none" }}
            onClick={nextMonth}
          >
            <ChevronRight className="icon" size={15}/>
          </button>
        </div>
      </div>
      <div className="card-body p-0 m-0">
        <div
          className="d-grid"
          style={{ gridTemplateColumns: "repeat(7, 1fr)" }}
        >
          {daysOfWeek.map((day, index) => (
            <div
              key={index}
              className="text-center font-weight-bold p-0 py-1"
              style={{ fontSize: "12px" }}
            >
              {day}
            </div>
          ))}
          {renderCalendar()}
        </div>
      </div>
    </div>
  );
};

export default Calendar;
