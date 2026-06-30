"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { superadminAPI } from "@/lib/api/superadmin";
import { toast } from "sonner";
import { motion } from "framer-motion";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import DynamicChart from "@/components/charts/DynamicChart";

interface SuperAdminStats {
  totalSchools: number;
  activeSchools: number;
  inactiveSchools: number;
  totalUsers: number;
  newUsersThisMonth: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

interface StatCard {
  label: string;
  getValue: (s: SuperAdminStats) => string | number;
  getSecondary: (s: SuperAdminStats) => string;
  showProgress?: boolean;
  progress?: (s: SuperAdminStats) => number;
}

const statCards: StatCard[] = [
  {
    label: "Total Schools",
    getValue: (s) => s.totalSchools,
    getSecondary: (s) => `${s.activeSchools} Active`,
    showProgress: true,
    progress: (s) =>
      s.totalSchools ? Math.round((s.activeSchools / s.totalSchools) * 100) : 0,
  },
  {
    label: "Total Users",
    getValue: (s) => s.totalUsers.toLocaleString(),
    getSecondary: (s) => `+${s.newUsersThisMonth} this month`,
  },
  {
    label: "Monthly Revenue",
    getValue: (s) =>
      `Birr ${s.monthlyRevenue.toLocaleString()}`,
    getSecondary: () => "+12% vs last month",
  },
  {
    label: "Total Revenue",
    getValue: (s) =>
      `Birr ${s.totalRevenue.toLocaleString()}`,
    getSecondary: () => "All time earnings",
  },
];


const SuperAdminPage = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      if (user?.role?.toLowerCase() !== "super_admin") {
        toast.error("Access denied. Super Admin only.");
        router.push("/dashboard");
        return;
      }
      fetchStats();
    }
  }, [isAuthenticated, authLoading, user, router]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await superadminAPI.getDashboard();
      const data = response.data;
      setStats({
        totalSchools: data.stats?.totalSchools || 0,
        activeSchools: data.stats?.activeSchools || 0,
        inactiveSchools: data.stats?.inactiveSchools || 0,
        totalUsers: data.stats?.totalUsers || 0,
        newUsersThisMonth: data.stats?.newUsersThisMonth || 0,
        totalRevenue: data.stats?.totalRevenue || 0,
        monthlyRevenue: data.stats?.monthlyRevenue || 0,
      });
    } catch (error: any) {
      console.error("Failed to fetch stats:", error);
      setStats({
        totalSchools: 0,
        activeSchools: 0,
        inactiveSchools: 0,
        totalUsers: 0,
        newUsersThisMonth: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const openBackupsPage = () => {
    setBackupLoading(true);
    router.push("/superadmin/backups");
  };

  const schoolChartData = stats
    ? {
        type: "doughnut" as const,
        title: "School Distribution",
        labels: ["Active Schools", "Inactive Schools"],
        datasets: [
          {
            label: "Schools",
            data: [stats.activeSchools, stats.inactiveSchools],
            backgroundColor: ["#10b981", "#f59e0b"],
          },
        ],
      }
    : null;

  const revenueChartData = stats
    ? {
        type: "bar" as const,
        title: "Revenue Overview",
        labels: ["Monthly Revenue", "Total Revenue"],
        datasets: [
          {
            label: "Revenue (Birr)",
            data: [stats.monthlyRevenue, stats.totalRevenue],
            backgroundColor: ["#8b5cf6", "#3b82f6"],
          },
        ],
      }
    : null;

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#1A1A1A] p-6">
        <div className="w-full space-y-6">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#1A1A1A]">
      <div className="w-full">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-6 p-6"
        >
          {/* Header */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 overflow-hidden rounded-2xl dark:bg-[#1A1A1A] dark:border-[#2A2A2A]">
              <div>
                <CardContent className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                          Super Admin
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                          Platform Management Dashboard
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-0 text-xs">
                            Full Access
                          </Badge>
                          <Badge className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-0 text-xs">
                            Live
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={openBackupsPage}
                        disabled={backupLoading}
                      >
                        {backupLoading ? "Downloading..." : "Download Backup"}
                      </Button>
                    </div>
                  </div>

                  <Separator className="my-5 dark:bg-gray-700" />

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Platform Schools", value: stats?.totalSchools ?? 0 },
                      { label: "Total Users", value: stats?.totalUsers ?? 0 },
                      { label: "Monthly Revenue", value: `Birr ${stats?.monthlyRevenue?.toLocaleString() ?? 0}` },
                      { label: "Active Rate", value: stats?.totalSchools ? `${Math.round((stats.activeSchools / stats.totalSchools) * 100)}%` : "0%" },
                    ].map((item, i) => (
                      <div key={i} className="rounded-xl bg-gray-50 dark:bg-[#2A2A2A] p-4 ring-1 ring-gray-100 dark:ring-[#333]">
                        <div className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">
                          {item.label}
                        </div>
                        <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </div>
            </Card>
          </motion.div>

          {/* Stats Cards Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5"
          >
            {statCards.map((card, index) => {
              const s = stats!;
              return (
                <motion.div key={index} variants={itemVariants}>
                  <Card className="group relative overflow-hidden rounded-2xl border-0 bg-white dark:bg-[#1A1A1A] dark:border-[#2A2A2A] shadow-sm hover:shadow-md transition-all duration-300">
                    <CardContent className="p-5">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {card.label}
                        </p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                          {card.getValue(s)}
                        </p>
                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          {card.getSecondary(s)}
                        </p>
                      </div>
                      {card.showProgress && card.progress && (
                        <div className="mt-4">
                          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                            <span>Active Rate</span>
                            <span>{card.progress(s)}%</span>
                          </div>
                          <Progress
                            value={card.progress(s)}
                            className="h-2 bg-gray-100 dark:bg-gray-700"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Charts + Quick Actions */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Revenue Chart */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <DynamicChart chartData={revenueChartData} height={280} />
            </motion.div>

            {/* School Distribution */}
            <motion.div variants={itemVariants}>
              <DynamicChart chartData={schoolChartData} height={280} />
            </motion.div>
          </motion.div>


        </motion.div>
      </div>
    </div>
  );
};

export default SuperAdminPage;
