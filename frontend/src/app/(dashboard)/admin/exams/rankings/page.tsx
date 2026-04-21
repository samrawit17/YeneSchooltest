"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Trophy,
  TrendingUp,
  Loader2
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function StudentRankingsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [academicYears, setAcademicYears] = useState<{id: string, name: string}[]>([]);
  const [terms, setTerms] = useState<{id: string, name: string}[]>([]);

  const [selectedYear, setSelectedYear] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
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
      const yrsRes = await api.get('/academic-years');
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

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [classes, setClasses] = useState<{id: string, name: string}[]>([]);
  const [sections, setSections] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN')) {
      fetchFilters();
      fetchClasses();
    }
  }, [isAuthenticated, user]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      // Store all classes as is, but filter only for unique display names if needed
      // Actually, to get all sections for a class name, we need to know all IDs associated with that name.
      setClasses(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchSections = async (className: string) => {
    try {
      // Find all class IDs that share the same name
      const targetClasses = classes.filter(c => c.name === className);
      const classIds = targetClasses.map(c => c.id).join(',');
      
      if (classIds) {
        console.log("Fetching sections for classIds:", classIds);
        const res = await api.get(`/sections?classIds=${classIds}`);
        console.log("Sections response:", res.data);
        setSections(res.data);
      } else {
        setSections([]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getUniqueClassNames = () => {
    const names = new Set(classes.map(c => c.name));
    return Array.from(names);
  };

  const calculateRankings = async () => {
    if (!selectedYear) {
      toast.error('Please select an academic year');
      return;
    }
    
    setLoading(true);
    try {
      // Find all IDs associated with the selected class name
      const targetClassIds = selectedClass ? classes.filter(c => c.name === selectedClass).map(c => c.id).join(',') : undefined;

      const res = await api.post('/grading/admin/calculate-rankings', {
        academicYearId: selectedYear,
        termId: selectedTerm || undefined,
        classIds: targetClassIds, // Changed to plural to handle multiple IDs
        sectionId: selectedSection || undefined,
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
                <SelectTrigger><SelectValue placeholder="All Terms" /></SelectTrigger>
                <SelectContent>
                  {terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1">
              <Label>Grade/Class</Label>
              <Select value={selectedClass} onValueChange={(val) => {
                setSelectedClass(val);
                fetchSections(val);
                setSelectedSection("");
              }}>
                <SelectTrigger><SelectValue placeholder="All Classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {getUniqueClassNames().map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1">
              <Label>Section</Label>
              <Select value={selectedSection || "all"} onValueChange={(val) => setSelectedSection(val === "all" ? "" : val)} disabled={!selectedClass}>
                <SelectTrigger><SelectValue placeholder="All Sections" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
                      <th className="text-left py-3 px-4 font-medium">Subject Results</th>
                      <th className="text-right py-3 px-4 font-medium">GPA</th>
                      <th className="text-right py-3 px-4 font-medium">Average</th>
                      <th className="text-right py-3 px-4 font-medium">Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingsResult.results.map((result: any, idx: number) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <Badge variant={result.rank <= 3 ? "default" : "outline"}>#{result.rank}</Badge>
                        </td>
                        <td className="py-3 px-4 font-medium">{result.studentName}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {result.subjects?.map((s: any, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {s.name}: {s.score}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">{result.gpa?.toFixed(2) || '-'}</td>
                        <td className="py-3 px-4 text-right font-medium">{result.average?.toFixed(1)}%</td>
                        <td className="py-3 px-4 text-right">{result.performanceRange || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No ranking data available.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
