"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import Image from "next/image";

interface ChildrenPerformanceChartProps {
  gradeDistribution: {
    grade: string;
    count: number;
    color: string;
  }[];
  totalChildren: number;
}

const COLORS = {
  A: "#10b981", // Green
  B: "#3b82f6", // Blue
  C: "#f59e0b", // Yellow
  D: "#f97316", // Orange
  F: "#ef4444", // Red
};

const ChildrenPerformanceChart = ({ gradeDistribution, totalChildren }: ChildrenPerformanceChartProps) => {
  const data = gradeDistribution.map((item) => ({
    name: `Grade ${item.grade}`,
    value: item.count,
    color: item.color || COLORS[item.grade as keyof typeof COLORS] || "#6b7280",
  }));

  return (
    <div className="bg-white rounded-xl p-4 h-full shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Grade Distribution</h3>
        <Image 
          src="/moreDark.png" 
          alt="Options" 
          width={20} 
          height={20} 
          className="opacity-50 hover:opacity-100 cursor-pointer" 
        />
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800">{totalChildren}</p>
          <p className="text-xs text-gray-500">Total Children</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={75}
            paddingAngle={3}
            dataKey="value"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              borderColor: "#e5e7eb",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              background: "white",
            }}
          />
          <Legend
            align="center"
            verticalAlign="bottom"
            wrapperStyle={{ paddingTop: "15px" }}
            formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Grade Legend */}
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {gradeDistribution.map((item) => (
          <div key={item.grade} className="flex items-center gap-1.5">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: item.color || COLORS[item.grade as keyof typeof COLORS] || "#6b7280" }}
            />
            <span className="text-xs text-gray-600">Grade {item.grade}</span>
            <span className="text-xs font-medium text-gray-800">({item.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChildrenPerformanceChart;

