"use client";

export const dynamic = "force-dynamic";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BookMarked,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  DoorOpen,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  HelpCircle,
  Key,
  LayoutDashboard,
  Loader2,
  Megaphone,
  MessageSquare,
  School,
  Settings,
  Shield,
  Timer,
  Trophy,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type QuickLink = {
  name: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

type HelpTask = {
  title: string;
  summary: string;
  steps: string[];
  href?: string;
  icon: LucideIcon;
};

type HelpContent = {
  label: string;
  roleSummary: string;
  icon: LucideIcon;
  quickLinks: QuickLink[];
  tasks: HelpTask[];
  supportTips: string[];
};

const helpContentByRole: Record<string, HelpContent> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    roleSummary:
      "Manage schools, subscriptions, admins, and cross-platform settings.",
    icon: Shield,
    quickLinks: [
      {
        name: "Schools",
        href: "/list/schools",
        icon: School,
        description: "Open the school registry and manage school records.",
      },
      {
        name: "School Admins",
        href: "/superadmin/admins",
        icon: UserCog,
        description: "Create and manage school administrator accounts.",
      },
      {
        name: "Subscriptions",
        href: "/superadmin/subscription",
        icon: CreditCard,
        description: "Review subscription plans and billing status.",
      },
      {
        name: "Roles & Permissions",
        href: "/list/roles",
        icon: Shield,
        description: "Review permission structure across the platform.",
      },
    ],
    tasks: [
      {
        title: "Add a new school",
        summary: "Create the school first, then assign its admin user.",
        steps: [
          "Open Schools and create the school profile.",
          "Go to School Admins and create or assign the school admin.",
          "Review subscription setup if the school requires access immediately.",
        ],
        href: "/list/schools",
        icon: School,
      },
      {
        title: "Fix access issues",
        summary: "Start from roles and permissions before checking route pages.",
        steps: [
          "Open Roles & Permissions.",
          "Confirm the role has the required permission set.",
          "If needed, re-check the affected page with that user account.",
        ],
        href: "/list/roles",
        icon: Key,
      },
    ],
    supportTips: [
      "Use school-specific pages for operational work; keep platform actions at the super admin level.",
      "When a page fails for a school user, check both role permissions and school assignment.",
    ],
  },
  ADMIN: {
    label: "Admin",
    roleSummary:
      "Manage academics, students, staff, exams, attendance, announcements, and school setup.",
    icon: UserCog,
    quickLinks: [
      {
        name: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        description: "View school-level metrics and activity.",
      },
      {
        name: "Students",
        href: "/list/students",
        icon: GraduationCap,
        description: "Open the main student records area.",
      },
      {
        name: "Class & Sections",
        href: "/admin/class-sections",
        icon: DoorOpen,
        description: "Manage classes, sections, and subject structure.",
      },
      {
        name: "Attendance",
        href: "/admin/attendance",
        icon: UserCheck,
        description: "Review attendance coverage and missing sessions.",
      },
      {
        name: "Communication Book",
        href: "/list/communications",
        icon: MessageSquare,
        description: "Review and follow up on parent-teacher communications.",
      },
      {
        name: "Announcements",
        href: "/list/announcements",
        icon: Megaphone,
        description: "Create or review school announcements.",
      },
    ],
    tasks: [
      {
        title: "Set up the academic structure",
        summary: "Start with academic years, then classes, sections, and teacher assignments.",
        steps: [
          "Create or activate the academic year.",
          "Configure class and section structure.",
          "Assign teachers and check timetable coverage.",
        ],
        href: "/admin/academic-years",
        icon: Calendar,
      },
      {
        title: "Onboard students",
        summary: "Use enrollment or bulk tools depending on the intake size.",
        steps: [
          "Process admissions through Enrollments for individual intake.",
          "Use Bulk Upload for large imports.",
          "Generate credentials after records are confirmed.",
        ],
        href: "/admin/enrollment",
        icon: UserPlus,
      },
      {
        title: "Publish exam outcomes",
        summary: "Review exam progress before results go live.",
        steps: [
          "Open exam entry progress and confirm mark completion.",
          "Review rankings or reports if needed.",
          "Publish results and generate report cards.",
        ],
        href: "/admin/exams/publish",
        icon: FileSpreadsheet,
      },
    ],
    supportTips: [
      "If a page shows access-denied, check the first API request that page makes, not only the visible route.",
      "Use Communication Book for follow-up cases that need a tracked parent or student history.",
    ],
  },
  IT_MANAGER: {
    label: "IT Manager",
    roleSummary:
      "Handle technical school operations, configurations, academic setup, and support flows.",
    icon: Settings,
    quickLinks: [
      {
        name: "Dashboard",
        href: "/it-manager",
        icon: LayoutDashboard,
        description: "Open the IT operations dashboard.",
      },
      {
        name: "School Settings",
        href: "/settings/school",
        icon: Settings,
        description: "Configure school-level technical settings.",
      },
      {
        name: "Class & Sections",
        href: "/admin/class-sections",
        icon: DoorOpen,
        description: "Maintain structure and related academic mappings.",
      },
      {
        name: "Assignments",
        href: "/admin/assignments",
        icon: UserCheck,
        description: "Review teacher-class assignment coverage.",
      },
      {
        name: "Siren Management",
        href: "/admin/siren-management",
        icon: Timer,
        description: "Manage bell schedules and siren configuration.",
      },
      {
        name: "Credentials",
        href: "/admin/credentials",
        icon: Key,
        description: "Generate and review login credentials.",
      },
    ],
    tasks: [
      {
        title: "Prepare the school for a new term",
        summary: "Check academic-year status, structure, timetable, and assignments.",
        steps: [
          "Verify the active academic year.",
          "Review classes, sections, and subject allocations.",
          "Check timetable and teacher assignments for gaps.",
        ],
        href: "/admin/academic-years",
        icon: Calendar,
      },
      {
        title: "Support login and access issues",
        summary: "Start from credentials, then role permissions, then page-specific checks.",
        steps: [
          "Confirm the user can log in and has the right role.",
          "Review credentials or regenerate them if necessary.",
          "If access still fails, inspect the target page’s role and permission requirements.",
        ],
        href: "/admin/credentials",
        icon: Key,
      },
    ],
    supportTips: [
      "IT Manager should keep academic configuration access, but avoid using people-management pages unless intended by policy.",
      "When a route fails, verify whether the backend gate or the frontend helper request is the first blocker.",
    ],
  },
  REGISTRAR: {
    label: "Registrar",
    roleSummary:
      "Manage student records, enrollment operations, promotions, and grade review workflows.",
    icon: ClipboardList,
    quickLinks: [
      {
        name: "Dashboard",
        href: "/registrar",
        icon: LayoutDashboard,
        description: "Open registrar-focused metrics and workflow status.",
      },
      {
        name: "Students",
        href: "/list/students",
        icon: GraduationCap,
        description: "Manage student records and profiles.",
      },
      {
        name: "Enrollments",
        href: "/admin/enrollment",
        icon: UserPlus,
        description: "Process incoming student admissions.",
      },
      {
        name: "Promotion",
        href: "/admin/promotion",
        icon: Trophy,
        description: "Promote students to the next level.",
      },
      {
        name: "Grade Review",
        href: "/registrar/grading",
        icon: ClipboardCheck,
        description: "Review grading submissions and approval flow.",
      },
      {
        name: "Credentials",
        href: "/admin/credentials",
        icon: Key,
        description: "Generate account credentials for users.",
      },
    ],
    tasks: [
      {
        title: "Process a new student",
        summary: "Move from enrollment approval to full active record setup.",
        steps: [
          "Review and approve the enrollment.",
          "Confirm class placement and supporting details.",
          "Generate credentials if the student account should be active immediately.",
        ],
        href: "/admin/enrollment",
        icon: UserPlus,
      },
      {
        title: "Run student promotion",
        summary: "Review destination classes before applying promotions.",
        steps: [
          "Open Promotion and select the source class.",
          "Verify the destination class and eligible students.",
          "Apply the promotion only after the target structure is confirmed.",
        ],
        href: "/admin/promotion",
        icon: Trophy,
      },
    ],
    supportTips: [
      "Promotion and grading actions are sensitive; confirm academic year and class mapping before saving.",
      "If student class labels look wrong, verify the underlying class and section data instead of editing display text first.",
    ],
  },
  TEACHER: {
    label: "Teacher",
    roleSummary:
      "Manage classes, attendance, lessons, grades, exams, and communication with parents.",
    icon: BookOpen,
    quickLinks: [
      {
        name: "Dashboard",
        href: "/teacher",
        icon: LayoutDashboard,
        description: "Open your classroom summary and recent activity.",
      },
      {
        name: "My Classes",
        href: "/teacher/my-class",
        icon: DoorOpen,
        description: "View assigned classes and students.",
      },
      {
        name: "Attendance",
        href: "/teacher/attendance",
        icon: UserCheck,
        description: "Take and submit attendance for your sessions.",
      },
      {
        name: "Lessons",
        href: "/teacher/lessons",
        icon: BookMarked,
        description: "Create and manage lesson content.",
      },
      {
        name: "Grade Entry",
        href: "/teacher/grading",
        icon: ClipboardCheck,
        description: "Enter and manage student marks.",
      },
      {
        name: "Communication Book",
        href: "/list/communications",
        icon: MessageSquare,
        description: "Send and review parent or student communication.",
      },
    ],
    tasks: [
      {
        title: "Take attendance correctly",
        summary: "Work from the assigned session and submit after review.",
        steps: [
          "Open Attendance from the teacher area.",
          "Select the correct session or class.",
          "Mark records and submit the session after verifying absences and lateness.",
        ],
        href: "/teacher/attendance",
        icon: UserCheck,
      },
      {
        title: "Send a communication note",
        summary: "Use Communication Book for tracked parent or student messaging.",
        steps: [
          "Open Communication Book and start a new message.",
          "Search only for students related to your assigned classes.",
          "Send the note and use the conversation thread for follow-up replies.",
        ],
        href: "/list/communications",
        icon: MessageSquare,
      },
      {
        title: "Enter grades and exam results",
        summary: "Use grading for marks and exam pages for exam-specific work.",
        steps: [
          "Open Grade Entry for continuous assessment or marks entry.",
          "Use the Exams area for exam-specific workflows.",
          "Review values before submission to avoid correction cycles.",
        ],
        href: "/teacher/grading",
        icon: FileText,
      },
    ],
    supportTips: [
      "If a student does not appear in your communication search, verify that the student is in your homeroom or teaching classes.",
      "When attendance or grading looks incomplete, confirm the active academic year and class assignment first.",
    ],
  },
  STUDENT: {
    label: "Student",
    roleSummary:
      "View your classes, lessons, attendance, grades, exams, and fees.",
    icon: GraduationCap,
    quickLinks: [
      {
        name: "Dashboard",
        href: "/student",
        icon: LayoutDashboard,
        description: "Open your personal student overview.",
      },
      {
        name: "Timetable",
        href: "/student/timetable",
        icon: Calendar,
        description: "See your current class schedule.",
      },
      {
        name: "Attendance",
        href: "/student/attendance",
        icon: UserCheck,
        description: "Review your attendance history.",
      },
      {
        name: "Grades",
        href: "/student/grades",
        icon: ClipboardCheck,
        description: "Check your academic results.",
      },
      {
        name: "Lessons",
        href: "/student/lessons",
        icon: BookMarked,
        description: "Open lesson materials and learning content.",
      },
      {
        name: "Fees",
        href: "/student/fees",
        icon: CreditCard,
        description: "View fee information and balances.",
      },
    ],
    tasks: [
      {
        title: "Find your class schedule",
        summary: "Use the timetable page for current periods and planning.",
        steps: [
          "Open Timetable from your student area.",
          "Review the current day or upcoming schedule.",
          "Use Calendar for event-level dates outside normal class periods.",
        ],
        href: "/student/timetable",
        icon: Calendar,
      },
      {
        title: "Check your academic progress",
        summary: "Use grades for marks and exams for formal exam records.",
        steps: [
          "Open Grades for current academic performance.",
          "Check Exams when you need exam-specific records.",
          "Contact your teacher if a result appears missing or incorrect.",
        ],
        href: "/student/grades",
        icon: ClipboardCheck,
      },
    ],
    supportTips: [
      "If a lesson or grade is missing, it may not be published yet.",
      "Use announcements and calendar for school-wide updates outside your class pages.",
    ],
  },
  PARENT: {
    label: "Parent",
    roleSummary:
      "Monitor your children’s grades, attendance, lessons, exams, fees, and communications.",
    icon: Users,
    quickLinks: [
      {
        name: "Dashboard",
        href: "/parent",
        icon: LayoutDashboard,
        description: "Open your parent overview.",
      },
      {
        name: "Children",
        href: "/parent/children",
        icon: Users,
        description: "Review your linked student profiles.",
      },
      {
        name: "Grades",
        href: "/parent/grades",
        icon: ClipboardCheck,
        description: "Check your children’s academic results.",
      },
      {
        name: "Attendance",
        href: "/parent/attendance",
        icon: UserCheck,
        description: "Review attendance history for your children.",
      },
      {
        name: "Fees",
        href: "/parent/fees",
        icon: CreditCard,
        description: "Track fees, balances, and payment history.",
      },
      {
        name: "Communication Book",
        href: "/list/communications",
        icon: MessageSquare,
        description: "Send and review communication with teachers.",
      },
    ],
    tasks: [
      {
        title: "Check your child’s academic status",
        summary: "Use the parent academic pages for results, attendance, and timetable.",
        steps: [
          "Open Grades or Attendance from the parent area.",
          "Switch or review the correct child if you have multiple children.",
          "Use Communication Book for follow-up questions to teachers.",
        ],
        href: "/parent/grades",
        icon: ClipboardCheck,
      },
      {
        title: "Send a message to a teacher",
        summary: "Use Communication Book for trackable school communication.",
        steps: [
          "Open Communication Book.",
          "Choose the related child or conversation.",
          "Send the message and continue replies in the same thread.",
        ],
        href: "/list/communications",
        icon: MessageSquare,
      },
    ],
    supportTips: [
      "If a child is missing from your account, the parent-student relationship may need to be linked in the system.",
      "Use Communication Book for academic follow-up instead of relying only on announcements.",
    ],
  },
  FINANCE: {
    label: "Finance",
    roleSummary:
      "Review fee-related activity, payment workflows, and financial reporting.",
    icon: CreditCard,
    quickLinks: [
      {
        name: "Dashboard",
        href: "/finance",
        icon: LayoutDashboard,
        description: "Open the finance dashboard and reporting overview.",
      },
      {
        name: "Calendar",
        href: "/list/calendar",
        icon: Calendar,
        description: "Review school dates relevant to billing periods.",
      },
      {
        name: "Announcements",
        href: "/list/announcements",
        icon: Megaphone,
        description: "Check school-wide updates that may affect finance work.",
      },
    ],
    tasks: [
      {
        title: "Review financial activity",
        summary: "Use the finance dashboard first before tracing specific records.",
        steps: [
          "Open the finance dashboard.",
          "Review summaries, reports, or due balances.",
          "Coordinate with admin or registrar if the issue depends on student records.",
        ],
        href: "/finance",
        icon: CreditCard,
      },
    ],
    supportTips: [
      "Finance pages depend on clean student and fee structures; verify those before diagnosing report mismatches.",
      "Announcements and calendar can affect collection windows and school operations, so keep them in view.",
    ],
  },
};

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
        {title}
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}

export default function HelpPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-color,#e35336)]" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const normalizedRole = user?.role?.toUpperCase() || "TEACHER";
  const currentRole =
    normalizedRole in helpContentByRole ? normalizedRole : "TEACHER";
  const content = helpContentByRole[currentRole];
  const RoleIcon = content.icon;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="px-6 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(var(--brand-color-rgb),0.14)]">
              <HelpCircle className="h-6 w-6 text-[var(--brand-color,#e35336)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--brand-color,#e35336)]">
                Help Center
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                Role-specific guidance for common tasks, quick access pages,
                and the best place to start when something is blocked.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-[rgba(var(--brand-color-rgb),0.18)] bg-white px-4 py-3 shadow-sm dark:bg-slate-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(var(--brand-color-rgb),0.14)]">
              <RoleIcon className="h-5 w-5 text-[var(--brand-color,#e35336)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {content.label}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {content.roleSummary}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-6 pb-6">
        <Card className="border-[rgba(var(--brand-color-rgb),0.16)] bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="grid gap-4 p-5 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[var(--brand-color,#e35336)]" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Best for
                </p>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Use this page when you need the right starting point for your
                role instead of browsing the whole menu.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[var(--brand-color,#e35336)]" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  If a page is blocked
                </p>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Confirm your role, then check whether the issue is the page
                itself or the first request it makes in the background.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[var(--brand-color,#e35336)]" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  For follow-up
                </p>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Use Communication Book for tracked academic follow-up instead of
                relying on generic announcements.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="pb-2">
            <SectionHeader
              title="Common Tasks"
              description="Start here when you need to complete something, not just open a page."
            />
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-3">
            {content.tasks.map((task) => {
              const TaskIcon = task.icon;

              return (
                <div
                  key={task.title}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40"
                >
                  <div className="mb-3 flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(var(--brand-color-rgb),0.14)]">
                      <TaskIcon className="h-5 w-5 text-[var(--brand-color,#e35336)]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {task.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {task.summary}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {task.steps.map((step, index) => (
                      <div key={step} className="flex gap-3">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(var(--brand-color-rgb),0.12)] text-[11px] font-semibold text-[var(--brand-color,#e35336)]">
                          {index + 1}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>

                  {task.href ? (
                    <Link
                      href={task.href}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--brand-color,#e35336)]"
                    >
                      Open task page
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="pb-2">
            <SectionHeader
              title="Quick Access"
              description="Jump into your main working pages without exposing unrelated admin routes."
            />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {content.quickLinks.map((item) => {
                const ItemIcon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:bg-slate-800/60"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 transition-colors group-hover:bg-[rgba(var(--brand-color-rgb),0.14)] dark:bg-slate-800">
                      <ItemIcon className="h-5 w-5 text-slate-600 transition-colors group-hover:text-[var(--brand-color,#e35336)] dark:text-slate-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {item.name}
                        </p>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="pb-2">
            <SectionHeader
              title="Support Tips"
              description="Short operational guidance for common failure cases."
            />
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-2">
            {content.supportTips.map((tip) => (
              <div
                key={tip}
                className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-color,#e35336)]" />
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {tip}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
