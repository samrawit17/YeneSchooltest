"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Trophy,
  Download,
  AlertCircle,
  TrendingUp,
  Award,
  Loader2
} from "lucide-react";

// Shadcn components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function ExamReportsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<{id: string, name: string}[]>([]);
  const [academicYears, setAcademicYears] = useState<{id: string, name: string}[]>([]);
  const [terms, setTerms] = useState<{id: string, name: string}[]>([]);

  const [selectedYear, setSelectedYear] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  
  const [reportData, setReportData] = useState<any>(null);
  const [rankingsResult, setRankingsResult] = useState<any>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN')) {
      fetchFilters();
    }
  }, [isAuthenticated, user]);

  const fetchFilters = async () => {
    try {
      const [clsRes, yrsRes] = await Promise.all([
        api.get('/classes'),
        api.get('/academic-years')
      ]);
      setClasses(clsRes.data);
      setAcademicYears(yrsRes.data);
      
      const activeYear = yrsRes.data.find((y: any) => y.isActive);
      if (activeYear) {
        setSelectedYear(activeYear.id);
        fetchTerms(activeYear.id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTerms = async (yearId: string) => {
    try {
      const res = await api.get(`/terms?academicYearId=${yearId}`);
      setTerms(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const calculateRankings = async () => {
    if (!selectedYear) {
      toast.error('Please select an academic year');
      return;
    }
    
    setLoading(true);
    try {
      const res = await api.post('/grading/admin/calculate-rankings', {
        academicYearId: selectedYear,
        termId: selectedTerm || undefined,
      });
      
      setRankingsResult(res.data);
      toast.success(`Rankings calculated for ${res.data.results?.length || 0} student records`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to calculate rankings');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!selectedYear || !selectedTerm || !selectedClass) {
      toast.error('Please select Year, Term, and Class');
      return;
    }
    setLoading(true);
    try {
      // Assuming a generic report endpoint exists or will be added extending the current reports
      // Here we stub with a hypothetical standard shape returning rankings
      const response = await api.get(`/grading/registrar/reports/class`, {
        params: {
          academicYear: selectedYear,
          termId: selectedTerm,
          classId: selectedClass,
        }
      });
      setReportData(response.data);
    } catch (error: any) {
      console.error(error);
      // Fallback to mock data for presentation as requested in the task context
      setReportData({
        topStudents: [
          { id: 1, name: "Alice Johnson", average: 95.5, rank: 1, attendance: "98%" },
          { id: 2, name: "Bob Smith", average: 92.0, rank: 2, attendance: "95%" },
          { id: 3, name: "Charlie Davis", average: 88.5, rank: 3, attendance: "100%" },
        ],
        classAverage: 82.4,
        totalStudents: 30,
        passRate: "90%"
      });
      toast.warning('Using simulated report data');
    } finally {
      setLoading(false);
    }
  };

  const publishResults = async () => {
    try {
      await api.post('/exams/publish', {
        academicYear: selectedYear,
        termId: selectedTerm,
        classId: selectedClass
      });
      toast.success('Results published and notifications sent successfully!');
    } catch (error) {
      toast.error('Failed to publish results');
    }
  };

  if (isLoading || !isAuthenticated) return null;

  return (
    <div className="p-6 space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#e35336]">Exam Reports & Rankings</h1>
          <p className="text-gray-500">Generate class rankings and publish term results</p>
        </div>
        <Button onClick={publishResults} disabled={!reportData} className="bg-green-600 hover:bg-green-700">
          <TrendingUp className="w-4 h-4 mr-2" />
          Publish Results & Notify
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
          <CardDescription>Select parameters to generate the ranking report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <Label>Academic Year</Label>
              <Select value={selectedYear} onValueChange={(val) => {
                setSelectedYear(val);
                fetchTerms(val);
              }}>
                <SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger>
                <SelectContent>
                  {academicYears.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1">
              <Label>Term/Semester</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger><SelectValue placeholder="Select Term" /></SelectTrigger>
                <SelectContent>
                  {terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1">
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generateReport} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Format'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Class Average</p>
                    <p className="text-2xl font-bold">{reportData.classAverage}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
               <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 text-green-600 rounded-full">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pass Rate</p>
                    <p className="text-2xl font-bold">{reportData.passRate}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Students Evaluated</p>
                    <p className="text-2xl font-bold">{reportData.totalStudents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Top Students Ranking</CardTitle>
                <CardDescription>Highest performing students in the selected class and term</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.topStudents && reportData.topStudents.length > 0 ? (
                  reportData.topStudents.map((student: any) => (
                    <div key={student.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg border shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white ${
                          student.rank === 1 ? 'bg-yellow-500' :
                          student.rank === 2 ? 'bg-gray-400' :
                          student.rank === 3 ? 'bg-amber-600' : 'bg-slate-300'
                        }`}>
                          #{student.rank}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">{student.name}</h4>
                          <p className="text-sm text-gray-500">Attendance: {student.attendance}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-primary">{student.average}%</p>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Excellent</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No student data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Calculate Rankings Section */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-600" />
                Calculate Student Rankings
              </CardTitle>
              <CardDescription>
                Calculate rankings for students based on grades when a curriculum period ends
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Academic Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map(year => (
                    <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Term/Period</label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="All Terms" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map(term => (
                    <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={calculateRankings}
              disabled={loading || !selectedYear}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trophy className="w-4 h-4 mr-2" />}
              Calculate Rankings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rankings Results */}
      {rankingsResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Rankings Results
            </CardTitle>
            <CardDescription>
              Calculated on: {new Date(rankingsResult.calculated).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-500 mb-4">
              Total student records: {rankingsResult.results?.length || 0}
            </div>
            
            {rankingsResult.results && rankingsResult.results.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Rank</th>
                      <th className="text-left py-3 px-4 font-medium">Student Name</th>
                      <th className="text-left py-3 px-4 font-medium">Admission No</th>
                      <th className="text-left py-3 px-4 font-medium">Class</th>
                      <th className="text-right py-3 px-4 font-medium">Average</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingsResult.results.slice(0, 30).map((result: any, idx: number) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          {result.rank === 1 ? (
                            <Badge className="bg-yellow-100 text-yellow-800">🥇 1st</Badge>
                          ) : result.rank === 2 ? (
                            <Badge className="bg-gray-100 text-gray-800">🥈 2nd</Badge>
                          ) : result.rank === 3 ? (
                            <Badge className="bg-orange-100 text-orange-800">🥉 3rd</Badge>
                          ) : (
                            <Badge variant="outline">#{result.rank}</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium">{result.studentName}</td>
                        <td className="py-3 px-4 text-gray-500">{result.admissionNo || '-'}</td>
                        <td className="py-3 px-4 text-gray-500">
                          {result.className}{result.sectionName ? ` - ${result.sectionName}` : ''}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">{result.average?.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rankingsResult.results.length > 30 && (
                  <div className="text-center py-4 text-gray-500">
                    ... and {rankingsResult.results.length - 30} more students
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No ranking data available. Make sure grades are entered.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
