import api from "./api/core";

export default api;

export { authAPI, userAPI } from "./api/auth";
export { notificationsAPI } from "./api/notifications";
export { studentsAPI, registrarAPI } from "./api/students";
export {
  academicYearsAPI,
  classesAPI,
  platformSettingsAPI,
  schoolSettingsAPI,
  schoolsAPI,
  sectionsAPI,
  subjectsAPI,
  teachersAPI,
  termsAPI,
  timetableSlotsAPI,
} from "./api/academics";
export {
  attendanceAPI,
  type AttendanceRecord,
  type AttendanceRecordStatus,
  type AttendanceSession,
  type DailyAttendance,
  type SessionStatus,
  type StudentAttendanceSummary,
} from "./api/attendance";
export { assessmentsAPI, examsAPI, gradingAPI } from "./api/assessment";
export {
  entryProgressAPI,
  type EntryProgressQuery,
  type EntryProgressRow,
} from "./api/entry-progress";
export { financeAPI } from "./api/finance";
export { bulkUploadAPI, type BulkUploadResult } from "./api/bulk-upload";
export {
  subscriptionAPI,
  type SubscriptionPlan,
  type SubscriptionSchool,
  type SchoolSubscription,
} from "./api/subscription";
export { parentsAPI, disciplineAPI } from "./api/people";
export { parentDashboardAPI } from "./api/parent";
export {
  communicationsAPI,
  messagingAPI,
  type CommunicationStatus,
  type CommunicationCategory,
  type CommunicationReply,
  type Communication,
  type CreateCommunicationDto,
  type CreateCommunicationReplyDto,
  type UpdateCommunicationStatusDto,
  type CommunicationQueryParams,
  type PaginatedResponse,
  type MessagingParticipant,
  type MessagingLastMessage,
  type MessagingConversationListItem,
  type MessagingMessage,
} from "./api/communications";
export {
  announcementsAPI,
  eventsAPI,
  lessonsAPI,
  type Announcement,
  type CreateAnnouncementDto,
  type UpdateAnnouncementDto,
  type Event,
  type CreateEventDto,
  type UpdateEventDto,
  type Lesson,
  type LessonAttachment,
  type CreateLessonDto,
  type UpdateLessonDto,
  type LessonCoverageReport,
} from "./api/content";
export { superadminAPI, type SuperAdminStatsResponse } from "./api/superadmin";
export { adminTimetableAPI } from "./api/timetable";
export {
  calendarAPI,
  examSeatingAPI,
  searchAPI,
  type SearchResult,
  type SearchableEntity,
} from "./api/operations";
export {
  reportCardsAPI,
  promotionAPI,
  type ReportCardStatus,
  type ReportCard,
  type GradeDetail,
  type PromotionCandidate,
  type ReportPublishSummaryRow,
  type ParentPresentationReport,
} from "./api/reporting";
export {
  enrollmentAPI,
  type EnrollmentRequest,
  type EnrollmentStats,
  type EnrollmentCredentials,
  type EnrollmentStatus,
} from "./api/enrollment";
export {
  periodTimeAPI,
  type PeriodTime,
} from "./api/siren-period-time";
export {
  sirenScheduleAPI,
  type SirenSchedule,
} from "./api/siren-schedules";
export {
  sirenEventAPI,
  type SirenEvent,
} from "./api/siren-events";
export {
  sirenHardwareAPI,
  type SirenHardwareConfig,
} from "./api/siren-hardware";
export { sirenControlAPI } from "./api/siren-control";
