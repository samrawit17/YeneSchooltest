"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { gradingAPI } from "@/lib/api";
import { Filters, useFilters } from "@/components/filters/Filters";
import { termsAPI } from "@/lib/api";
import { toast } from "sonner";
import {
  Download,
  TrendingUp,
  Loader2,
  FileText,
  Award,
  Trophy
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface RankingsResult {
  results: { rank: number; studentName: string; rollNumber: string; className: string; average: number; gradeLetter: string }[];
  classAverage: number;
  passRate: number;
  totalStudents: number;
  topStudents: Array<{ id: string; name: string; rank: number; average: number; attendance: number }>;
  calculated: string;
}

export default function ExamReportsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [terms, setTerms] = useState<{id: string, name: string}[]>([]);
  
  const [reportData, setReportData] = useState<RankingsResult | null>(null);

  const {
    selectedYear,
    setSelectedYear,
    selectedTerm,
    setSelectedTerm,
    selectedGrade,
    setSelectedGrade,
    selectedSection,
    setSelectedSection,
  } = useFilters({
    academicYear: true,
    grade: true,
    section: true,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch terms when year changes
  useEffect(() => {
    if (selectedYear) {
      fetchTerms();
    }
  }, [selectedYear]);

  const fetchTerms = async () => {
    try {
      const res = await termsAPI.getAll({ academicYearId: selectedYear });
      const termData = Array.isArray(res.data) ? res.data : (res.data.data || []);
      setTerms(termData);
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
      const res = await gradingAPI.calculateRankings({
        academicYearId: selectedYear,
        termId: selectedTerm || undefined,
      });
      
      setReportData(res.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to calculate rankings');
    } finally {
      setLoading(false);
    }
  };

const generateReport = async () => {
    if (!selectedYear || !selectedTerm) {
      toast.error('Please select Academic Year and Term');
      return;
    }
    
    setLoading(true);
    setReportData(null);
    try {
      const res = await gradingAPI.calculateRankings({
        academicYearId: selectedYear,
        termId: selectedTerm,
        classId: selectedGrade || undefined,
      });
      
      setReportData(res.data);
      toast.success(`Generated report for ${res.data.results?.length || 0} student records`);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const publishResults = async () => {
    if (!selectedYear || !selectedTerm) {
      toast.error('Please select Academic Year and Term');
      return;
    }
    try {
      const res = await gradingAPI.publishResults({
        academicYear: selectedYear,
        termId: selectedTerm,
        classId: selectedGrade || undefined,
      });
      toast.success('Results published and notifications sent successfully!');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to publish results');
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
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={!selectedYear || !selectedTerm || !reportData} className="bg-green-600 hover:bg-green-700">
              <TrendingUp className="w-4 h-4 mr-2" />
              Publish Results & Notify
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Publish Results</AlertDialogTitle>
              <AlertDialogDescription>
                This will publish results and send notifications to all parents. This action cannot be undone. Are you sure you want to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={publishResults} className="bg-green-600 hover:bg-green-700">
                Publish & Notify
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
          <CardDescription>Select parameters to generate the ranking report</CardDescription>
        </CardHeader>
        <CardContent>
          <Filters
            config={{
              academicYear: true,
              grade: true,
              term: true,
              section: true,
            }}
            selectedYear={selectedYear}
            onYearChange={(val) => { setSelectedYear(val); setSelectedTerm(""); }}
            selectedTerm={selectedTerm}
            onTermChange={setSelectedTerm}
            termOptions={terms}
            selectedGrade={selectedGrade}
            onGradeChange={(val) => { setSelectedGrade(val); if (!val) setSelectedSection(""); }}
            selectedSection={selectedSection}
            onSectionChange={setSelectedSection}
            className="w-full"
          />
          <div className="mt-4 flex justify-end">
            <Button onClick={generateReport} disabled={loading || !selectedYear || !selectedTerm}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
              {loading ? 'Generating...' : 'Generate Report'}
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
                    <p className="text-2xl font-bold">{reportData.passRate}%</p>
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
              <Button variant="outline" size="sm" disabled title="Export PDF coming soon">
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
    </div>
  );
}
