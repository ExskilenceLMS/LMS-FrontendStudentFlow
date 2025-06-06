import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Tooltip,
  TooltipProps
} from "recharts";
import Skeleton from "react-loading-skeleton";
import axios from "axios";
import './Activity.css';
import { secretKey } from "../constants";
import CryptoJS from "crypto-js";

interface DataItem {
  day_name: string;
  hours: number;
  isUpcoming?: boolean;
  isCurrent?: boolean;
}

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const entry = payload[0]?.payload;
    if (entry.isUpcoming) {
      return null;
    }
    return (
      <div className="custom-tooltip" style={{
        backgroundColor: 'transparent',
        border: 'none',
        padding: '2px',
        fontSize: '14px',
        color: '#000',
        cursor: "progress",
      }}>
        <p>{`${Number(payload[0]?.value).toFixed(1)} hr${Number(payload[0]?.value) > 1 ? "s" : ""}`}</p>
      </div>
    );
  }
  return null;
};

const Activity: React.FC = () => {
  const [data, setData] = useState<DataItem[] | null>(null);
  const [minThreshold, setMinThreshold] = useState(0);
  const [weeklyLimit, setWeeklyLimit] = useState(0);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [, setMaxHours] = useState(100);
  const encryptedStudentId = sessionStorage.getItem('StudentId');
  const decryptedStudentId = CryptoJS.AES.decrypt(encryptedStudentId!, secretKey).toString(CryptoJS.enc.Utf8);
  const studentId = decryptedStudentId;
  const actualStudentId= CryptoJS.AES.decrypt(sessionStorage.getItem('StudentId')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualEmail= CryptoJS.AES.decrypt(sessionStorage.getItem('Email')!, secretKey).toString(CryptoJS.enc.Utf8);
  const actualName= CryptoJS.AES.decrypt(sessionStorage.getItem('Name')!, secretKey).toString(CryptoJS.enc.Utf8);
  console.log('try',actualEmail,actualName,actualStudentId)

  useEffect(() => {
    const fetchData = async () => {
      const url=`${process.env.REACT_APP_BACKEND_URL}api/studentdashboard/hourspent/${studentId}/n/`
      try {
        const response = await axios.get(url);
        setData(response.data.hours);
        setWeeklyLimit(response.data.weekly_limit);
        setMinThreshold(response.data.daily_limit);
        setSelectedWeek(response.data.weekly_limit);
        const maxHourValue = Math.max(...response.data.hours.map((hour: { hours: number }) => hour.hours));
        setMaxHours(maxHourValue);
      } catch (innerError: any) {
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
                console.error("Error logging the Activity error:", loggingError);
            }
 
             console.error("Error fetching initial data:", innerError);
          
            }
    };

    fetchData();
  }, [studentId]);

  useEffect(() => {
    if (selectedWeek > 0) {
      fetchHoursSpentForWeek(selectedWeek);
    }
  }, [selectedWeek]);

  const fetchHoursSpentForWeek = async (weekNumber: number) => {
    const url=`${process.env.REACT_APP_BACKEND_URL}api/studentdashboard/hourspent/${studentId}/${weekNumber}/`
    try {
      const response = await axios.get(url);
      setData(response.data.hours);
      setMinThreshold(response.data.daily_limit);
      const maxHourValue = Math.max(...response.data.hours.map((hour: { hours: number }) => hour.hours));
      setMaxHours(maxHourValue);
    } catch (innerError: any) {
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
                console.error("Error logging the Activity error:", loggingError);
            }
 
           console.error("Error fetching data for week", weekNumber, ":", innerError);
            }
  };

  const total = data ? (data.reduce((acc, curr) => acc + curr.hours, 0)).toFixed(1) : 0;

  const getHoursOrThreshold = (entry: DataItem): number => {
    if (entry.isUpcoming) {
      return minThreshold;
    }
    return entry.hours === 0 ? 0 : entry.hours;
  };

  const getBarColor = (entry: DataItem): string => {
    if (entry.isUpcoming) return "#E5E5E5";
    if (entry.isCurrent) return "#8B00FF";
    if (entry.hours === 0) return "#E5E5E5"; 
    return "#E7C6FF";
  };

  return (
    <div className="p-0" style={{ fontFamily: "Arial, sans-serif" }}>
      <div className="bg-white rounded-2 p-2">
        <div className="p-2">
          <span style={{ fontWeight: "bolder", fontSize: "20px", marginBottom: "10px" }}>
            Activity
          </span>
          <select
            className="float-end p-1"
            style={{ cursor: "pointer", fontSize: "10px" }}
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
          >
            {weeklyLimit > 0 ? (
              Array.from({ length: weeklyLimit }, (_, i) => i + 1).map((week) => (
                <option key={week} value={week}>
                  Week {week}
                </option>
              ))
            ) : (
              <option value={0}>No weeks available</option>
            )}
          </select>
        </div>
        <span className="ms-3">
          {data ? `${total} hrs` : <Skeleton width={50} />}
        </span>

        <ResponsiveContainer width="100%" height={178}>
          {data ? (
            <BarChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <XAxis dataKey="day_name" tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: "white" }} />
              <Tooltip content={<CustomTooltip />} cursor={false}  />
              <Bar dataKey={(entry) => getHoursOrThreshold(entry)} barSize={45} radius={[8, 8, 8, 8]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${entry.hours}`} fill={getBarColor(entry)} />
                ))}
              </Bar>
              <ReferenceLine
                y={minThreshold}
                stroke="black"
                strokeDasharray="3 3"
                label={({ viewBox }) => (
                  <g transform={`translate(${viewBox.width - 320}, ${viewBox.y - 10})`}>
                    <rect width={60} height={20} fill="black" rx={5} />
                    <text x={30} y={12} fill="white" textAnchor="middle" dominantBaseline="middle">
                      {minThreshold} hours
                    </text>
                  </g>
                )}
              />
            </BarChart>
          ) : (
            <SkeletonBarChart />
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const SkeletonBarChart: React.FC = () => {
  return (
    <div style={{ padding: '10px', background: '#f9f9f9', height: '100%' }}>
      <div className="px-1" style={{ display: 'flex', gap: '30px', width:"100%",  height:"100%", paddingTop: "80px" }}>
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} height={90} width={45} />
        ))}
      </div>
    </div>
  );
};

export default Activity;