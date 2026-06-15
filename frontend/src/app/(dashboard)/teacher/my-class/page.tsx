"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { academicYearsAPI, teachersAPI } from "@/lib/api";
import { toast } from "sonner";
import {
  BookOpen,
  Users,
  Calendar,
  Clock,
  Eye,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TeacherClass {
  id: string;
  sectionId?: string;
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

interface TeachingClassAssignment {
  id: string;
  class?: {
    id: string;
    name: string;
    grade: number;
    section?: string;
  };
  section?: {
    id: string;
    name: string;
  };
  subject?: {
    id: string;
    name: string;
    code?: string;
  };
  room?: string;
  studentCount?: number;
  schedules?: string[];
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MyClassesPage = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { setItems } = useBreadcrumb();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);

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

      let activeYear = "";
      try {
        const resp = await academicYearsAPI.getActive();
        const active = resp.data?.data || resp.data;
        activeYear = active?.name || "";
      } catch {
        // fallback — fetch all and take the first
        const allResp = await academicYearsAPI.getAll();
        const years = allResp.data?.data || allResp.data || [];
        if (Array.isArray(years) && years.length > 0) activeYear = years[0]?.name || "";
      }

      const response = await teachersAPI.getMyAssignments(activeYear || undefined);
      const { homeroomClasses, homeroomSections, teachingAssignments, teachingClasses } = response.data || {
        homeroomClasses: [],
        homeroomSections: [],
        teachingAssignments: [],
        teachingClasses: [],
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
            sectionId: hs.id,
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
          sectionId: undefined,
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
      
      // Process normalized teaching assignments from backend.
      for (const ta of (teachingClasses || []) as TeachingClassAssignment[]) {
        const schedule = (ta.schedules || [])
          .map((slot) => {
            const [dayOfWeek, time] = slot.split("|");
            const dayLabel = DAYS[Number(dayOfWeek)] || "Scheduled";
            return `${dayLabel} ${time}`;
          })
          .join(", ");

        classesWithSchedule.push({
          id: ta.class?.id || ta.id,
          sectionId: ta.section?.id,
          classSubjectId: ta.id,
          name: ta.class?.name || "Unknown",
          grade: ta.class?.grade || 0,
          section: ta.section?.name || ta.class?.section || "N/A",
          subject: ta.subject?.name || "Unknown",
          subjectCode: ta.subject?.code,
          studentCount: ta.studentCount || 0,
          schedule: schedule || "Not scheduled",
          room: ta.room || "TBD",
          type: "teaching",
        });
      }
      
      setClasses(classesWithSchedule);
    } catch (error: any) {
      console.error('Failed to fetch classes:', error);
      toast.error('Failed to load classes');
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-[var(--brand-color,#e35336)]" />
          <p className="text-gray-500 dark:text-gray-400">Loading classes...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="p-6 space-y-6 bg-[#F8FAFC] dark:bg-[#111111]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">My Classes</h1>
          <p className="text-gray-500">Manage your assigned classes and subjects</p>
        </div>
        <Button onClick={() => router.push('/teacher/timetable')}>
          <Calendar className="w-4 h-4 mr-2" />
          View Timetable
        </Button>
      </div>

      {/* Classes Grid */}
      {classes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <Card key={`${cls.id}-${cls.section}-${cls.type}`} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="bg-blue-100 w-12 h-12">
                      <AvatarFallback className="font-bold text-lg">
                        {cls.grade}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Class {cls.name}</CardTitle>
                      <CardDescription className="text-sm font-medium text-gray-600 dark:text-gray-400">Grade {cls.grade} • Section {cls.section}</CardDescription>
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
                      <DropdownMenuItem onClick={() => router.push(`/teacher/my-class/${cls.id}${cls.sectionId ? `?sectionId=${cls.sectionId}` : ""}`)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      {cls.type === 'homeroom' && (
                        <DropdownMenuItem onClick={() => router.push(`/teacher/attendance?classId=${cls.id}${cls.sectionId ? `&sectionId=${cls.sectionId}` : ""}`)}>
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
                    onClick={() => router.push(`/teacher/my-class/${cls.id}${cls.sectionId ? `?sectionId=${cls.sectionId}` : ""}`)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  {cls.type === 'homeroom' && (
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => router.push(`/teacher/attendance?classId=${cls.id}${cls.sectionId ? `&sectionId=${cls.sectionId}` : ""}`)}
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
                You have not been assigned to any classes yet
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MyClassesPage;
