"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { teachersAPI } from "@/lib/api";
import { toast } from "sonner";
import TableSearch from "@/components/TableSearch";
import {
  BookOpen,
  Users,
  Calendar,
  Clock,
  Eye,
  Edit,
  Plus,
  Search,
  MoreVertical,
  MapPin,
  Loader2
} from "lucide-react";

// Shadcn/ui Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TeacherClass {
  id: string;
  classSubjectId: string;
  name: string;
  grade: number;
  section: string;
  subject: string;
  subjectCode?: string;
  studentCount: number;
  schedule: string;
  room: string;
  type: 'homeroom' | 'teaching';
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MyClassesPage = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { setItems } = useBreadcrumb();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [filterSubject, setFilterSubject] = useState<string>("all");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && !isLoading && user?.id) {
      fetchClasses();
    }
  }, [isAuthenticated, isLoading, user?.id]);

  useEffect(() => {
    setItems([
      { label: "Dashboard", href: "/dashboard", isCurrent: false },
      { label: "My Classes", isCurrent: true },
    ]);
    return () => setItems(null);
  }, [setItems]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      
      // Fetch teacher's assignments (both homeroom and teaching)
      const response = await teachersAPI.getMyAssignments();
      const { homeroomClasses, homeroomSections, teachingAssignments } = response.data || {
        homeroomClasses: [],
        homeroomSections: [],
        teachingAssignments: []
      };
      
      const classesWithSchedule: TeacherClass[] = [];
      
      // Process homeroom assignments by section (fallback to class-level if needed)
      if (homeroomSections.length > 0) {
        for (const hs of homeroomSections) {
          const hc = hs.class;
          if (!hc) continue;

          let schedule = 'Not scheduled';
          let room = hs.roomNumber || 'TBD';

          const classTeachingAssignments = teachingAssignments.filter(
            (ta: any) => ta.class?.id === hc.id && (ta.section?.id === hs.id || ta.section?.name === hs.name)
          );

          if (classTeachingAssignments.length > 0) {
            const slotStrs = classTeachingAssignments.map((s: any) =>
              `${DAYS[s.dayOfWeek]} ${s.startTime}-${s.endTime}`
            );
            schedule = slotStrs.join(', ');
            room = classTeachingAssignments[0].room || room;
          }

          classesWithSchedule.push({
            id: hc.id,
            classSubjectId: '',
            name: hc.name,
            grade: hc.grade,
            section: hs.name || hc.section || 'A',
            subject: 'Homeroom',
            subjectCode: undefined,
            studentCount: hs.studentCount || 0,
            schedule,
            room,
            type: 'homeroom'
          });
        }
      } else {
        for (const hc of homeroomClasses) {
        // Get schedule from timetable slots for this homeroom class
        let schedule = 'Not scheduled';
        let room = 'TBD';
        
        // Find teaching assignments for this class
        const classTeachingAssignments = teachingAssignments.filter(
          (ta: any) => ta.class?.id === hc.id
        );
        
        if (classTeachingAssignments.length > 0) {
          const slotStrs = classTeachingAssignments.map((s: any) => 
            `${DAYS[s.dayOfWeek]} ${s.startTime}-${s.endTime}`
          );
          schedule = slotStrs.join(', ');
          room = classTeachingAssignments[0].room || 'TBD';
        }
        
        classesWithSchedule.push({
          id: hc.id,
          classSubjectId: '',
          name: hc.name,
          grade: hc.grade,
          section: hc.section || 'All',
          subject: 'Homeroom',
          subjectCode: undefined,
          studentCount: hc.studentCount || 0,
          schedule,
          room,
          type: 'homeroom'
        });
      }
      }
      
      // Process teaching assignments from timetable
      // Group by class ID to combine all schedules for the same class
      const teachingByClass = new Map();
      for (const ta of teachingAssignments) {
        const classId = ta.class?.id;
        if (!teachingByClass.has(classId)) {
          teachingByClass.set(classId, {
            class: ta.class,
            slots: [],
            subjects: new Set()
          });
        }
        const entry = teachingByClass.get(classId);
        entry.slots.push(ta);
        if (ta.subject?.name) {
          entry.subjects.add(ta.subject.name);
        }
      }
      
      for (const [classId, data] of teachingByClass) {
        const ta = data.slots[0];
        // Skip if we already added this class as homeroom
        const existingHomeroom = classesWithSchedule.find(
          c => c.id === ta.class?.id && c.type === 'homeroom'
        );
        
        if (!existingHomeroom) {
          // Combine all schedules for this class
          const slotStrs = data.slots.map((s: any) => 
            `${DAYS[s.dayOfWeek]} ${s.startTime}-${s.endTime}`
          ).sort();
          const subjects = Array.from(data.subjects).join(', ');
          
          classesWithSchedule.push({
            id: ta.class?.id,
            classSubjectId: ta.id,
            name: ta.class?.name || 'Unknown',
            grade: ta.class?.grade || 0,
            section: ta.class?.section || 'N/A',
            subject: subjects || ta.subject?.name || 'Unknown',
            subjectCode: ta.subject?.code,
            studentCount: 0,
            schedule: slotStrs.join(', '),
            room: ta.room || 'TBD',
            type: 'teaching'
          });
        }
      }
      
      setClasses(classesWithSchedule);
    } catch (error: any) {
      console.error('Failed to fetch classes:', error);
      toast.error('Failed to load classes');
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  const setMockData = () => {
    setClasses([
      { id: '1', classSubjectId: 'cs1', name: '5A', grade: 5, section: 'A', subject: 'Mathematics', studentCount: 25, schedule: 'Monday 09:00-10:00', room: 'Room 101', type: 'teaching' },
      { id: '2', classSubjectId: 'cs2', name: '5B', grade: 5, section: 'B', subject: 'Mathematics', studentCount: 22, schedule: 'Monday 10:30-11:30', room: 'Room 102', type: 'teaching' },
      { id: '3', classSubjectId: 'cs3', name: '6A', grade: 6, section: 'A', subject: 'Physics', studentCount: 28, schedule: 'Tuesday 13:00-14:00', room: 'Lab 1', type: 'homeroom' },
      { id: '4', classSubjectId: 'cs4', name: '6B', grade: 6, section: 'B', subject: 'Physics', studentCount: 24, schedule: 'Tuesday 14:30-15:30', room: 'Lab 1', type: 'teaching' },
      { id: '5', classSubjectId: 'cs5', name: '7A', grade: 7, section: 'A', subject: 'Mathematics', studentCount: 20, schedule: 'Wednesday 09:00-10:00', room: 'Room 201', type: 'teaching' },
      { id: '6', classSubjectId: 'cs6', name: '7B', grade: 7, section: 'B', subject: 'Physics', studentCount: 18, schedule: 'Thursday 11:00-12:00', room: 'Lab 2', type: 'homeroom' },
    ]);
  };

  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cls.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = filterGrade === "all" || cls.grade.toString() === filterGrade;
    const matchesSubject = filterSubject === "all" || cls.subject === filterSubject;
    return matchesSearch && matchesGrade && matchesSubject;
  });

  const grades = Array.from(new Set(classes.map(cls => cls.grade))).sort((a, b) => a - b);
  const subjects = Array.from(new Set(classes.map(cls => cls.subject))).sort();

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-[#e35336]" />
          <p className="text-gray-500 dark:text-gray-400">Loading classes...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="p-6 space-y-6 bg-[#F8FAFC] dark:bg-[#0F172A]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#e35336]">My Classes</h1>
          <p className="text-gray-500">Manage your assigned classes and subjects</p>
        </div>
        <Button onClick={() => router.push('/teacher/timetable')}>
          <Calendar className="w-4 h-4 mr-2" />
          View Timetable
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Classes</p>
                <p className="text-2xl font-bold">{classes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Students</p>
                <p className="text-2xl font-bold">{classes.reduce((acc, cls) => acc + cls.studentCount, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Subjects</p>
                <p className="text-2xl font-bold">{subjects.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Grades</p>
                <p className="text-2xl font-bold">{grades.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <TableSearch
          search={searchTerm}
          setSearch={setSearchTerm}
          placeholder="Search classes or subjects..."
          className="flex-1"
        />
        <Select value={filterGrade} onValueChange={setFilterGrade}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by grade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {grades.map(grade => (
              <SelectItem key={grade} value={grade.toString()}>Grade {grade}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map(subject => (
              <SelectItem key={subject} value={subject}>{subject}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Classes Grid */}
      {filteredClasses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((cls) => (
            <Card key={`${cls.id}-${cls.section}-${cls.type}`} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="bg-blue-100 w-12 h-12">
                      <AvatarFallback className="text-blue-600 font-bold text-lg">
                        {cls.grade}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">Class {cls.name}</CardTitle>
                      <CardDescription>Grade {cls.grade} • Section {cls.section}</CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push(`/teacher/my-class/${cls.id}`)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      {cls.type === 'homeroom' && (
                        <DropdownMenuItem onClick={() => router.push(`/teacher/attendance?slotId=${cls.id}`)}>
                          <Calendar className="w-4 h-4 mr-2" />
                          Take Attendance
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => router.push('/teacher/timetable')}>
                        <Clock className="w-4 h-4 mr-2" />
                        View Timetable
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Type</span>
                    <Badge variant={cls.type === 'homeroom' ? 'default' : 'secondary'}>
                      {cls.type === 'homeroom' ? 'Homeroom' : 'Teaching'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Subject</span>
                    <Badge variant="outline">
                      {cls.subject}
                      {cls.subjectCode && ` (${cls.subjectCode})`}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Students</span>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{cls.studentCount}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Schedule</span>
                    <span className="font-medium text-xs">{cls.schedule}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Room</span>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{cls.room}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => router.push(`/teacher/my-class/${cls.id}`)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  {cls.type === 'homeroom' && (
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => router.push(`/teacher/attendance?slotId=${cls.id}`)}
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Attendance
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No classes found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || filterGrade !== 'all' || filterSubject !== 'all'
                  ? 'Try adjusting your filters'
                  : 'You have not been assigned to any classes yet'}
              </p>
              {(searchTerm || filterGrade !== 'all' || filterSubject !== 'all') && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setFilterGrade('all');
                    setFilterSubject('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MyClassesPage;
