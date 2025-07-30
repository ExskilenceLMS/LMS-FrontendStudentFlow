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
import apiClient from "../utils/apiAuth";
import './Activity.css';
import { secretKey } from "../constants";
import CryptoJS from "crypto-js";
import { useAPISWR } from "../utils/swrConfig";
import { Card } from "react-bootstrap";
import { useApiLoading } from "../Dashboard";

interface DataItem {
  day_name: string;
  hours: number;
  isUpcoming?: boolean;
  isCurrent?: boolean;
}

interface ActivityResponse {
  hours: DataItem[];
  weekly_limit: number;
  daily_limit: number;
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
  const { studentId, isCoursesApiLoaded } = useApiLoading();

  // Use SWR for hourspent API with 5-minute cache - only call after courses API is loaded
  const { data: activityData, error } = useAPISWR<ActivityResponse>(
    isCoursesApiLoaded ? `${process.env.REACT_APP_BACKEND_URL}api/studentdashboard/hourspent/${studentId}/n/` : null
  );

  // Use SWR for weekly hourspent API with 5-minute cache - only call after courses API is loaded
  const { data: weeklyData, error: weeklyError } = useAPISWR<ActivityResponse>(
    isCoursesApiLoaded && selectedWeek > 0 ? `${process.env.REACT_APP_BACKEND_URL}api/studentdashboard/hourspent/${studentId}/${selectedWeek}/` : null
  );

  useEffect(() => {
    if (activityData) {
      setData(activityData.hours);
      setWeeklyLimit(activityData.weekly_limit);
      setMinThreshold(activityData.daily_limit);
      setSelectedWeek(activityData.weekly_limit);
      const maxHourValue = Math.max(...activityData.hours.map((hour: { hours: number }) => hour.hours));
        setMaxHours(maxHourValue);
      }
  }, [activityData]);

  useEffect(() => {
    if (weeklyData && selectedWeek > 0) {
      setData(weeklyData.hours);
      setMinThreshold(weeklyData.daily_limit);
      const maxHourValue = Math.max(...weeklyData.hours.map((hour: { hours: number }) => hour.hours));
      setMaxHours(maxHourValue);
    }
  }, [weeklyData, selectedWeek]);

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