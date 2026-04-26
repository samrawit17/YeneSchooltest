"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { gradingAPI, termsAPI } from "@/lib/api";
import { Filters, useFilters } from "@/components/filters/Filters";
import { toast } from "sonner";
import {
  Trophy,
  TrendingUp,
  Loader2,
  Download,
  Award,
  Medal
} from "lucide-react";

// Shadcn components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface RankingsResult {
  results: Array<{
    rank: number;
    studentName: string;
    rollNumber: string;
    className: string;
    average: number;
    gradeLetter: string;
  }>;
  classAverage: number;
  passRate: number;
  calculated: string;
}

export default function StudentRankingsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [terms, setTerms] = useState<{id: string, name: string}[]>([]);
  const [rankingsResult, setRankingsResult] = useState<RankingsResult | null>(null);

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
      if (termData.length > 0 && !selectedTerm) {
        setSelectedTerm(termData[0].id);
      }
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
        classId: selectedGrade || undefined,
      });
      
      setRankingsResult(res.data);
      toast.success(`Rankings calculated for ${res.data.results?.length || 0} student records`);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || 'Failed to calculate rankings');
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: '🥇', bg: 'bg-yellow-100 text-yellow-800', label: 'Gold' };
    if (rank === 2) return { icon: '🥈', bg: 'bg-gray-100 text-gray-800', label: 'Silver' };
    if (rank === 3) return { icon: '🥉', bg: 'bg-amber-100 text-amber-800', label: 'Bronze' };
    return { icon: `#${rank}`, bg: 'bg-slate-100 text-slate-800', label: '' };
  };

  if (isLoading || !isAuthenticated) return null;

  return (
    <div className="p-6 space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#e35336]">Student Rankings</h1>
          <p className="text-gray-500">Calculate and view student performance rankings</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rankings Configuration</CardTitle>
          <CardDescription>Select parameters to calculate student rankings</CardDescription>
        </CardHeader>
        <CardContent>
          <Filters
            config={{
              academicYear: true,
              term: true,
              grade: true,
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
            <Button onClick={calculateRankings} disabled={loading || !selectedYear} className="bg-amber-600 hover:bg-amber-700">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trophy className="w-4 h-4 mr-2" />}
              Calculate Rankings
            </Button>
          </div>
        </CardContent>
      </Card>

      {rankingsResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Rankings Results
                </CardTitle>
                <CardDescription>
                  {rankingsResult.calculated ? `Calculated on: ${new Date(rankingsResult.calculated).toLocaleString()}` : 'Rankings calculated'}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{rankingsResult.results?.length || 0}</div>
                <div className="text-sm text-gray-500">Total Students</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{rankingsResult.classAverage?.toFixed(1) || '-'}%</div>
                <div className="text-sm text-gray-500">Class Average</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{rankingsResult.passRate || '-'}%</div>
                <div className="text-sm text-gray-500">Pass Rate</div>
              </div>
            </div>
            
            {rankingsResult.results && rankingsResult.results.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Rank</th>
                      <th className="text-left py-3 px-4 font-medium">Student Name</th>
                      <th className="text-left py-3 px-4 font-medium">Roll No.</th>
                      <th className="text-left py-3 px-4 font-medium">Class</th>
                      <th className="text-right py-3 px-4 font-medium">Average</th>
                      <th className="text-right py-3 px-4 font-medium">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingsResult.results.map((result: any, idx: number) => {
                      const badge = getRankBadge(result.rank);
                      return (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${badge.bg}`}>
                              {badge.icon}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium">{result.studentName}</td>
                          <td className="py-3 px-4 text-gray-500">{result.rollNumber || '-'}</td>
                          <td className="py-3 px-4 text-gray-500">{result.className || '-'}</td>
                          <td className="py-3 px-4 text-right font-medium">{result.average?.toFixed(1) || '-'}%</td>
                          <td className="py-3 px-4 text-right">
                            <Badge variant={result.rank <= 3 ? "default" : "outline"}>
                              {result.gradeLetter || '-'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
