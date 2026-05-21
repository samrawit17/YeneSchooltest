import { GradingService } from './grading.service';
import { CreateGradeDto, BulkGradeEntryDto, GradeFilterDto, ApproveGradeDto, GradingComponentDto, GradeScaleDto, TeacherAssignmentDto } from './dto/grading.dto';
interface AuthRequest {
    user: {
        id: string;
        role: string;
        schoolId: string;
    };
}
export declare class GradingController {
    private readonly gradingService;
    constructor(gradingService: GradingService);
    getTeacherAssignments(req: AuthRequest, academicYear: string): Promise<{
        subjectAssignments: {
            id: string;
            subject: any;
            class: any;
            section: any;
        }[];
        homeroomAssignments: {
            id: string;
            isHomeroom: boolean;
            sectionId: string;
            section: {
                class: {
                    gradeLevel: {
                        id: string;
                        schoolId: string;
                        createdAt: Date;
                        updatedAt: Date;
                        name: string;
                        level: number;
                    } | null;
                } & {
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
                classSubjects: ({
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
                    academicYear: string;
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    classId: string;
                    sectionId: string;
                    subjectId: string;
                    teacherId: string | null;
                })[];
            } & {
                id: string;
                name: string;
                classId: string;
                homeroomTeacherId: string | null;
                capacity: number;
                roomNumber: string | null;
                isExamRoom: boolean;
            };
            class: {
                gradeLevel: {
                    id: string;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    level: number;
                } | null;
            } & {
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
            subjects: {
                subject: any;
                classSubjectId: any;
            }[];
        }[];
    }>;
    getStudentsForGradeEntry(req: AuthRequest, academicYear: string, termId: string, classId: string, sectionId: string, subjectId: string): Promise<{
        students: {
            studentId: string;
            studentName: string;
            rollNumber: string | null | undefined;
            caScore: number | null;
            midScore: number | null;
            finalScore: number | null;
            totalScore: number | null;
            gradeLetter: string | null;
            remark: string | null;
            status: import("@prisma/client").$Enums.GradeStatus | null;
            registrarComment: string | null;
            isLocked: boolean;
            gradeId: string | null;
            componentScores: {
                code: string;
                score: number | null;
                maxScore: number;
            }[];
        }[];
        componentAvailability: {
            code: string;
            assessmentSubjectId: string;
            startDate: string;
            status: string;
            started: boolean;
            maxScore: number;
        }[];
    }>;
    enterGrade(req: AuthRequest, dto: CreateGradeDto): Promise<{
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
        student: {
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
        academicYear: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        classId: string;
        sectionId: string;
        status: import("@prisma/client").$Enums.GradeStatus;
        isLocked: boolean;
        subjectId: string;
        termId: string;
        caScore: number | null;
        midScore: number | null;
        finalScore: number | null;
        totalScore: number | null;
        gradeLetter: string | null;
        gradePoint: number | null;
        remark: string | null;
        registrarComment: string | null;
        teacherId: string | null;
        approvedById: string | null;
        submittedById: string | null;
    }>;
    bulkEnterGrades(req: AuthRequest, dto: BulkGradeEntryDto): Promise<{
        total: number;
        successful: number;
        failed: number;
        results: {
            success: boolean;
            studentId?: string;
            data?: any;
            error?: string;
        }[];
    }>;
    bulkUploadFromCsv(req: AuthRequest, file: Express.Multer.File, dto: {
        academicYear: string;
        termId: string;
        classId: string;
        sectionId: string;
        subjectId: string;
        assessmentType: string;
    }): Promise<{
        total: number;
        successful: number;
        failed: number;
        results: {
            success: boolean;
            studentId?: string;
            data?: any;
            error?: string;
        }[];
    }>;
    downloadTemplate(req: AuthRequest, classId: string, sectionId: string, subjectId: string, academicYear: string): Promise<string>;
    saveDraft(req: AuthRequest, gradeId: string): Promise<{
        academicYear: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        classId: string;
        sectionId: string;
        status: import("@prisma/client").$Enums.GradeStatus;
        isLocked: boolean;
        subjectId: string;
        termId: string;
        caScore: number | null;
        midScore: number | null;
        finalScore: number | null;
        totalScore: number | null;
        gradeLetter: string | null;
        gradePoint: number | null;
        remark: string | null;
        registrarComment: string | null;
        teacherId: string | null;
        approvedById: string | null;
        submittedById: string | null;
    }>;
    submitToRegistrar(req: AuthRequest, gradeId: string): Promise<{
        academicYear: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        classId: string;
        sectionId: string;
        status: import("@prisma/client").$Enums.GradeStatus;
        isLocked: boolean;
        subjectId: string;
        termId: string;
        caScore: number | null;
        midScore: number | null;
        finalScore: number | null;
        totalScore: number | null;
        gradeLetter: string | null;
        gradePoint: number | null;
        remark: string | null;
        registrarComment: string | null;
        teacherId: string | null;
        approvedById: string | null;
        submittedById: string | null;
    }>;
    submitAllToRegistrar(req: AuthRequest, academicYear: string, termId: string, classId: string, sectionId: string, subjectId: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
    getGradesForReview(req: AuthRequest, filter: GradeFilterDto): Promise<({
        term: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            academicYearId: string;
            startDate: Date;
            endDate: Date;
            order: number;
            isLocked: boolean;
            percentageWeight: number;
        };
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
        student: {
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
        teacher: {
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
        } | null;
    } & {
        academicYear: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        classId: string;
        sectionId: string;
        status: import("@prisma/client").$Enums.GradeStatus;
        isLocked: boolean;
        subjectId: string;
        termId: string;
        caScore: number | null;
        midScore: number | null;
        finalScore: number | null;
        totalScore: number | null;
        gradeLetter: string | null;
        gradePoint: number | null;
        remark: string | null;
        registrarComment: string | null;
        teacherId: string | null;
        approvedById: string | null;
        submittedById: string | null;
    })[]>;
    getAssessmentScoresForReview(req: AuthRequest, filter: GradeFilterDto): Promise<({
        assessmentSubject: {
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
            } | null;
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
            assessment: {
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                academicYearId: string;
                startDate: Date;
                endDate: Date;
                status: import("@prisma/client").$Enums.AssessmentStatus;
                title: string;
                type: string;
                termId: string | null;
                createdBy: string;
                calendarEventId: string | null;
                lockAt: Date | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            classId: string;
            sectionId: string | null;
            subjectId: string;
            teacherId: string | null;
            maxScore: number;
            assessmentId: string;
            gradeLevelId: string | null;
            passMark: number | null;
        };
        student: {
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
        updatedAt: Date;
        studentId: string;
        status: import("@prisma/client").$Enums.AssessmentScoreStatus;
        assessmentSubjectId: string;
        score: number | null;
        isAbsent: boolean;
        remarks: string | null;
        enteredBy: string;
        enteredAt: Date;
    })[]>;
    reviewGrade(req: AuthRequest, gradeId: string, dto: ApproveGradeDto): Promise<{
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
        student: {
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
        teacher: {
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
        } | null;
    } & {
        academicYear: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        classId: string;
        sectionId: string;
        status: import("@prisma/client").$Enums.GradeStatus;
        isLocked: boolean;
        subjectId: string;
        termId: string;
        caScore: number | null;
        midScore: number | null;
        finalScore: number | null;
        totalScore: number | null;
        gradeLetter: string | null;
        gradePoint: number | null;
        remark: string | null;
        registrarComment: string | null;
        teacherId: string | null;
        approvedById: string | null;
        submittedById: string | null;
    }>;
    bulkApproveGrades(req: AuthRequest, gradeIds: string[]): Promise<import("@prisma/client").Prisma.BatchPayload>;
    bulkRejectGrades(req: AuthRequest, body: {
        gradeIds: string[];
        comment: string;
    }): Promise<import("@prisma/client").Prisma.BatchPayload>;
    getSubjectPerformanceReport(req: AuthRequest, academicYear: string, termId: string, subjectId: string): Promise<{
        totalStudents: number;
        average: number;
        distribution: {};
        highest?: undefined;
        lowest?: undefined;
    } | {
        totalStudents: number;
        average: number;
        distribution: Record<string, number>;
        highest: number;
        lowest: number;
    }>;
    getClassSummaryReport(req: AuthRequest, academicYear: string, termId: string, classId: string, sectionId: string): Promise<any[]>;
    getStudentGrades(req: AuthRequest, academicYear?: string, termId?: string): Promise<({
        term: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            academicYearId: string;
            startDate: Date;
            endDate: Date;
            order: number;
            isLocked: boolean;
            percentageWeight: number;
        };
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
        academicYear: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string;
        classId: string;
        sectionId: string;
        status: import("@prisma/client").$Enums.GradeStatus;
        isLocked: boolean;
        subjectId: string;
        termId: string;
        caScore: number | null;
        midScore: number | null;
        finalScore: number | null;
        totalScore: number | null;
        gradeLetter: string | null;
        gradePoint: number | null;
        remark: string | null;
        registrarComment: string | null;
        teacherId: string | null;
        approvedById: string | null;
        submittedById: string | null;
    } & {
        financeLockMessage?: string | null;
    })[]>;
    getChildGradesWithAnalysis(req: AuthRequest, childId: string, academicYear?: string, termId?: string): Promise<{
        grades: never[];
        periods: never[];
        summary: {};
        curriculumType: string;
        periodCount: number;
        academicYear?: undefined;
        currentPeriodTermId?: undefined;
    } | {
        grades: ({
            term: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                academicYearId: string;
                startDate: Date;
                endDate: Date;
                order: number;
                isLocked: boolean;
                percentageWeight: number;
            };
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
            gradeScores: ({
                component: {
                    name: string;
                    code: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                score: number | null;
                maxScore: number;
                subjectGradeId: string;
                gradingComponentId: string;
            })[];
        } & {
            academicYear: string;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            studentId: string;
            classId: string;
            sectionId: string;
            status: import("@prisma/client").$Enums.GradeStatus;
            isLocked: boolean;
            subjectId: string;
            termId: string;
            caScore: number | null;
            midScore: number | null;
            finalScore: number | null;
            totalScore: number | null;
            gradeLetter: string | null;
            gradePoint: number | null;
            remark: string | null;
            registrarComment: string | null;
            teacherId: string | null;
            approvedById: string | null;
            submittedById: string | null;
        })[];
        periods: {
            period: string;
            periodIndex: number;
            termId: string;
            startDate: Date;
            endDate: Date;
            grades: ({
                term: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    academicYearId: string;
                    startDate: Date;
                    endDate: Date;
                    order: number;
                    isLocked: boolean;
                    percentageWeight: number;
                };
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
                gradeScores: ({
                    component: {
                        name: string;
                        code: string;
                    };
                } & {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    score: number | null;
                    maxScore: number;
                    subjectGradeId: string;
                    gradingComponentId: string;
                })[];
            } & {
                academicYear: string;
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                studentId: string;
                classId: string;
                sectionId: string;
                status: import("@prisma/client").$Enums.GradeStatus;
                isLocked: boolean;
                subjectId: string;
                termId: string;
                caScore: number | null;
                midScore: number | null;
                finalScore: number | null;
                totalScore: number | null;
                gradeLetter: string | null;
                gradePoint: number | null;
                remark: string | null;
                registrarComment: string | null;
                teacherId: string | null;
                approvedById: string | null;
                submittedById: string | null;
            })[];
            subjectCount: number;
            average: number;
            gpa: string;
        }[];
        summary: {
            totalSubjects: number;
            average: number;
            gpa: string;
            rank: number | null;
            totalStudents: number;
            highestScore: number;
            lowestScore: number;
        };
        curriculumType: string;
        periodCount: number;
        academicYear: {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            isActive: boolean;
            startDate: Date;
            endDate: Date;
            ethiopianYear: number | null;
            curriculumType: import("@prisma/client").$Enums.CurriculumType;
            calendarType: import("@prisma/client").$Enums.CalendarType;
        };
        currentPeriodTermId: string | null;
    }>;
    calculateRankings(req: AuthRequest, body: {
        academicYearId: string;
        termId?: string;
        classId?: string;
        sectionId?: string;
    }): Promise<{
        calculated: string;
        academicYear: string;
        termId: string;
        termName: string;
        results: any[];
        topStudents: {
            id: any;
            name: any;
            rank: number;
            average: any;
            attendance: number;
        }[];
        totalStudents: number;
        classAverage: number;
        passRate: number;
        updatedReportCards: number;
        notifiedParents: number;
    }>;
    createGradingComponents(req: AuthRequest, dto: GradingComponentDto[]): Promise<any[]>;
    getGradingComponents(req: AuthRequest): Promise<any>;
    getTeacherAssessmentTypes(req: AuthRequest): Promise<string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray | {
        code: string;
        name: string;
        percentage: number;
    }[]>;
    getParentGradingComponents(req: AuthRequest): Promise<any>;
    getAssessmentTypes(req: AuthRequest): Promise<string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray | {
        code: string;
        name: string;
        percentage: number;
    }[]>;
    createAssessmentTypes(req: AuthRequest, dto: {
        code: string;
        name: string;
        percentage: number;
    }[]): Promise<any[]>;
    createGradeScales(req: AuthRequest, dto: GradeScaleDto[]): Promise<any[]>;
    getGradeScale(req: AuthRequest): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        description: string | null;
        gradeLetter: string;
        gradePoint: number;
        minScore: number;
        maxScore: number;
    }[]>;
    assignTeacher(req: AuthRequest, dto: TeacherAssignmentDto): Promise<{
        academicYear: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        classId: string;
        sectionId: string;
        subjectId: string;
        teacherId: string;
    }>;
    removeTeacherAssignment(req: AuthRequest, assignmentId: string): Promise<{
        academicYear: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        classId: string;
        sectionId: string;
        subjectId: string;
        teacherId: string;
    }>;
    getStudentFinalGrades(req: any, academicYear: string, classId?: string, studentId?: string): Promise<{
        subjectId: string;
        subjectName: string;
        classId: string;
        className: string;
        sectionId: string;
        sectionName: string;
        finalScore: number | null;
        gradeLetter: string | null;
        gradePoint: number | null;
        isLocked: boolean;
        financeLockMessage?: string | null;
        curriculumType: string;
        periodGrades: Array<{
            periodId: string;
            periodName: string;
            score: number;
            weight: number;
            weightedScore: number;
        }>;
    }[]>;
    getChildFinalGrades(req: any, studentId: string, academicYear: string, classId?: string): Promise<{
        subjectId: string;
        subjectName: string;
        classId: string;
        className: string;
        sectionId: string;
        sectionName: string;
        finalScore: number | null;
        gradeLetter: string | null;
        gradePoint: number | null;
        isLocked: boolean;
        financeLockMessage?: string | null;
        curriculumType: string;
        periodGrades: Array<{
            periodId: string;
            periodName: string;
            score: number;
            weight: number;
            weightedScore: number;
        }>;
    }[]>;
    calculateSubjectFinalGrade(req: AuthRequest, studentId: string, subjectId: string, academicYear: string): Promise<{
        finalScore: number;
        gradeLetter: string;
        gradePoint: number;
        periodGrades: Array<{
            periodId: string;
            periodName: string;
            score: number;
            weight: number;
            weightedScore: number;
        }>;
        curriculumType: string;
    }>;
    verifyFinancialClearance(req: AuthRequest, studentId: string, academicYear: string, termId?: string, checkOverdueOnly?: string): Promise<{
        isCleared: boolean;
        outstandingFees: any[];
    }>;
    getEntryProgress(req: AuthRequest, academicYear: string, term: string): Promise<{
        enteredGrades: number;
        percentage: number;
        teacherId: string;
        teacherName: string | null;
        subjectId: string;
        classId: string;
        sectionId: string | null;
        subject: string;
        class: string;
        section: string | null;
        totalStudents: number;
    }[]>;
    sendReminder(req: AuthRequest, body: {
        academicYear: string;
        term: string;
    }): Promise<{
        remindersSent: number;
        teachers: string[];
    }>;
    getPublishChecklist(req: AuthRequest, academicYear: string, term: string): Promise<any[]>;
    bulkPublish(req: AuthRequest, body: {
        assessmentIds: string[];
        notifyParents: boolean;
    }): Promise<import("@prisma/client").Prisma.BatchPayload>;
    getPromotionList(req: AuthRequest, academicYear: string): Promise<{
        studentId: string;
        studentName: string;
        currentClass: string;
        gpa: number;
        recommendation: string;
    }[]>;
    overridePromotion(req: AuthRequest, body: {
        studentId: string;
        recommendation: string;
    }): Promise<{
        studentId: string;
        recommendation: string;
        status: string;
    }>;
    confirmPromotions(req: AuthRequest, body: {
        academicYear: string;
        notifyParents: boolean;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    bulkConfirmPromotions(req: AuthRequest, body: {
        academicYear: string;
        notifyParents: boolean;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
}
export {};
