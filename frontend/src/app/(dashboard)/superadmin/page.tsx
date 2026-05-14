"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { superadminAPI } from "@/lib/api/superadmin";
import { toast } from "sonner";
import { 
  Building2, 
  Users, 
  Shield,
  TrendingUp,
  CreditCard,
  Plus,
  ArrowRight,
  Settings,
  Crown,
  Globe
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface SuperAdminStats {
  totalSchools: number;
  activeSchools: number;
  inactiveSchools: number;
  totalUsers: number;
  newUsersThisMonth: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

const QuickActions = [
  { label: "Add School", icon: Plus, href: "/list/schools", color: "bg-purple-100 text-purple-600" },
  { label: "School Admins", icon: Users, href: "/superadmin/admins", color: "bg-blue-100 text-blue-600" },
  { label: "Subscriptions", icon: Crown, href: "/superadmin/subscription", color: "bg-amber-100 text-amber-600" },
  { label: "Settings", icon: Settings, href: "/platform-settings", color: "bg-gray-100 text-gray-600" },
];

const SuperAdminPage = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      if (user?.role?.toLowerCase() !== 'super_admin') {
        toast.error('Access denied. Super Admin only.');
        router.push('/dashboard');
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
      console.error('Failed to fetch stats:', error);
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

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-700 dark:to-indigo-700">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Super Admin</h1>
                  <p className="text-purple-100 text-sm">Platform Management Dashboard</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-white/20 text-white border-0">
                  <Globe className="w-3.5 h-3.5 mr-1" />
                  Platform Admin
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Schools */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Schools</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats?.totalSchools || 0}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                      {stats?.activeSchools || 0} Active
                    </Badge>
                  </div>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>Active Rate</span>
                  <span>{stats?.totalSchools ? Math.round((stats.activeSchools / stats.totalSchools) * 100) : 0}%</span>
                </div>
                <Progress 
                  value={stats?.totalSchools ? (stats.activeSchools / stats.totalSchools) * 100 : 0} 
                  className="h-2 dark:bg-gray-700"
                />
              </div>
            </CardContent>
          </Card>

          {/* Total Users */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                    {(stats?.totalUsers || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1 font-medium">
                    +{stats?.newUsersThisMonth || 0} this month
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Revenue */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Revenue</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                    ${(stats?.monthlyRevenue || 0).toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">+12%</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                    ${(stats?.totalRevenue || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">All time</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Recent Schools */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {QuickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-between h-12 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600"
                  onClick={() => router.push(action.href)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${action.color}`}>
                      <action.icon className="w-4 h-4" />
                    </div>
                    <span className="text-gray-900 dark:text-white font-medium">{action.label}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </Button>
              ))}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default SuperAdminPage;
