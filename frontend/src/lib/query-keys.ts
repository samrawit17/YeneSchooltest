export const queryKeys = {
  academicYears: {
    all: ["academic-years"] as const,
    list: (schoolId?: string) =>
      schoolId
        ? (["academic-years", schoolId] as const)
        : (["academic-years"] as const),
    active: (schoolId?: string) => ["active-academic-year", schoolId] as const,
    allForSchool: (schoolId?: string) => ["all-academic-years", schoolId] as const,
    currentState: ["academic-year-active"] as const,
  },
  announcements: {
    all: ["announcements"] as const,
    list: (role?: string) => ["announcements", role] as const,
    detail: (id: string) => ["announcement", id] as const,
    activeCount: (userId?: string, role?: string) =>
      ["announcement-count", userId, role] as const,
    menuCount: (userId?: string, schoolId?: string, roleKey?: string) =>
      ["announcements-count-menu", userId, schoolId, roleKey] as const,
  },
  classes: {
    all: ["classes"] as const,
    byAcademicYear: (academicYearId?: string) => ["classes", academicYearId] as const,
  },
  classSubjects: {
    all: ["class-subjects"] as const,
    bySelection: (classId?: string, sectionId?: string) =>
      ["class-subjects", classId, sectionId] as const,
  },
  messages: {
    conversations: (userId?: string, schoolId?: string) =>
      ["messaging-conversations", userId, schoolId] as const,
    conversationMessages: (conversationId?: string | null, userId?: string) =>
      ["messaging-messages", conversationId, userId] as const,
    messagesRoot: ["messaging-messages"] as const,
    conversationsRoot: ["messaging-conversations"] as const,
    staff: (
      userId?: string,
      schoolId?: string,
      search?: string,
      dialogOpen?: boolean
    ) => ["messaging-staff", userId, schoolId, search, dialogOpen] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: (userId?: string, schoolId?: string) =>
      ["notifications", userId, schoolId] as const,
    allPage: (userId?: string, schoolId?: string) =>
      ["notifications", "all", userId, schoolId] as const,
    category: (category: string) => ["notifications", category] as const,
    categories: ["notification-categories"] as const,
  },
  parents: {
    all: ["parents"] as const,
    detail: (parentId: string) => ["parent", parentId] as const,
    profile: (parentId?: string) => ["parent-profile", parentId] as const,
  },
  school: {
    detail: (schoolId?: string) => ["school", schoolId] as const,
    layout: (schoolId?: string) => ["school-layout", schoolId] as const,
    menu: (schoolId?: string) => ["school-menu", schoolId] as const,
    planMenu: (schoolId?: string) => ["school-plan-menu", schoolId] as const,
    settings: (schoolId?: string) => ["school-settings", schoolId] as const,
    curriculum: (schoolId?: string) => ["school-settings-curriculum", schoolId] as const,
    curriculumForm: (schoolId?: string) => ["school-settings-curriculum-form", schoolId] as const,
    curriculumTermForm: (schoolId?: string) => ["school-settings-curriculum-term-form", schoolId] as const,
    timetableSlotForm: (schoolId?: string) => ["school-settings-timetable-slot-form", schoolId] as const,
    classForm: ["school-settings-class-form"] as const,
    calendarSetting: (schoolId?: string) => ["school-calendar-setting", schoolId] as const,
    gradeLevels: (schoolId?: string) => ["school-grade-levels", schoolId] as const,
    setting: (key?: string, schoolId?: string) => ["schoolSetting", key, schoolId] as const,
  },
  schools: {
    all: ["schools"] as const,
    list: (page?: number | string) => ["schools", page] as const,
    detail: (schoolId?: string) => ["school", schoolId] as const,
  },
  sections: {
    all: ["sections"] as const,
    byClass: (classId?: string) => ["sections", classId] as const,
  },
  students: {
    all: ["students"] as const,
    list: (
      page?: number | string,
      search?: string,
      status?: string,
      grade?: string,
      section?: string,
      year?: string,
      schoolId?: string
    ) => ["students", schoolId, page, search, status, grade, section, year] as const,
    approved: (search?: string) => ["students", "approved", search] as const,
    detail: (studentId?: string) => ["student", studentId] as const,
    attendance: (studentId?: string) => ["studentAttendance", studentId] as const,
    fees: (studentId?: string, schoolId?: string) =>
      ["studentFees", studentId, schoolId] as const,
  },
  subjects: {
    all: ["subjects"] as const,
    academic: ["academic-subjects"] as const,
  },
  timetableSlots: {
    all: ["timetable-slots"] as const,
  },
  events: {
    all: ["events"] as const,
    calendarFeed: ["events", "calendar-feed"] as const,
    navbar: ["events-navbar"] as const,
    menuCount: (userId?: string, schoolId?: string, roleKey?: string) =>
      ["events-count-menu", userId, schoolId, roleKey] as const,
  },
  menu: {
    communicationStats: (userId?: string, schoolId?: string, roleKey?: string) =>
      ["communication-stats-menu", userId, schoolId, roleKey] as const,
    communicationsUnread: ["communications-unread-count"] as const,
    communicationsNavbar: ["communications-navbar"] as const,
    platformSettings: ["platform-settings-flags"] as const,
  },
  profile: {
    user: ["userProfile"] as const,
    teacherAssignments: (userId?: string) => ["teacherAssignments", userId] as const,
    staff: (staffId?: string) => ["staff-profile", staffId] as const,
  },
  classSections: {
    classStats: (classId?: string, sectionFilter?: string) =>
      ["class-stats", classId, sectionFilter] as const,
    sectionsByClass: (classId?: string) => ["class-sections", classId] as const,
    students: (
      classId?: string,
      sectionFilter?: string,
      search?: string,
      page?: number | string
    ) => ["class-students", classId, sectionFilter, search, page] as const,
    globalSearch: (search?: string) => ["global-search", search] as const,
    academicClasses: (academicYearId?: string) => ["academic-classes", academicYearId] as const,
    academicSections: (academicYearId?: string) => ["academic-sections", academicYearId] as const,
    classSearch: (search?: string, academicYearId?: string) =>
      ["academic-classes-search", search, academicYearId] as const,
    sectionSearch: (search?: string, academicYearId?: string) =>
      ["academic-sections-search", search, academicYearId] as const,
    filterSections: (classId?: string) => ["filter-sections", classId] as const,
  },
  teachers: {
    all: ["teachers"] as const,
    list: (
      page?: number | string,
      search?: string,
      status?: string,
      classId?: string,
      sectionId?: string,
      subject?: string
    ) => ["teachers", page, search, status, classId, sectionId, subject] as const,
    detail: (teacherId?: string) => ["teacher", teacherId] as const,
    homeroomAssignments: (teacherId?: string) =>
      ["teacher-homeroom-assignments", teacherId] as const,
    subjects: (teacherId?: string) => ["teacher-subjects", teacherId] as const,
  },
  terms: {
    all: ["terms"] as const,
    current: (schoolId?: string) => ["current-term", schoolId] as const,
    currentRoot: ["current-term"] as const,
  },
  users: {
    all: ["users"] as const,
    list: (page?: number | string, selectedRole?: string) =>
      ["users", page, selectedRole] as const,
    detail: (userId?: string) => ["user", userId] as const,
  },
};
