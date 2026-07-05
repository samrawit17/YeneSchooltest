"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsAPI, academicYearsAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Pagination from "@/components/Pagination";
import { Filters, useFilters, type FilterConfig } from "@/components/filters/Filters";
import { RefreshCw, BookOpen, CalendarCheck, Users, UserCheck, AlertTriangle, DollarSign } from "lucide-react";

const TABS = [
  { value: "academic", label: "Academic", icon: BookOpen },
  { value: "attendance", label: "Attendance", icon: CalendarCheck },
  { value: "student", label: "Student", icon: Users },
  { value: "teacher", label: "Teacher", icon: UserCheck },
  { value: "discipline", label: "Discipline", icon: AlertTriangle },
  { value: "finance", label: "Finance", icon: DollarSign },
];

const FILTER_CONFIG: FilterConfig = {
  academicYear: true,
  term: true,
  grade: true,
  section: true,
  status: true,
  search: true,
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("academic");
  const [page, setPage] = useState(1);
  const limit = 20;

  const {
    selectedYear, setSelectedYear,
    selectedTerm, setSelectedTerm,
    selectedGrade, setSelectedGrade,
    selectedSection, setSelectedSection,
    selectedStatus, setSelectedStatus,
    selectedSearch, setSelectedSearch,
    getActiveFilters,
  } = useFilters({ academicYear: true, term: true });

  const filters = getActiveFilters();
  const queryParams = {
    ...(filters.academicYear ? { academicYearId: filters.academicYear } : {}),
    ...(filters.termId ? { termId: filters.termId } : {}),
    ...(filters.grade ? { classId: filters.grade } : {}),
    ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search ? { search: filters.search } : {}),
    page, limit,
  };

  const yearDetailQuery = useQuery({
    queryKey: ["academic-year-detail", selectedYear],
    queryFn: () => academicYearsAPI.getById(selectedYear),
    enabled: !!selectedYear,
  });

  const yearData = yearDetailQuery.data?.data;
  const termOptions = yearData?.terms || [];

  const academicQuery = useQuery({
    queryKey: ["reports", "academic", queryParams],
    queryFn: () => reportsAPI.academic.performance(queryParams),
    enabled: activeTab === "academic",
  });

  const attendanceQuery = useQuery({
    queryKey: ["reports", "attendance", queryParams],
    queryFn: () => reportsAPI.attendance.summary(queryParams),
    enabled: activeTab === "attendance",
  });

  const attendanceTrendsQuery = useQuery({
    queryKey: ["reports", "attendance-trends", queryParams],
    queryFn: () => reportsAPI.attendance.trends(queryParams),
    enabled: activeTab === "attendance",
  });

  const studentQuery = useQuery({
    queryKey: ["reports", "student", queryParams],
    queryFn: () => reportsAPI.student.demographics(queryParams),
    enabled: activeTab === "student",
  });

  const enrollmentTrendsQuery = useQuery({
    queryKey: ["reports", "enrollment-trends", queryParams],
    queryFn: () => reportsAPI.student.enrollmentTrends(queryParams),
    enabled: activeTab === "student",
  });

  const teacherQuery = useQuery({
    queryKey: ["reports", "teacher", queryParams],
    queryFn: () => reportsAPI.teacher.performance(queryParams),
    enabled: activeTab === "teacher",
  });

  const teacherLeaderboardQuery = useQuery({
    queryKey: ["reports", "teacher-leaderboard"],
    queryFn: () => reportsAPI.teacher.leaderboard(),
    enabled: activeTab === "teacher",
  });

  const disciplineQuery = useQuery({
    queryKey: ["reports", "discipline", queryParams],
    queryFn: () => reportsAPI.discipline.incidents(queryParams),
    enabled: activeTab === "discipline",
  });

  const disciplineTrendsQuery = useQuery({
    queryKey: ["reports", "discipline-trends", queryParams],
    queryFn: () => reportsAPI.discipline.trends(queryParams),
    enabled: activeTab === "discipline",
  });

  const financeDailyQuery = useQuery({
    queryKey: ["reports", "finance-daily", queryParams],
    queryFn: () => reportsAPI.finance.daily(queryParams),
    enabled: activeTab === "finance",
  });

  const financeMonthlyQuery = useQuery({
    queryKey: ["reports", "finance-monthly", queryParams],
    queryFn: () => reportsAPI.finance.monthly(queryParams),
    enabled: activeTab === "finance",
  });

  const financeOutstandingQuery = useQuery({
    queryKey: ["reports", "finance-outstanding", queryParams],
    queryFn: () => reportsAPI.finance.outstanding(queryParams),
    enabled: activeTab === "finance",
  });

  const handleRefresh = useCallback(() => {
    academicQuery.refetch();
    attendanceQuery.refetch();
    attendanceTrendsQuery.refetch();
    studentQuery.refetch();
    enrollmentTrendsQuery.refetch();
    teacherQuery.refetch();
    teacherLeaderboardQuery.refetch();
    disciplineQuery.refetch();
    disciplineTrendsQuery.refetch();
    financeDailyQuery.refetch();
    financeMonthlyQuery.refetch();
    financeOutstandingQuery.refetch();
  }, []);

  const getData = (query: any) => {
    const resp = query.data?.data;
    if (Array.isArray(resp)) return resp;
    if (resp?.data) return resp.data;
    return [];
  };

  const getTotalPages = (query: any) => query.data?.data?.totalPages || query.data?.totalPages || 1;

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

  const severityBadge = (severity: string) => {
    const map: Record<string, string> = { LOW: "bg-green-100 text-green-800", MEDIUM: "bg-yellow-100 text-yellow-800", HIGH: "bg-orange-100 text-orange-800", CRITICAL: "bg-red-100 text-red-800" };
    return <Badge className={map[severity] || "bg-gray-100"}>{severity}</Badge>;
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { OPEN: "bg-red-100 text-red-800", INVESTIGATING: "bg-yellow-100 text-yellow-800", RESOLVED: "bg-green-100 text-green-800", CLOSED: "bg-gray-100 text-gray-800", DRAFT: "bg-gray-100 text-gray-800", PUBLISHED: "bg-green-100 text-green-800", ACTIVE: "bg-green-100 text-green-800" };
    return <Badge className={map[status] || "bg-gray-100"}>{status}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <Button variant="outline" size="icon" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
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
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedSearch={selectedSearch}
        onSearchChange={setSelectedSearch}
      />

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }}>
        <div className="border-b border-gray-200 dark:border-gray-700">
          <TabsList className="inline-flex h-auto w-full min-w-0 flex-nowrap bg-transparent p-0 shadow-none border-0">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex-1 gap-1.5 px-3 py-3 text-xs font-semibold data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--brand-color,#e35336)] data-[state=active]:text-[var(--brand-color,#e35336)] rounded-none"
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="academic" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Academic Performance</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {academicQuery.isLoading ? renderSkeletonRows(7) :
                    getData(academicQuery).length === 0 ? renderEmptyRow(7, "No academic records found") :
                    getData(academicQuery).map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.studentName}</TableCell>
                        <TableCell>{r.className}</TableCell>
                        <TableCell>{r.subjectName}</TableCell>
                        <TableCell>{r.score ?? "-"}</TableCell>
                        <TableCell>{r.gradeLetter || "-"}</TableCell>
                        <TableCell>{r.teacherName}</TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <div className="mt-4">
                <Pagination page={page} setPage={setPage} totalPages={getTotalPages(academicQuery)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          {attendanceTrendsQuery.data?.data?.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Attendance Trends</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceTrendsQuery.data.data.map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell>{r.period || r.label || `Period ${i + 1}`}</TableCell>
                        <TableCell>{r.rate != null ? `${r.rate}%` : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle>Attendance Summary</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Total Days</TableHead>
                    <TableHead>Present</TableHead>
                    <TableHead>Absent</TableHead>
                    <TableHead>Late</TableHead>
                    <TableHead>Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceQuery.isLoading ? renderSkeletonRows(7) :
                    getData(attendanceQuery).length === 0 ? renderEmptyRow(7, "No attendance records found") :
                    getData(attendanceQuery).map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.studentName}</TableCell>
                        <TableCell>{r.className}</TableCell>
                        <TableCell>{r.totalDays}</TableCell>
                        <TableCell>{r.presentDays}</TableCell>
                        <TableCell>{r.absentDays}</TableCell>
                        <TableCell>{r.lateDays}</TableCell>
                        <TableCell>
                          <Badge variant={r.attendanceRate >= 90 ? "default" : r.attendanceRate >= 75 ? "secondary" : "destructive"}>
                            {r.attendanceRate?.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="student" className="space-y-4">
          {enrollmentTrendsQuery.data?.data?.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Enrollment Trends</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollmentTrendsQuery.data.data.map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell>{r.period || r.academicYear || r.label || `Period ${i + 1}`}</TableCell>
                        <TableCell>{r.count ?? r.total ?? 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle>Student Demographics</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Parent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentQuery.isLoading ? renderSkeletonRows(7) :
                    getData(studentQuery).length === 0 ? renderEmptyRow(7, "No student records found") :
                    getData(studentQuery).map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.studentName}</TableCell>
                        <TableCell>{r.studentCode}</TableCell>
                        <TableCell>{r.gender || "-"}</TableCell>
                        <TableCell>{r.className}</TableCell>
                        <TableCell>{r.sectionName}</TableCell>
                        <TableCell>{statusBadge(r.enrollmentStatus)}</TableCell>
                        <TableCell>{r.parentName || "-"}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teacher" className="space-y-4">
          {teacherLeaderboardQuery.data?.data?.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Teacher Leaderboard</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Students Graded</TableHead>
                      <TableHead>Avg Score</TableHead>
                      <TableHead>Attendance Taken</TableHead>
                      <TableHead>Composite</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teacherLeaderboardQuery.data.data.map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium">{r.teacherName}</TableCell>
                        <TableCell>{r.department || "-"}</TableCell>
                        <TableCell>{r.studentsGraded}</TableCell>
                        <TableCell>{r.averageScore}</TableCell>
                        <TableCell>{r.attendanceTaken}</TableCell>
                        <TableCell><Badge>{r.compositeScore}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle>Teacher Performance</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Classes</TableHead>
                    <TableHead>Subjects</TableHead>
                    <TableHead>Avg Score</TableHead>
                    <TableHead>Grading Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teacherQuery.isLoading ? renderSkeletonRows(7) :
                    getData(teacherQuery).length === 0 ? renderEmptyRow(7, "No teacher records found") :
                    getData(teacherQuery).map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.teacherName}</TableCell>
                        <TableCell>{r.department || "-"}</TableCell>
                        <TableCell>{r.totalStudents}</TableCell>
                        <TableCell>{r.totalClasses}</TableCell>
                        <TableCell>{r.totalSubjects}</TableCell>
                        <TableCell>{r.averageScore}</TableCell>
                        <TableCell>{r.gradingRate}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discipline" className="space-y-4">
          {disciplineTrendsQuery.data?.data?.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Discipline Trends</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {disciplineTrendsQuery.data.data.map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell>{r.period || r.label || `Period ${i + 1}`}</TableCell>
                        <TableCell>{r.count ?? 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle>Incidents</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reported By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disciplineQuery.isLoading ? renderSkeletonRows(7) :
                    getData(disciplineQuery).length === 0 ? renderEmptyRow(7, "No incidents found") :
                    getData(disciplineQuery).map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.studentName}</TableCell>
                        <TableCell>{r.className}</TableCell>
                        <TableCell>{r.incidentDate ? new Date(r.incidentDate).toLocaleDateString() : "-"}</TableCell>
                        <TableCell>{r.title}</TableCell>
                        <TableCell>{severityBadge(r.severity)}</TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell>{r.reportedByName}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Daily Collections</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financeDailyQuery.isLoading ? renderSkeletonRows(2) :
                      getData(financeDailyQuery).length === 0 ? renderEmptyRow(2, "No daily data") :
                      getData(financeDailyQuery).map((r: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{r.date ? new Date(r.date).toLocaleDateString() : "-"}</TableCell>
                          <TableCell className="font-medium">{r.amount != null ? `$${r.amount.toFixed(2)}` : "-"}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Monthly Revenue</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financeMonthlyQuery.isLoading ? renderSkeletonRows(2) :
                      getData(financeMonthlyQuery).length === 0 ? renderEmptyRow(2, "No monthly data") :
                      getData(financeMonthlyQuery).map((r: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{r.month || r.label || r.period || "-"}</TableCell>
                          <TableCell className="font-medium">{r.revenue != null ? `$${r.revenue.toFixed(2)}` : r.amount != null ? `$${r.amount.toFixed(2)}` : "-"}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Outstanding Balances</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financeOutstandingQuery.isLoading ? renderSkeletonRows(2) :
                      getData(financeOutstandingQuery).length === 0 ? renderEmptyRow(2, "No outstanding balances") :
                      getData(financeOutstandingQuery).map((r: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{r.studentName || r.name || "-"}</TableCell>
                          <TableCell className="font-medium text-red-600">{r.amount != null ? `$${r.amount.toFixed(2)}` : "-"}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Overdue Fees</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financeOutstandingQuery.isLoading ? renderSkeletonRows(2) :
                      getData(financeOutstandingQuery).length === 0 ? renderEmptyRow(3, "No overdue fees") :
                      getData(financeOutstandingQuery).filter((r: any) => r.overdue).length === 0 && getData(financeOutstandingQuery).length > 0 ? renderEmptyRow(3, "No overdue fees") :
                      getData(financeOutstandingQuery).filter((r: any) => r.overdue).map((r: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{r.studentName || r.name || "-"}</TableCell>
                          <TableCell className="font-medium text-red-600">{r.amount != null ? `$${r.amount.toFixed(2)}` : "-"}</TableCell>
                          <TableCell>{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "-"}</TableCell>
                        </TableRow>
                      ))}
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
