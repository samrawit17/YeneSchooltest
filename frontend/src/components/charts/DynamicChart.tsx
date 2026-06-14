"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { MoreHorizontal } from "lucide-react";
import { useThemeStore } from "@/lib/themeStore";

interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  fill?: boolean;
}

interface ChartData {
  type: "bar" | "line" | "pie" | "doughnut";
  title: string;
  labels: string[];
  datasets: ChartDataset[];
}

interface DynamicChartProps {
  chartData?: ChartData | null;
  height?: number | string;
}

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", 
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"
];

const DynamicChart = ({ chartData, height = 300 }: DynamicChartProps) => {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === "dark";

  // Dark mode tooltip style
  const getTooltipStyle = () => ({
    borderRadius: "8px",
    borderColor: isDark ? "#2A2A2A" : "#e5e7eb",
    boxShadow: isDark ? "0 4px 6px -1px rgba(0, 0, 0, 0.5)" : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    background: isDark ? "#1A1A1A" : "white",
    color: isDark ? "#F2F2F2" : "#1f2937",
  });

  const axisTickStyle = { fill: isDark ? "#888888" : "#9ca3af", fontSize: 12 };
  const gridStroke = isDark ? "#2A2A2A" : "#e5e7eb";
  const titleColor = isDark ? "#F2F2F2" : "#1f2937";

  // Handle undefined or null chartData
  if (!chartData) {
    return (
      <div className="bg-white dark:bg-[#1A1A1A] rounded-xl p-4 h-full shadow-sm border border-gray-100 dark:border-[#2A2A2A]">
        <div className="flex items-center justify-center h-full min-h-[200px] text-gray-500 dark:text-gray-400">
          <p>No chart data available</p>
        </div>
      </div>
    );
  }

  const { type, title, labels, datasets } = chartData;

  // Handle empty data
  if (!labels || !datasets || labels.length === 0 || datasets.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1A1A1A] rounded-xl p-4 h-full shadow-sm border border-gray-100 dark:border-[#2A2A2A]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title || 'Chart'}</h3>
        </div>
        <div className="flex items-center justify-center h-full min-h-[200px] text-gray-500 dark:text-gray-400">
          <p>No data to display</p>
        </div>
      </div>
    );
  }

  // Transform data for recharts format
  const transformedData = labels.map((label, index) => {
    const dataPoint: Record<string, any> = { name: label };
    datasets.forEach((dataset) => {
      dataPoint[dataset.label] = dataset.data[index];
    });
    return dataPoint;
  });

  const renderChart = () => {
    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={transformedData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tick={axisTickStyle}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                tick={axisTickStyle}
                tickLine={false}
              />
              <Tooltip
                contentStyle={getTooltipStyle()}
                itemStyle={{ color: isDark ? "#F2F2F2" : "#1f2937" }}
                labelStyle={{ color: isDark ? "#888888" : "#6b7280" }}
              />
              <Legend
                align="left"
                verticalAlign="top"
                wrapperStyle={{ paddingTop: "10px", paddingBottom: "20px", color: isDark ? "#CCCCCC" : "#374151" }}
              />
              {datasets.map((dataset, index) => {
                  const baseColor = typeof dataset.backgroundColor === "string"
                    ? dataset.backgroundColor
                    : COLORS[index % COLORS.length];
                  return (
                    <Bar
                      key={index}
                      dataKey={dataset.label}
                      fill={baseColor}
                      fillOpacity={isDark ? 0.9 : 1}
                      stroke={baseColor}
                      strokeWidth={0}
                      legendType="circle"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                    />
                  );
                })}
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={transformedData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tick={axisTickStyle}
                tickLine={false}
                tickMargin={10}
              />
              <YAxis
                axisLine={false}
                tick={axisTickStyle}
                tickLine={false}
                tickMargin={10}
              />
              <Tooltip
                contentStyle={getTooltipStyle()}
                itemStyle={{ color: isDark ? "#F2F2F2" : "#1f2937" }}
                labelStyle={{ color: isDark ? "#888888" : "#6b7280" }}
              />
              <Legend
                align="center"
                verticalAlign="top"
                wrapperStyle={{ paddingTop: "10px", paddingBottom: "20px", color: isDark ? "#CCCCCC" : "#374151" }}
              />
              {datasets.map((dataset, index) => (
                <Line
                  key={index}
                  type="monotone"
                  dataKey={dataset.label}
                  stroke={dataset.borderColor || COLORS[index % COLORS.length]}
                  strokeWidth={isDark ? 2.5 : 3}
                  dot={{ fill: dataset.borderColor || COLORS[index % COLORS.length], strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 7, stroke: isDark ? "#1A1A1A" : "#fff", strokeWidth: 2, fill: dataset.borderColor || COLORS[index % COLORS.length] }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case "pie":
        const pieData = labels.map((label, index) => ({
          name: label,
          value: datasets[0]?.data[index] || 0,
        }));
        const pieColors = typeof datasets[0]?.backgroundColor === "string"
          ? [datasets[0].backgroundColor]
          : datasets[0]?.backgroundColor || COLORS;

        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                isAnimationActive={false}
              >
                {pieData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={pieColors[index % pieColors.length]}
                    stroke={isDark ? "#1A1A1A" : "#fff"}
                    strokeWidth={2}
                    className="transition-all duration-200"
                    style={{
                      filter: isDark ? "brightness(1.1)" : "none",
                      cursor: "pointer"
                    }}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={getTooltipStyle()}
                itemStyle={{ color: isDark ? "#F2F2F2" : "#1f2937" }}
                labelStyle={{ color: isDark ? "#888888" : "#6b7280" }}
              />
              <Legend
                align="center"
                verticalAlign="bottom"
                wrapperStyle={{ paddingTop: "20px", color: isDark ? "#CCCCCC" : "#374151" }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case "doughnut":
        const doughnutData = labels.map((label, index) => ({
          name: label,
          value: datasets[0]?.data[index] || 0,
        }));
        const doughnutColors = typeof datasets[0]?.backgroundColor === "string"
          ? [datasets[0].backgroundColor]
          : datasets[0]?.backgroundColor || COLORS;

        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={doughnutData}
                cx="50%"
                cy="50%"
                innerRadius={50}  // This creates the doughnut hole
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                isAnimationActive={false}
              >
                {doughnutData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={doughnutColors[index % doughnutColors.length]}
                    stroke={isDark ? "#1A1A1A" : "#fff"}
                    strokeWidth={2}
                    className="transition-all duration-200"
                    style={{
                      filter: isDark ? "brightness(1.1)" : "none",
                      cursor: "pointer"
                    }}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={getTooltipStyle()}
                itemStyle={{ color: isDark ? "#F2F2F2" : "#1f2937" }}
                labelStyle={{ color: isDark ? "#888888" : "#6b7280" }}
              />
              <Legend
                align="center"
                verticalAlign="bottom"
                wrapperStyle={{ paddingTop: "20px", color: isDark ? "#CCCCCC" : "#374151" }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">Unknown chart type</div>;
    }
  };

  return (
    <div className="bg-white dark:bg-[#1A1A1A] rounded-xl p-4 h-full shadow-sm border border-gray-100 dark:border-[#2A2A2A]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
        <MoreHorizontal
          aria-label="Options"
          className="h-5 w-5 cursor-pointer text-gray-400 opacity-70 hover:opacity-100 dark:text-gray-500"
        />
      </div>
      {renderChart()}
    </div>
  );
};

export default DynamicChart;
