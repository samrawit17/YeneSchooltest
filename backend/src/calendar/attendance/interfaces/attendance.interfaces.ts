/**
 * Request user interface for typed access
 */
export interface RequestUser {
  id: string;
  role: string;
  schoolId: string;
  name: string;
  email?: string;
}

/**
 * Attendance record input for bulk operations
 */
export interface AttendanceRecordInput {
  studentId: string;
  status: string;
  remark?: string;
}

/**
 * Session context for notifications
 */
export interface SessionContext {
  id: string;
  schoolId: string;
  date: Date;
  classId?: string | null;
  timetableSlotId?: string | null;
  class?: {
    id: string;
    name: string;
    grade?: number | null;
  } | null;
  timetableSlot?: {
    class?: {
      name?: string;
      grade?: number | null;
    };
    section?: {
      name?: string;
    };
  } | null;
}

/**
 * Timezone configuration
 */
export interface TimezoneConfig {
  timezone: string;
  offset: number; // Offset in hours from UTC
}
