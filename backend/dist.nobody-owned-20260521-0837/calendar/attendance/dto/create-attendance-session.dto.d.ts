export declare class CreateAttendanceSessionDto {
    date?: string;
}
export declare class MarkAttendanceDto {
    studentId: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
    remark?: string;
}
export declare class BulkMarkAttendanceDto {
    records: MarkAttendanceDto[];
}
export declare class SubmitSessionDto {
    sessionId: string;
}
export declare class OverrideAttendanceDto {
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
    overrideReason: string;
    remark?: string;
}
export declare class AttendanceQueryDto {
    classId?: string;
    sectionId?: string;
    grade?: string;
    section?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    month?: string;
    studentId?: string;
    teacherId?: string;
    status?: 'NOT_SUBMITTED' | 'SUBMITTED';
}
