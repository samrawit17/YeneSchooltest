export interface RequestUser {
    id: string;
    role: string;
    schoolId: string;
    name: string;
    email?: string;
}
export interface AttendanceRecordInput {
    studentId: string;
    status: string;
    remark?: string;
}
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
export interface TimezoneConfig {
    timezone: string;
    offset: number;
}
