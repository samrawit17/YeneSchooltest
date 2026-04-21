"use client";

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import Image from "next/image";

interface AttendanceData {
  week: string;
  present: number;
  absent: number;
  percentage: number;
}

interface AttendanceTrendChartProps {
  data: AttendanceData[];
  title?: string;
  showArea?: boolean;
}

const AttendanceTrendChart = ({ 
  data, 
  title = "Attendance Trend",
  showArea = true 
}: AttendanceTrendChartProps) => {
  const avgPresent = Math.round(data.reduce((sum, d) => sum + d.present, 0) / data.length);
  const avgAbsent = Math.round(data.reduce((sum, d) => sum + d.absent, 0) / data.length);
  const avgOverall = Math.round(data.reduce((sum, d) => sum + d.percentage, 0) / data.length);

  return (
    <div className="bg-white rounded-xl p-4 h-full shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <Image 
          src="/moreDark.png" 
          alt="Options" 
          width={20} 
          height={20} 
          className="opacity-50 hover:opacity-100 cursor-pointer" 
        />
      </div>

      {showArea ? (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            width={500}
            height={220}
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis 
              dataKey="week" 
              axisLine={false}
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              tickLine={false}
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              tickLine={false}
              tickMargin={10}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                borderColor: "#e5e7eb",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                background: "white",
              }}
            />
            <Legend
              align="left"
              verticalAlign="top"
              wrapperStyle={{ paddingTop: "5px", paddingBottom: "15px" }}
              formatter={(value) => <span className="text-xs text-gray-600 capitalize">{value}</span>}
            />
            <Area
              type="monotone"
              dataKey="present"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPresent)"
              name="Present %"
            />
            <Area
              type="monotone"
              dataKey="absent"
              stroke="#ef4444"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorAbsent)"
              name="Absent %"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            width={500}
            height={220}
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis 
              dataKey="week" 
              axisLine={false}
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              tickLine={false}
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              tickLine={false}
              tickMargin={10}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                borderColor: "#e5e7eb",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                background: "white",
              }}
            />
            <Legend
              align="left"
              verticalAlign="top"
              wrapperStyle={{ paddingTop: "5px", paddingBottom: "15px" }}
              formatter={(value) => <span className="text-xs text-gray-600 capitalize">{value}</span>}
            />
            <Line
              type="monotone"
              dataKey="present"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: "#10b981", strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              name="Present %"
            />
            <Line
              type="monotone"
              dataKey="absent"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: "#ef4444", strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              name="Absent %"
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-lg font-bold text-green-600">{avgPresent}%</p>
          <p className="text-xs text-gray-500">Avg Present</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-red-600">{avgAbsent}%</p>
          <p className="text-xs text-gray-500">Avg Absent</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-blue-600">{avgOverall}%</p>
          <p className="text-xs text-gray-500">Overall</p>
        </div>
      </div>
    </div>
  );
};

export default AttendanceTrendChart;

