export { platformSettingsAPI } from './platform';
export { schoolSettingsAPI } from './school-settings';
export { schoolsAPI } from './schools';
export { classesAPI, sectionsAPI } from './classes';
export { academicYearsAPI, termsAPI } from './academic-years';
export { subjectsAPI } from './subjects';
export { teachersAPI } from './teachers';
export { timetableSlotsAPI } from './timetable-slots';

export {
  rolesAPI, permissionsAPI, autoAssignmentAPI, credentialsAPI,
  classSubjectsAPI, dashboardAPI,
} from './admin';

export { assessmentsAPI, examsAPI, gradingAPI } from './assessment';
export { attendanceAPI } from './attendance';
export { authAPI, userAPI } from './auth';
export { bulkUploadAPI } from './bulk-upload';
export { communicationsAPI, messagingAPI } from './communications';
export { announcementsAPI, eventsAPI, lessonsAPI, type Lesson, type Announcement, type Event, type CreateLessonDto } from './content';
export { dataQualityAPI, type DataQualityIssue, type DataQualitySeverity } from './data-quality';
export { enrollmentAPI } from './enrollment';
export { entryProgressAPI } from './entry-progress';
export { financeAPI } from './finance';
export { notificationsAPI } from './notifications';
export { calendarAPI, examSeatingAPI, nationalExamResultsAPI, searchAPI } from './operations';
export { parentDashboardAPI } from './parent';
export { parentsAPI, disciplineAPI } from './people';
export { practiceExamsAPI, type PracticeExam, type PracticeExamQuestion, type PracticeExamOption, type PracticeExamStatus, type PracticeExamSubmission } from './practice-exams';
export { reportCardsAPI } from './reporting';
export { sirenControlAPI } from './siren-control';
export { sirenEventAPI } from './siren-events';
export { sirenHardwareAPI } from './siren-hardware';
export { periodTimeAPI } from './siren-period-time';
export { sirenScheduleAPI } from './siren-schedules';
export { studentsAPI, registrarAPI } from './students';
export { subscriptionAPI } from './subscription';
export { superadminAPI } from './superadmin';
export { templatesAPI } from './templates';
export { adminTimetableAPI } from './timetable';
export { translationAPI } from './translation';
export { automationAPI, type AutomationRule, type AutomationExecutionLog } from './automation';
