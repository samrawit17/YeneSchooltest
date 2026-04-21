"use client";

import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  color?: "default" | "primary" | "white";
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
};

const colorClasses = {
  default: "text-[#e35336] dark:text-[#e35336]",
  primary: "text-blue-600 dark:text-blue-400",
  white: "text-white",
};

export default function LoadingSpinner({ size = "md", color = "default", className = "" }: LoadingSpinnerProps) {
  return (
    <Loader2 
      className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin ${className}`} 
    />
  );
}