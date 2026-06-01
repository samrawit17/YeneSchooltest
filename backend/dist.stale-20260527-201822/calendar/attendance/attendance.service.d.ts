import { PrismaService } from '../../prisma/prisma.service';
import { SchoolSettingsService } from '../../school-settings/school-settings.service';
import { OverrideAttendanceDto, AttendanceQueryDto } from './dto';
import { NotificationService } from '../../notification/notification.service';
import { RequestUser, AttendanceRecordInput } from './interfaces/attendance.interfaces';
export declare class AttendanceService {
    private prisma;
    private notificationService;
    private schoolSettings;
    constructor(prisma: PrismaService, notificationService: NotificationService, schoolSettings: SchoolSettingsService);
    private isAdmin;
    private isWeekend;
    private isSameCalendarDay;
    private resolveParentChildStudentId;
    private resolveReadableStudentId;
    private getDateString;
    private parseDateOnlyAsLocalDay;
    private getLocalDayRange;
    private getDateInfo;
    private parseHomeroomSlotId;
    private findAcademicYearByDate;
    private getSchoolAttendanceCutoff;
    private enforceTeacherAttendanceWindow;
    getTodayTimetable(user: RequestUser, date?: string): Promise<{
        dateInfo: {
            gregorian: string;
            ethiopian: string;
            ethiopianYear: number;
            ethiopianMonth: number;
            ethiopianDay: number;
            ethiopianMonthName: string;
        };
        slots: {
            session: ({
                attendanceRecords: ({
                    student: {
                        studentProfile: {
                            academicYear: string | null;
                            section: string | null;
                            id: string;
                            schoolId: string;
                            createdAt: Date;
                            updatedAt: Date;
                            phone: string | null;
                            address: string | null;
                            documents: string | null;
                            userId: string;
                            studentId: string;
                            studentCode: string;
                            enrollmentStatus: import("@prisma/client").$Enums.EnrollmentStatus;
                            className: string | null;
                            rollNumber: string | null;
                            gender: string | null;
                            motherName: string | null;
                            motherPhone: string | null;
                            emergencyContact: string | null;
                            medicalInfo: string | null;
                            nationality: string | null;
                        } | null;
                    } & {
                        id: string;
                        schoolId: string | null;
                        createdAt: Date;
                        updatedAt: Date;
                        name: string;
                        username: string | null;
                        email: string | null;
                        phone: string | null;
                        isActive: boolean;
                        password: string;
                        role: import("@prisma/client").$Enums.Role;
                        avatarUrl: string | null;
                        theme: import("@prisma/client").$Enums.ThemePreference;
                        lastLoginAt: Date | null;
                        mustChangePassword: boolean;
                    };
                } & {
                    id: string;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    studentId: string;
                    status: import("@prisma/client").$Enums.AttendanceRecordStatus;
                    remark: string | null;
                    attendanceSessionId: string;
                    overriddenById: string | null;
                    overriddenAt: Date | null;
                    originalStatus: import("@prisma/client").$Enums.AttendanceRecordStatus | null;
                    overrideReason: string | null;
                })[];
            } & {
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                classId: string | null;
                status: import("@prisma/client").$Enums.SessionStatus;
                takenById: string;
                timetableSlotId: string | null;
                date: Date;
                submittedAt: Date | null;
            }) | null;
            id: string;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            room: null;
            isHomeroom: boolean;
            class: {
                id: string;
                name: string;
                grade: number | null;
            };
            section: {
                id: string;
                name: string;
            };
            subject: {
                id: string;
                name: string;
                code: string;
            };
            teacher: {
                id: string;
                name: string;
            };
        }[];
    }>;
    getSession(sessionId: string, user?: RequestUser): Promise<{
        dateInfo: {
            gregorian: string;
            ethiopian: string;
            ethiopianYear: number;
            ethiopianMonth: number;
            ethiopianDay: number;
            ethiopianMonthName: string;
        };
        timetableSlot: ({
            class: {
                section: string;
                grade: number | null;
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                academicYearId: string;
                gradeId: string | null;
                homeroomTeacherId: string | null;
            };
            section: {
                id: string;
                name: string;
                classId: string;
                homeroomTeacherId: string | null;
                capacity: number;
                roomNumber: string | null;
                isExamRoom: boolean;
            };
            subject: {
                grade: number | null;
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                code: string | null;
                isActive: boolean;
                description: string | null;
                credits: number | null;
                colorCode: string | null;
            };
            teacher: {
                id: string;
                name: string;
            } | null;
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            classId: string;
            sectionId: string;
            academicYearId: string | null;
            subjectId: string;
            teacherId: string | null;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            room: string | null;
        }) | null;
        attendanceRecords: ({
            student: {
                studentProfile: {
                    academicYear: string | null;
                    section: string | null;
                    id: string;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    phone: string | null;
                    address: string | null;
                    documents: string | null;
                    userId: string;
                    studentId: string;
                    studentCode: string;
                    enrollmentStatus: import("@prisma/client").$Enums.EnrollmentStatus;
                    className: string | null;
                    rollNumber: string | null;
                    gender: string | null;
                    motherName: string | null;
                    motherPhone: string | null;
                    emergencyContact: string | null;
                    medicalInfo: string | null;
                    nationality: string | null;
                } | null;
            } & {
                id: string;
                schoolId: string | null;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                username: string | null;
                email: string | null;
                phone: string | null;
                isActive: boolean;
                password: string;
                role: import("@prisma/client").$Enums.Role;
                avatarUrl: string | null;
                theme: import("@prisma/client").$Enums.ThemePreference;
                lastLoginAt: Date | null;
                mustChangePassword: boolean;
            };
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            studentId: string;
            status: import("@prisma/client").$Enums.AttendanceRecordStatus;
            remark: string | null;
            attendanceSessionId: string;
            overriddenById: string | null;
            overriddenAt: Date | null;
            originalStatus: import("@prisma/client").$Enums.AttendanceRecordStatus | null;
            overrideReason: string | null;
        })[];
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string | null;
        status: import("@prisma/client").$Enums.SessionStatus;
        takenById: string;
        timetableSlotId: string | null;
        date: Date;
        submittedAt: Date | null;
    }>;
    getStudentsForAttendance(user: RequestUser, className?: string, section?: string, date?: string, classId?: string, sectionId?: string): Promise<{
        id: string;
        userId: string;
        name: string;
        gender: string;
        studentCode: string;
        rollNumber: string;
        className: string;
        section: string;
    }[]>;
    openAttendanceSession(user: RequestUser, slotId: string, date?: string): Promise<{
        dateInfo: {
            gregorian: string;
            ethiopian: string;
            ethiopianYear: number;
            ethiopianMonth: number;
            ethiopianDay: number;
            ethiopianMonthName: string;
        };
        timetableSlot: ({
            class: {
                section: string;
                grade: number | null;
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                academicYearId: string;
                gradeId: string | null;
                homeroomTeacherId: string | null;
            };
            section: {
                id: string;
                name: string;
                classId: string;
                homeroomTeacherId: string | null;
                capacity: number;
                roomNumber: string | null;
                isExamRoom: boolean;
            };
            subject: {
                grade: number | null;
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                code: string | null;
                isActive: boolean;
                description: string | null;
                credits: number | null;
                colorCode: string | null;
            };
            teacher: {
                id: string;
                name: string;
            } | null;
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            classId: string;
            sectionId: string;
            academicYearId: string | null;
            subjectId: string;
            teacherId: string | null;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            room: string | null;
        }) | null;
        attendanceRecords: ({
            student: {
                studentProfile: {
                    academicYear: string | null;
                    section: string | null;
                    id: string;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    phone: string | null;
                    address: string | null;
                    documents: string | null;
                    userId: string;
                    studentId: string;
                    studentCode: string;
                    enrollmentStatus: import("@prisma/client").$Enums.EnrollmentStatus;
                    className: string | null;
                    rollNumber: string | null;
                    gender: string | null;
                    motherName: string | null;
                    motherPhone: string | null;
                    emergencyContact: string | null;
                    medicalInfo: string | null;
                    nationality: string | null;
                } | null;
            } & {
                id: string;
                schoolId: string | null;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                username: string | null;
                email: string | null;
                phone: string | null;
                isActive: boolean;
                password: string;
                role: import("@prisma/client").$Enums.Role;
                avatarUrl: string | null;
                theme: import("@prisma/client").$Enums.ThemePreference;
                lastLoginAt: Date | null;
                mustChangePassword: boolean;
            };
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            studentId: string;
            status: import("@prisma/client").$Enums.AttendanceRecordStatus;
            remark: string | null;
            attendanceSessionId: string;
            overriddenById: string | null;
            overriddenAt: Date | null;
            originalStatus: import("@prisma/client").$Enums.AttendanceRecordStatus | null;
            overrideReason: string | null;
        })[];
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string | null;
        status: import("@prisma/client").$Enums.SessionStatus;
        takenById: string;
        timetableSlotId: string | null;
        date: Date;
        submittedAt: Date | null;
    }>;
    getEligibleStudents(user: RequestUser, sessionId: string): Promise<{
        dateInfo: {
            gregorian: string;
            ethiopian: string;
            ethiopianYear: number;
            ethiopianMonth: number;
            ethiopianDay: number;
            ethiopianMonthName: string;
        };
        students: {
            studentId: any;
            studentName: any;
            studentCode: any;
            rollNumber: any;
            status: import("@prisma/client").$Enums.AttendanceRecordStatus | null;
            remark: string | null;
            recordId: string | null;
        }[];
    }>;
    private isHomeroomTeacher;
    bulkMarkAttendance(user: RequestUser, sessionId: string, records: AttendanceRecordInput[]): Promise<{
        success: boolean;
        message: string;
    }>;
    submitSession(user: RequestUser, sessionId: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string | null;
        status: import("@prisma/client").$Enums.SessionStatus;
        takenById: string;
        timetableSlotId: string | null;
        date: Date;
        submittedAt: Date | null;
    }>;
    private sendAbsenceNotifications;
    getTodayPendingSessions(user: RequestUser): Promise<({
        timetableSlot: ({
            class: {
                section: string;
                grade: number | null;
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                academicYearId: string;
                gradeId: string | null;
                homeroomTeacherId: string | null;
            };
            section: {
                id: string;
                name: string;
                classId: string;
                homeroomTeacherId: string | null;
                capacity: number;
                roomNumber: string | null;
                isExamRoom: boolean;
            };
            subject: {
                grade: number | null;
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                code: string | null;
                isActive: boolean;
                description: string | null;
                credits: number | null;
                colorCode: string | null;
            };
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            classId: string;
            sectionId: string;
            academicYearId: string | null;
            subjectId: string;
            teacherId: string | null;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            room: string | null;
        }) | null;
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string | null;
        status: import("@prisma/client").$Enums.SessionStatus;
        takenById: string;
        timetableSlotId: string | null;
        date: Date;
        submittedAt: Date | null;
    })[]>;
    getMyAttendance(user: RequestUser, query: AttendanceQueryDto): Promise<({
        session: {
            timetableSlot: ({
                class: {
                    section: string;
                    grade: number | null;
                    id: string;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    academicYearId: string;
                    gradeId: string | null;
                    homeroomTeacherId: string | null;
                };
                section: {
                    id: string;
                    name: string;
                    classId: string;
                    homeroomTeacherId: string | null;
                    capacity: number;
                    roomNumber: string | null;
                    isExamRoom: boolean;
                };
                subject: {
                    grade: number | null;
                    id: string;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    code: string | null;
                    isActive: boolean;
                    description: string | null;
                    credits: number | null;
                    colorCode: string | null;
                };
            } & {
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                classId: string;
                sectionId: string;
                academicYearId: string | null;
                subjectId: string;
                teacherId: string | null;
                dayOfWeek: number;
                startTime: string;
                endTime: string;
                room: string | null;
            }) | null;
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            classId: string | null;
            status: import("@prisma/client").$Enums.SessionStatus;
            takenById: string;
            timetableSlotId: string | null;
            date: Date;
            submittedAt: Date | null;
        };
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        status: import("@prisma/client").$Enums.AttendanceRecordStatus;
        remark: string | null;
        attendanceSessionId: string;
        overriddenById: string | null;
        overriddenAt: Date | null;
        originalStatus: import("@prisma/client").$Enums.AttendanceRecordStatus | null;
        overrideReason: string | null;
    })[]>;
    getStudentAttendanceSummary(user: RequestUser, studentId: string, startDate?: string, endDate?: string): Promise<{
        studentId: string;
        totalDays: number;
        presentDays: number;
        absentDays: number;
        lateDays: number;
        excusedDays: number;
        attendancePercentage: number;
    }>;
    getStudentAttendance(user: RequestUser, studentId: string, query: AttendanceQueryDto): Promise<{
        records: ({
            session: {
                timetableSlot: ({
                    class: {
                        section: string;
                        grade: number | null;
                        id: string;
                        schoolId: string;
                        createdAt: Date;
                        updatedAt: Date;
                        name: string;
                        academicYearId: string;
                        gradeId: string | null;
                        homeroomTeacherId: string | null;
                    };
                    section: {
                        id: string;
                        name: string;
                        classId: string;
                        homeroomTeacherId: string | null;
                        capacity: number;
                        roomNumber: string | null;
                        isExamRoom: boolean;
                    };
                    subject: {
                        grade: number | null;
                        id: string;
                        schoolId: string;
                        createdAt: Date;
                        updatedAt: Date;
                        name: string;
                        code: string | null;
                        isActive: boolean;
                        description: string | null;
                        credits: number | null;
                        colorCode: string | null;
                    };
                    teacher: {
                        id: string;
                        name: string;
                    } | null;
                } & {
                    id: string;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    classId: string;
                    sectionId: string;
                    academicYearId: string | null;
                    subjectId: string;
                    teacherId: string | null;
                    dayOfWeek: number;
                    startTime: string;
                    endTime: string;
                    room: string | null;
                }) | null;
            } & {
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                classId: string | null;
                status: import("@prisma/client").$Enums.SessionStatus;
                takenById: string;
                timetableSlotId: string | null;
                date: Date;
                submittedAt: Date | null;
            };
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            studentId: string;
            status: import("@prisma/client").$Enums.AttendanceRecordStatus;
            remark: string | null;
            attendanceSessionId: string;
            overriddenById: string | null;
            overriddenAt: Date | null;
            originalStatus: import("@prisma/client").$Enums.AttendanceRecordStatus | null;
            overrideReason: string | null;
        })[];
        student: {
            id: string;
            name: string;
            studentCode: any;
            className: any;
            section: any;
        } | null;
        summary: {
            totalDays: number;
            present: number;
            absent: number;
            late: number;
            excused: number;
            attendancePercentage: number;
        };
    }>;
    getAllSessions(user: RequestUser, query: AttendanceQueryDto): Promise<({
        class: ({} & {
            section: string;
            grade: number | null;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            academicYearId: string;
            gradeId: string | null;
            homeroomTeacherId: string | null;
        }) | null;
        timetableSlot: ({
            class: {
                section: string;
                grade: number | null;
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                academicYearId: string;
                gradeId: string | null;
                homeroomTeacherId: string | null;
            };
            section: {
                id: string;
                name: string;
                classId: string;
                homeroomTeacherId: string | null;
                capacity: number;
                roomNumber: string | null;
                isExamRoom: boolean;
            };
            subject: {
                grade: number | null;
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                code: string | null;
                isActive: boolean;
                description: string | null;
                credits: number | null;
                colorCode: string | null;
            };
            teacher: {
                id: string;
                name: string;
            } | null;
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            classId: string;
            sectionId: string;
            academicYearId: string | null;
            subjectId: string;
            teacherId: string | null;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            room: string | null;
        }) | null;
        attendanceRecords: ({
            student: {
                studentProfile: {
                    academicYear: string | null;
                    section: string | null;
                    id: string;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    phone: string | null;
                    address: string | null;
                    documents: string | null;
                    userId: string;
                    studentId: string;
                    studentCode: string;
                    enrollmentStatus: import("@prisma/client").$Enums.EnrollmentStatus;
                    className: string | null;
                    rollNumber: string | null;
                    gender: string | null;
                    motherName: string | null;
                    motherPhone: string | null;
                    emergencyContact: string | null;
                    medicalInfo: string | null;
                    nationality: string | null;
                } | null;
            } & {
                id: string;
                schoolId: string | null;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                username: string | null;
                email: string | null;
                phone: string | null;
                isActive: boolean;
                password: string;
                role: import("@prisma/client").$Enums.Role;
                avatarUrl: string | null;
                theme: import("@prisma/client").$Enums.ThemePreference;
                lastLoginAt: Date | null;
                mustChangePassword: boolean;
            };
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            studentId: string;
            status: import("@prisma/client").$Enums.AttendanceRecordStatus;
            remark: string | null;
            attendanceSessionId: string;
            overriddenById: string | null;
            overriddenAt: Date | null;
            originalStatus: import("@prisma/client").$Enums.AttendanceRecordStatus | null;
            overrideReason: string | null;
        })[];
        takenBy: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string | null;
        status: import("@prisma/client").$Enums.SessionStatus;
        takenById: string;
        timetableSlotId: string | null;
        date: Date;
        submittedAt: Date | null;
    })[]>;
    getSummary(user: RequestUser, query: AttendanceQueryDto): Promise<any[]>;
    getAttendanceReport(user: RequestUser, query: AttendanceQueryDto): Promise<({
        student: {
            studentProfile: {
                academicYear: string | null;
                section: string | null;
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                phone: string | null;
                address: string | null;
                documents: string | null;
                userId: string;
                studentId: string;
                studentCode: string;
                enrollmentStatus: import("@prisma/client").$Enums.EnrollmentStatus;
                className: string | null;
                rollNumber: string | null;
                gender: string | null;
                motherName: string | null;
                motherPhone: string | null;
                emergencyContact: string | null;
                medicalInfo: string | null;
                nationality: string | null;
            } | null;
        } & {
            id: string;
            schoolId: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            username: string | null;
            email: string | null;
            phone: string | null;
            isActive: boolean;
            password: string;
            role: import("@prisma/client").$Enums.Role;
            avatarUrl: string | null;
            theme: import("@prisma/client").$Enums.ThemePreference;
            lastLoginAt: Date | null;
            mustChangePassword: boolean;
        };
        session: {
            timetableSlot: ({
                class: {
                    section: string;
                    grade: number | null;
                    id: string;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    academicYearId: string;
                    gradeId: string | null;
                    homeroomTeacherId: string | null;
                };
                section: {
                    id: string;
                    name: string;
                    classId: string;
                    homeroomTeacherId: string | null;
                    capacity: number;
                    roomNumber: string | null;
                    isExamRoom: boolean;
                };
                subject: {
                    grade: number | null;
                    id: string;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    code: string | null;
                    isActive: boolean;
                    description: string | null;
                    credits: number | null;
                    colorCode: string | null;
                };
                teacher: {
                    id: string;
                    name: string;
                } | null;
            } & {
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                classId: string;
                sectionId: string;
                academicYearId: string | null;
                subjectId: string;
                teacherId: string | null;
                dayOfWeek: number;
                startTime: string;
                endTime: string;
                room: string | null;
            }) | null;
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            classId: string | null;
            status: import("@prisma/client").$Enums.SessionStatus;
            takenById: string;
            timetableSlotId: string | null;
            date: Date;
            submittedAt: Date | null;
        };
        overriddenBy: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        status: import("@prisma/client").$Enums.AttendanceRecordStatus;
        remark: string | null;
        attendanceSessionId: string;
        overriddenById: string | null;
        overriddenAt: Date | null;
        originalStatus: import("@prisma/client").$Enums.AttendanceRecordStatus | null;
        overrideReason: string | null;
    })[]>;
    overrideAttendance(user: RequestUser, recordId: string, dto: OverrideAttendanceDto): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        status: import("@prisma/client").$Enums.AttendanceRecordStatus;
        remark: string | null;
        attendanceSessionId: string;
        overriddenById: string | null;
        overriddenAt: Date | null;
        originalStatus: import("@prisma/client").$Enums.AttendanceRecordStatus | null;
        overrideReason: string | null;
    }>;
    getAttendanceByDate(user: RequestUser, date: string): Promise<({
        timetableSlot: ({
            class: {
                section: string;
                grade: number | null;
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                academicYearId: string;
                gradeId: string | null;
                homeroomTeacherId: string | null;
            };
            section: {
                id: string;
                name: string;
                classId: string;
                homeroomTeacherId: string | null;
                capacity: number;
                roomNumber: string | null;
                isExamRoom: boolean;
            };
            subject: {
                grade: number | null;
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                code: string | null;
                isActive: boolean;
                description: string | null;
                credits: number | null;
                colorCode: string | null;
            };
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            classId: string;
            sectionId: string;
            academicYearId: string | null;
            subjectId: string;
            teacherId: string | null;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            room: string | null;
        }) | null;
        attendanceRecords: ({
            student: {
                studentProfile: {
                    academicYear: string | null;
                    section: string | null;
                    id: string;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    phone: string | null;
                    address: string | null;
                    documents: string | null;
                    userId: string;
                    studentId: string;
                    studentCode: string;
                    enrollmentStatus: import("@prisma/client").$Enums.EnrollmentStatus;
                    className: string | null;
                    rollNumber: string | null;
                    gender: string | null;
                    motherName: string | null;
                    motherPhone: string | null;
                    emergencyContact: string | null;
                    medicalInfo: string | null;
                    nationality: string | null;
                } | null;
            } & {
                id: string;
                schoolId: string | null;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                username: string | null;
                email: string | null;
                phone: string | null;
                isActive: boolean;
                password: string;
                role: import("@prisma/client").$Enums.Role;
                avatarUrl: string | null;
                theme: import("@prisma/client").$Enums.ThemePreference;
                lastLoginAt: Date | null;
                mustChangePassword: boolean;
            };
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            studentId: string;
            status: import("@prisma/client").$Enums.AttendanceRecordStatus;
            remark: string | null;
            attendanceSessionId: string;
            overriddenById: string | null;
            overriddenAt: Date | null;
            originalStatus: import("@prisma/client").$Enums.AttendanceRecordStatus | null;
            overrideReason: string | null;
        })[];
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string | null;
        status: import("@prisma/client").$Enums.SessionStatus;
        takenById: string;
        timetableSlotId: string | null;
        date: Date;
        submittedAt: Date | null;
    })[]>;
    getTeacherDashboard(user: RequestUser): Promise<{
        pendingSessions: {
            id: string;
            className: string;
            sectionName: string;
            subjectName: string;
            startTime: string;
            endTime: string;
        }[];
        todaySchedule: {
            id: string;
            className: string;
            sectionName: string;
            subjectName: string;
            startTime: string;
            endTime: string;
            room: string | null;
            isCompleted: boolean;
            isCurrent: boolean;
            canTakeAttendance: boolean;
        }[];
        completedSessions: number;
        notSubmittedSessions: number;
        weeklyStats: {
            date: string;
            percentage: number;
        }[];
    }>;
    getStudentDashboard(user: any): Promise<{
        attendancePercentage: number;
        totalDays: number;
        presentDays: number;
        absentDays: number;
        lateDays: number;
        recentAbsences: {
            date: Date;
            status: import("@prisma/client").$Enums.AttendanceRecordStatus;
            subject: string;
        }[];
    }>;
    getParentDashboard(user: any, studentId: string): Promise<{
        studentName: string | undefined;
        attendancePercentage: number;
        totalDays: number;
        presentDays: number;
        absentDays: number;
        needsAlert: boolean;
        recentAbsences: Date[];
    }>;
    private getMissingAttendanceEntries;
    getMissingClasses(user: any, date: string, grade?: string, section?: string): Promise<{
        id: string;
        name: string;
        grade: number | null;
        section: string;
    }[]>;
    notifyMissingAttendance(user: any, date: string, grade?: string, section?: string): Promise<{
        message: string;
        notifications: {
            teacherId: string;
            teacherName: string | undefined;
            className: string;
            grade: number;
            section: string;
        }[];
    }>;
    getAdminDashboard(user: any, date?: string, startDate?: string, endDate?: string, grade?: string, section?: string, range?: string): Promise<{
        todayStats: {
            totalSessions: number;
            submittedSessions: number;
            notSubmittedSessions: number;
            attendanceRate: number;
            totalStudentsMarked: number;
            presentCount: number;
            absentCount: number;
            lateCount: number;
            excusedCount: number;
        };
        missingAttendance: {
            className: string;
            sectionName: string;
            subjectName: string;
            time: string;
            endTime: string;
        }[];
        recentAbsences: {
            studentName: string;
            studentCode: string | undefined;
            className: string;
            sectionName: string;
        }[];
        weeklyStats: {
            date: string;
            attendanceRate: number;
            presentCount: number;
            totalStudentsMarked: number;
        }[];
    }>;
    handleAttendanceReminder(): Promise<void>;
    private processSchoolAttendanceReminder;
    private notifyAdminsOfMissingAttendance;
}
