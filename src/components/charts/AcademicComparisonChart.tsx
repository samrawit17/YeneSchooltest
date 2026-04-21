"use client";

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from "recharts";
import Image from "next/image";

interface ChildPerformance {
  name: string;
  average: number;
  grade: string;
}

interface AcademicComparisonChartProps {
  data: ChildPerformance[];
  title?: string;
}

const GRADE_COLORS: Record<string, string> = {
  "A": "#10b981", // Green
  "A+": "#059669",
  "B": "#3b82f6", // Blue
  "B+": "#2563eb",
  "C": "#f59e0b", // Yellow
  "C+": "#d97706",
  "D": "#f97316", // Orange
  "D+": "#ea580c",
  "F": "#ef4444", // Red
};

const AcademicComparisonChart = ({ 
  data, 
  title = "Academic Performance Comparison" 
}: AcademicComparisonChartProps) => {
  const getBarColor = (average: number) => {
    if (average >= 80) return "#10b981";
    if (average >= 60) return "#3b82f6";
    if (average >= 50) return "#f59e0b";
    if (average >= 40) return "#f97316";
    return "#ef4444";
  };

  const avgScore = Math.round(data.reduce((sum, d) => sum + d.average, 0) / data.length);
  const topPerformer = data.reduce((max, d) => d.average > max.average ? d : max, data[0]);
  const avgGrade = topPerformer.grade;

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

      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          width={500}
          height={220}
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          barSize={30}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis 
            dataKey="name" 
            axisLine={false}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            tickLine={false}
            dy={10}
            angle={-15}
            textAnchor="end"
            height={60}
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
            formatter={(value: number) => [`${value}%`, "Average"]}
            labelStyle={{ color: "#374151", fontWeight: 600 }}
          />
          <Legend
            align="left"
            verticalAlign="top"
            wrapperStyle={{ paddingTop: "5px", paddingBottom: "15px" }}
            formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
          />
          <Bar
            dataKey="average"
            name="Average Score"
            radius={[6, 6, 0, 0]}
            legendType="circle"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.average)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-lg font-bold text-blue-600">{avgScore}%</p>
          <p className="text-xs text-gray-500">Class Average</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-green-600">{topPerformer.name}</p>
          <p className="text-xs text-gray-500">Top Performer</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-purple-600">{topPerformer.grade}</p>
          <p className="text-xs text-gray-500">Best Grade</p>
        </div>
      </div>
    </div>
  );
};

export default AcademicComparisonChart;

