"use client";

import { ReactNode } from "react";
import Image from "next/image";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  color?: "blue" | "green" | "yellow" | "red" | "purple" | "pink" | "cyan";
  gradient?: boolean;
}

const colorVariants = {
  blue: {
    bg: "bg-white",
    border: "border-gray-200",
    text: "text-blue-600",
    iconBg: "bg-blue-100",
    gradient: "from-blue-500 to-blue-600",
  },
  green: {
    bg: "bg-white",
    border: "border-gray-200",
    text: "text-emerald-600",
    iconBg: "bg-emerald-100",
    gradient: "from-emerald-500 to-emerald-600",
  },
  yellow: {
    bg: "bg-white",
    border: "border-gray-200",
    text: "text-amber-600",
    iconBg: "bg-amber-100",
    gradient: "from-amber-500 to-amber-600",
  },
  red: {
    bg: "bg-white",
    border: "border-gray-200",
    text: "text-red-600",
    iconBg: "bg-red-100",
    gradient: "from-red-500 to-red-600",
  },
  purple: {
    bg: "bg-white",
    border: "border-gray-200",
    text: "text-purple-600",
    iconBg: "bg-purple-100",
    gradient: "from-purple-500 to-purple-600",
  },
  pink: {
    bg: "bg-white",
    border: "border-gray-200",
    text: "text-pink-600",
    iconBg: "bg-pink-100",
    gradient: "from-pink-500 to-pink-600",
  },
  cyan: {
    bg: "bg-white",
    border: "border-gray-200",
    text: "text-cyan-600",
    iconBg: "bg-cyan-100",
    gradient: "from-cyan-500 to-cyan-600",
  },
};

const iconMap: Record<string, string> = {
  student: "/student.png",
  teacher: "/teacher.png",
  parent: "/parent.png",
  staff: "/avatar.svg",
  class: "/class.png",
  subject: "/subject.png",
  attendance: "/attendance.png",
  finance: "/finance.png",
  exam: "/exam.png",
  calendar: "/calendar.png",
  announcement: "/announcement.png",
  assignment: "/assignment.png",
  lesson: "/lesson.png",
  result: "/result.png",
  message: "/message.png",
  enrollment: "/create.png",
};

const StatCard = ({
  title,
  value,
  icon,
  trend,
  subtitle,
  color = "blue",
  gradient = false,
}: StatCardProps) => {
  const colors = colorVariants[color];

  return (
    <div
      className={`relative overflow-hidden rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
        gradient
          ? `bg-gradient-to-br ${colors.gradient} text-white`
          : `${colors.bg} border ${colors.border} dark:bg-[#1E293B] dark:border-[#334155]`
      }`}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full opacity-10 bg-white"></div>
      
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p
            className={`text-sm font-medium ${
              gradient ? "text-white/80" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {title}
          </p>
          <h3
            className={`text-2xl font-bold mt-1 ${
              gradient ? "text-white" : "text-gray-800 dark:text-white"
            }`}
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </h3>
          
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.isPositive ? (
                <TrendingUp className={`w-4 h-4 ${gradient ? "text-white" : "text-emerald-500"}`} />
              ) : trend.value === 0 ? (
                <Minus className={`w-4 h-4 ${gradient ? "text-white" : "text-gray-400"}`} />
              ) : (
                <TrendingDown className={`w-4 h-4 ${gradient ? "text-white" : "text-red-500"}`} />
              )}
              <span
                className={`text-xs font-medium ${
                  gradient
                    ? "text-white"
                    : trend.isPositive
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {trend.value > 0 ? "+" : ""}
                {trend.value}% from last month
              </span>
            </div>
          )}
          
          {subtitle && (
            <p
              className={`text-xs mt-2 ${
                gradient ? "text-white/70" : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {subtitle}
            </p>
          )}
        </div>

        {icon && (
          <div
            className={`p-3 rounded-xl ${
              gradient ? "bg-white/20" : colors.iconBg
            }`}
          >
            <Image
              src={iconMap[icon] || icon}
              alt={title}
              width={24}
              height={24}
              className={`${gradient ? "brightness-0 invert" : ""}`}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
