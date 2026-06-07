"use client";

import { useEffect } from "react";
import { PeriodTimeManagement } from "../siren-management/period-time";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { useTranslations } from "@/hooks/useTranslations";

export default function PeriodTimesPage() {
  const { setItems } = useBreadcrumb();
  const { t } = useTranslations<any>("sirenManagement");

  useEffect(() => {
    setItems([
      { label: "Dashboard", href: "/dashboard", isCurrent: false },
      { label: "Admin", href: "/admin", isCurrent: false },
      { label: t.period.title, isCurrent: true },
    ]);
    return () => setItems(null);
  }, [setItems, t.period.title]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 dark:bg-slate-950 md:p-6">
      <div className="w-full space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t.period.title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t.period.description}
          </p>
        </div>

        <PeriodTimeManagement />
      </div>
    </div>
  );
}
