"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsAPI, academicYearsAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Filters, useFilters, type FilterConfig } from "@/components/filters/Filters";
import { TrendingUp, Trophy, BarChart3, Users, DollarSign, School } from "lucide-react";

const FILTER_CONFIG: FilterConfig = {
  academicYear: true,
  term: true,
  grade: true,
  section: true,
};

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState("rankings");

  const {
    selectedYear, setSelectedYear,
    selectedTerm, setSelectedTerm,
    selectedGrade, setSelectedGrade,
    selectedSection, setSelectedSection,
    getActiveFilters,
  } = useFilters({ academicYear: true, term: true });

  const filters = getActiveFilters();
  const queryParams = {
    ...(filters.academicYear ? { academicYearId: filters.academicYear } : {}),
    ...(filters.termId ? { termId: filters.termId } : {}),
    ...(filters.grade ? { classId: filters.grade } : {}),
    ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
  };

  const yearDetailQuery = useQuery({
    queryKey: ["academic-year-detail", selectedYear],
    queryFn: () => academicYearsAPI.getById(selectedYear),
    enabled: !!selectedYear,
  });

  const yearData = yearDetailQuery.data?.data;
  const termOptions = yearData?.terms || [];

  const rankingsQuery = useQuery({
    queryKey: ["analytics", "rankings", queryParams],
    queryFn: () => analyticsAPI.rankings.students(queryParams),
    enabled: activeTab === "rankings",
  });

  const classRankingsQuery = useQuery({
    queryKey: ["analytics", "class-rankings", queryParams],
    queryFn: () => analyticsAPI.rankings.classes(queryParams),
    enabled: activeTab === "rankings",
  });

  const perfTrendsQuery = useQuery({
    queryKey: ["analytics", "performance-trends", queryParams],
    queryFn: () => analyticsAPI.advanced.performanceTrends(queryParams),
    enabled: activeTab === "advanced",
  });

  const attendanceAnalyticsQuery = useQuery({
    queryKey: ["analytics", "attendance-analytics", queryParams],
    queryFn: () => analyticsAPI.advanced.attendanceAnalytics(queryParams),
    enabled: activeTab === "advanced",
  });

  const financialAnalyticsQuery = useQuery({
    queryKey: ["analytics", "financial-analytics", queryParams],
    queryFn: () => analyticsAPI.advanced.financialAnalytics(queryParams),
    enabled: activeTab === "advanced",
  });

  const overviewQuery = useQuery({
    queryKey: ["analytics", "overview", queryParams],
    queryFn: () => analyticsAPI.advanced.schoolOverview(),
    enabled: activeTab === "advanced",
  });

  const getData = (query: any) => {
    const resp = query.data?.data;
    if (Array.isArray(resp)) return resp;
    if (resp?.data) return resp.data;
    return [];
  };

  const getTrendData = (query: any) => {
    const d = query.data?.data;
    if (Array.isArray(d)) return d;
    if (d?.trends) return d.trends;
    if (d?.data) return d.data;
    return [];
  };

  const renderSkeletonRows = (cols: number) =>
    Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        {Array.from({ length: cols }).map((_, j) => (
          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
        ))}
      </TableRow>
    ));

  const renderEmptyRow = (cols: number, message: string) => (
    <TableRow>
      <TableCell colSpan={cols} className="text-center py-8 text-gray-500">{message}</TableCell>
    </TableRow>
  );

  const rankChangeBadge = (change: number | null | undefined) => {
    if (change == null) return <Badge variant="secondary">-</Badge>;
    if (change > 0) return <Badge className="bg-green-100 text-green-800">+{change}</Badge>;
    if (change < 0) return <Badge className="bg-red-100 text-red-800">{change}</Badge>;
    return <Badge variant="secondary">-</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
      </div>

      <Filters
        config={FILTER_CONFIG}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        selectedTerm={selectedTerm}
        onTermChange={setSelectedTerm}
        termOptions={termOptions}
        selectedGrade={selectedGrade}
        onGradeChange={setSelectedGrade}
        selectedSection={selectedSection}
        onSectionChange={setSelectedSection}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-gray-200 dark:border-gray-700">
          <TabsList className="inline-flex h-auto w-full min-w-0 flex-nowrap gap-6 bg-transparent p-0 shadow-none border-0">
            <TabsTrigger value="rankings" className="gap-2 px-1 py-3 text-sm font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none">
              <Trophy className="h-4 w-4" />
              Student Rankings
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-2 px-1 py-3 text-sm font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none">
              <BarChart3 className="h-4 w-4" />
              Advanced Analytics
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="rankings" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Student Rankings</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Rank</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Avg Score</TableHead>
                    <TableHead>Grade Point</TableHead>
                    <TableHead>Subjects</TableHead>
                    <TableHead>Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rankingsQuery.isLoading ? renderSkeletonRows(8) :
                    getData(rankingsQuery).length === 0 ? renderEmptyRow(8, "No rankings data available") :
                    getData(rankingsQuery).map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-bold text-lg">{r.rank}</TableCell>
                        <TableCell className="font-medium">{r.studentName}</TableCell>
                        <TableCell>{r.studentCode}</TableCell>
                        <TableCell>{r.className}</TableCell>
                        <TableCell>{r.averageScore?.toFixed(1)}</TableCell>
                        <TableCell>{r.gradePoint?.toFixed(2) || "-"}</TableCell>
                        <TableCell>{r.subjectsCount}</TableCell>
                        <TableCell>{rankChangeBadge(r.rankChange)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Class Rankings</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Avg Score</TableHead>
                    <TableHead>Students</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classRankingsQuery.isLoading ? renderSkeletonRows(4) :
                    getData(classRankingsQuery).length === 0 ? renderEmptyRow(4, "No class rankings data") :
                    getData(classRankingsQuery).map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-bold">{i + 1}</TableCell>
                        <TableCell className="font-medium">{r.className || r.name}</TableCell>
                        <TableCell>{r.averageScore?.toFixed(1)}</TableCell>
                        <TableCell>{r.studentCount || r.count || "-"}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={School}
              title="School Overview"
              loading={overviewQuery.isLoading}
              value={overviewQuery.data?.data?.totalStudents ?? overviewQuery.data?.totalStudents}
              sub={`${overviewQuery.data?.data?.totalTeachers ?? overviewQuery.data?.totalTeachers ?? "-"} teachers`}
            />
            <MetricCard
              icon={TrendingUp}
              title="Avg Performance"
              loading={perfTrendsQuery.isLoading}
              value={perfTrendsQuery.data?.data?.averageScore?.toFixed(1) ?? "-"}
            />
            <MetricCard
              icon={Users}
              title="Attendance Rate"
              loading={attendanceAnalyticsQuery.isLoading}
              value={attendanceAnalyticsQuery.data?.data?.rate != null ? `${attendanceAnalyticsQuery.data.data.rate.toFixed(1)}%` : "-"}
            />
            <MetricCard
              icon={DollarSign}
              title="Total Revenue"
              loading={financialAnalyticsQuery.isLoading}
              value={financialAnalyticsQuery.data?.data?.totalRevenue != null ? `$${financialAnalyticsQuery.data.data.totalRevenue.toFixed(2)}` : "-"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Performance Trends</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Avg Score</TableHead>
                      <TableHead>Students</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perfTrendsQuery.isLoading ? renderSkeletonRows(3) :
                      getTrendData(perfTrendsQuery).length === 0 ? renderEmptyRow(3, "No trend data") :
                      getTrendData(perfTrendsQuery).map((r: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{r.period || r.label || `Period ${i + 1}`}</TableCell>
                          <TableCell className="font-medium">{r.averageScore?.toFixed(1) ?? "-"}</TableCell>
                          <TableCell>{r.studentCount ?? "-"}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Attendance Analytics</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceAnalyticsQuery.isLoading ? renderSkeletonRows(2) :
                      getTrendData(attendanceAnalyticsQuery).length === 0 ? renderEmptyRow(2, "No attendance analytics") :
                      getTrendData(attendanceAnalyticsQuery).map((r: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{r.period || r.label || `Period ${i + 1}`}</TableCell>
                          <TableCell>{r.rate != null ? `${r.rate.toFixed(1)}%` : "-"}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Financial Analytics</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financialAnalyticsQuery.isLoading ? renderSkeletonRows(2) :
                      getTrendData(financialAnalyticsQuery).length === 0 ? renderEmptyRow(2, "No financial analytics") :
                      getTrendData(financialAnalyticsQuery).map((r: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{r.period || r.label || r.month || `Period ${i + 1}`}</TableCell>
                          <TableCell className="font-medium">{r.revenue != null ? `$${r.revenue.toFixed(2)}` : r.amount != null ? `$${r.amount.toFixed(2)}` : "-"}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>School Overview</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overviewQuery.isLoading ? renderSkeletonRows(2) :
                      renderEmptyRow(2, "Overview data unavailable")}
                    {overviewQuery.data?.data && (
                      <>
                        {overviewQuery.data.data.totalStudents != null && (
                          <TableRow><TableCell>Total Students</TableCell><TableCell className="font-medium">{overviewQuery.data.data.totalStudents}</TableCell></TableRow>
                        )}
                        {overviewQuery.data.data.totalTeachers != null && (
                          <TableRow><TableCell>Total Teachers</TableCell><TableCell className="font-medium">{overviewQuery.data.data.totalTeachers}</TableCell></TableRow>
                        )}
                        {overviewQuery.data.data.totalClasses != null && (
                          <TableRow><TableCell>Total Classes</TableCell><TableCell className="font-medium">{overviewQuery.data.data.totalClasses}</TableCell></TableRow>
                        )}
                      </>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ icon: Icon, title, value, sub, loading }: { icon: any; title: string; value: any; sub?: string; loading?: boolean }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--brand-color,#e35336)]/10">
            <Icon className="h-5 w-5 text-[var(--brand-color,#e35336)]" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            {loading ? (
              <Skeleton className="h-6 w-16 mt-1" />
            ) : (
              <>
                <p className="text-xl font-bold">{value ?? "-"}</p>
                {sub && <p className="text-xs text-gray-400">{sub}</p>}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
