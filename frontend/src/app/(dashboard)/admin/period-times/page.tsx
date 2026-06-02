"use client";

import { useEffect } from "react";
import { PeriodTimeManagement } from "../siren-management/period-time";
import { useBreadcrumb } from "@/context/BreadcrumbContext";

export default function PeriodTimesPage() {
  const { setItems } = useBreadcrumb();

  useEffect(() => {
    setItems([
      { label: "Dashboard", href: "/dashboard", isCurrent: false },
      { label: "Admin", href: "/admin", isCurrent: false },
      { label: "Period Times", isCurrent: true },
    ]);
    return () => setItems(null);
  }, [setItems]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 dark:bg-slate-950 md:p-6">
      <div className="w-full space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Period Times
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure school periods and their time slots
          </p>
        </div>

        <PeriodTimeManagement />
      </div>
    </div>
  );
}
