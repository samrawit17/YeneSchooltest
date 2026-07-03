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
                classSubjects: ({
                    subject: {
                        id: string;
                        name: string;
                        description: string | null;
                        isActive: boolean;
                        schoolId: string;
                        createdAt: Date;
                        updatedAt: Date;
                        grade: number | null;
                        code: string | null;
                        academicYearId: string | null;
                        credits: number | null;
                        colorCode: string | null;
                    };
                } & {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    academicYear: string;
                    classId: string;
                    sectionId: string;
                    subjectId: string;
                    teacherId: string | null;
                })[];
                class: {
                    gradeLevel: {
                        id: string;
                        name: string;
                        schoolId: string;
                        createdAt: Date;
                        updatedAt: Date;
                        level: number;
                    } | null;
                } & {
                    id: string;
                    name: string;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    section: string;
                    grade: number | null;
                    academicYearId: string;
                    gradeId: string | null;
                    homeroomTeacherId: string | null;
                };
            } & {
                id: string;
                name: string;
                classId: string;
                homeroomTeacherId: string | null;
                stream: string | null;
                capacity: number;
                roomNumber: string | null;
                isExamRoom: boolean;
            };
            class: {
                gradeLevel: {
                    id: string;
                    name: string;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    level: number;
                } | null;
            } & {
                id: string;
                name: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                section: string;
                grade: number | null;
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
            endDate: string;
            status: string;
            started: boolean;
            ended: boolean;
            maxScore: number;
        }[];
    }>;
    enterGrade(req: AuthRequest, dto: CreateGradeDto): Promise<{
        subject: {
            id: string;
            name: string;
            description: string | null;
            isActive: boolean;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            grade: number | null;
            code: string | null;
            academicYearId: string | null;
            credits: number | null;
            colorCode: string | null;
        };
        student: {
            id: string;
            name: string;
            role: import("@prisma/client").$Enums.Role;
            email: string | null;
            username: string | null;
            password: string;
            isActive: boolean;
            phone: string | null;
            avatarUrl: string | null;
            theme: import("@prisma/client").$Enums.ThemePreference;
            language: string;
            lastLoginAt: Date | null;
            schoolId: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            deletedById: string | null;
            mustChangePassword: boolean;
        };
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        academicYear: string;
        studentId: string;
        classId: string;
        sectionId: string;
        status: import("@prisma/client").$Enums.GradeStatus;
        subjectId: string;
        teacherId: string | null;
        isLocked: boolean;
        termId: string;
        caScore: number | null;
        midScore: number | null;
        finalScore: number | null;
        totalScore: number | null;
        gradeLetter: string | null;
        gradePoint: number | null;
        remark: string | null;
        registrarComment: string | null;
        internalNote: string | null;
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
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        academicYear: string;
        studentId: string;
        classId: string;
        sectionId: string;
        status: import("@prisma/client").$Enums.GradeStatus;
        subjectId: string;
        teacherId: string | null;
        isLocked: boolean;
        termId: string;
        caScore: number | null;
        midScore: number | null;
        finalScore: number | null;
        totalScore: number | null;
        gradeLetter: string | null;
        gradePoint: number | null;
        remark: string | null;
        registrarComment: string | null;
        internalNote: string | null;
        approvedById: string | null;
        submittedById: string | null;
    }>;
    submitToRegistrar(req: AuthRequest, gradeId: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        academicYear: string;
        studentId: string;
        classId: string;
        sectionId: string;
        status: import("@prisma/client").$Enums.GradeStatus;
        subjectId: string;
        teacherId: string | null;
        isLocked: boolean;
        termId: string;
        caScore: number | null;
        midScore: number | null;
        finalScore: number | null;
        totalScore: number | null;
        gradeLetter: string | null;
        gradePoint: number | null;
        remark: string | null;
        registrarComment: string | null;
        internalNote: string | null;
        approvedById: string | null;
        submittedById: string | null;
    }>;
    submitAllToRegistrar(req: AuthRequest, academicYear: string, termId: string, classId: string, sectionId: string, subjectId: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
    getGradesForReview(req: AuthRequest, filter: GradeFilterDto): Promise<({
        term: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            academicYearId: string;
            startDate: Date;
            endDate: Date;
            order: number;
            isLocked: boolean;
            percentageWeight: number;
        };
        class: {
            id: string;
            name: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            section: string;
            grade: number | null;
            academicYearId: string;
            gradeId: string | null;
            homeroomTeacherId: string | null;
        };
        section: {
            id: string;
            name: string;
            classId: string;
            homeroomTeacherId: string | null;
            stream: string | null;
            capacity: number;
            roomNumber: string | null;
            isExamRoom: boolean;
        };
        subject: {
            id: string;
            name: string;
            description: string | null;
            isActive: boolean;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            grade: number | null;
            code: string | null;
            academicYearId: string | null;
            credits: number | null;
            colorCode: string | null;
        };
        student: {
            id: string;
            name: string;
            role: import("@prisma/client").$Enums.Role;
            email: string | null;
            username: string | null;
            password: string;
            isActive: boolean;
            phone: string | null;
            avatarUrl: string | null;
            theme: import("@prisma/client").$Enums.ThemePreference;
            language: string;
            lastLoginAt: Date | null;
            schoolId: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            deletedById: string | null;
            mustChangePassword: boolean;
        };
        teacher: {
            id: string;
            name: string;
            role: import("@prisma/client").$Enums.Role;
            email: string | null;
            username: string | null;
            password: string;
            isActive: boolean;
            phone: string | null;
            avatarUrl: string | null;
            theme: import("@prisma/client").$Enums.ThemePreference;
            language: string;
            lastLoginAt: Date | null;
            schoolId: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            deletedById: string | null;
            mustChangePassword: boolean;
        } | null;
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        academicYear: string;
        studentId: string;
        classId: string;
        sectionId: string;
        status: import("@prisma/client").$Enums.GradeStatus;
        subjectId: string;
        teacherId: string | null;
        isLocked: boolean;
        termId: string;
        caScore: number | null;
        midScore: number | null;
        finalScore: number | null;
        totalScore: number | null;
        gradeLetter: string | null;
        gradePoint: number | null;
        remark: string | null;
        registrarComment: string | null;
        internalNote: string | null;
        approvedById: string | null;
        submittedById: string | null;
    })[]>;
    getAssessmentScoresForReview(req: AuthRequest, filter: GradeFilterDto): Promise<({
        assessmentSubject: {
            class: {
                id: string;
                name: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                section: string;
                grade: number | null;
                academicYearId: string;
                gradeId: string | null;
                homeroomTeacherId: string | null;
            };
            section: {
                id: string;
                name: string;
                classId: string;
                homeroomTeacherId: string | null;
                stream: string | null;
                capacity: number;
                roomNumber: string | null;
                isExamRoom: boolean;
            } | null;
            subject: {
                id: string;
                name: string;
                description: string | null;
                isActive: boolean;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                grade: number | null;
                code: string | null;
                academicYearId: string | null;
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
                type: string;
                title: string;
                createdBy: string;
                termId: string | null;
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
            assessmentId: string;
            gradeLevelId: string | null;
            maxScore: number;
            passMark: number | null;
        };
        student: {
            id: string;
            name: string;
            role: import("@prisma/client").$Enums.Role;
            email: string | null;
            username: string | null;
            password: string;
            isActive: boolean;
            phone: string | null;
            avatarUrl: string | null;
            theme: import("@prisma/client").$Enums.ThemePreference;
            language: string;
            lastLoginAt: Date | null;
            schoolId: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            deletedById: string | null;
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
            id: string;
            name: string;
            description: string | null;
            isActive: boolean;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            grade: number | null;
            code: string | null;
            academicYearId: string | null;
            credits: number | null;
            colorCode: string | null;
        };
        student: {
            id: string;
            name: string;
            role: import("@prisma/client").$Enums.Role;
            email: string | null;
            username: string | null;
            password: string;
            isActive: boolean;
            phone: string | null;
            avatarUrl: string | null;
            theme: import("@prisma/client").$Enums.ThemePreference;
            language: string;
            lastLoginAt: Date | null;
            schoolId: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            deletedById: string | null;
            mustChangePassword: boolean;
        };
        teacher: {
            id: string;
            name: string;
            role: import("@prisma/client").$Enums.Role;
            email: string | null;
            username: string | null;
            password: string;
            isActive: boolean;
            phone: string | null;
            avatarUrl: string | null;
            theme: import("@prisma/client").$Enums.ThemePreference;
            language: string;
            lastLoginAt: Date | null;
            schoolId: string | null;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            deletedById: string | null;
            mustChangePassword: boolean;
        } | null;
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        academicYear: string;
        studentId: string;
        classId: string;
        sectionId: string;
        status: import("@prisma/client").$Enums.GradeStatus;
        subjectId: string;
        teacherId: string | null;
        isLocked: boolean;
        termId: string;
        caScore: number | null;
        midScore: number | null;
        finalScore: number | null;
        totalScore: number | null;
        gradeLetter: string | null;
        gradePoint: number | null;
        remark: string | null;
        registrarComment: string | null;
        internalNote: string | null;
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
            name: string;
            createdAt: Date;
            updatedAt: Date;
            academicYearId: string;
            startDate: Date;
            endDate: Date;
            order: number;
            isLocked: boolean;
            percentageWeight: number;
        };
        class: {
            id: string;
            name: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            section: string;
            grade: number | null;
            academicYearId: string;
            gradeId: string | null;
            homeroomTeacherId: string | null;
        };
        section: {
            id: string;
            name: string;
            classId: string;
            homeroomTeacherId: string | null;
            stream: string | null;
            capacity: number;
            roomNumber: string | null;
            isExamRoom: boolean;
        };
        subject: {
            id: string;
            name: string;
            description: string | null;
            isActive: boolean;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            grade: number | null;
            code: string | null;
            academicYearId: string | null;
            credits: number | null;
            colorCode: string | null;
        };
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        academicYear: string;
        studentId: string;
        classId: string;
        sectionId: string;
        status: import("@prisma/client").$Enums.GradeStatus;
        subjectId: string;
        teacherId: string | null;
        isLocked: boolean;
        termId: string;
        caScore: number | null;
        midScore: number | null;
        finalScore: number | null;
        totalScore: number | null;
        gradeLetter: string | null;
        gradePoint: number | null;
        remark: string | null;
        registrarComment: string | null;
        internalNote: string | null;
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
                name: string;
                createdAt: Date;
                updatedAt: Date;
                academicYearId: string;
                startDate: Date;
                endDate: Date;
                order: number;
                isLocked: boolean;
                percentageWeight: number;
            };
            class: {
                id: string;
                name: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                section: string;
                grade: number | null;
                academicYearId: string;
                gradeId: string | null;
                homeroomTeacherId: string | null;
            };
            section: {
                id: string;
                name: string;
                classId: string;
                homeroomTeacherId: string | null;
                stream: string | null;
                capacity: number;
                roomNumber: string | null;
                isExamRoom: boolean;
            };
            subject: {
                id: string;
                name: string;
                description: string | null;
                isActive: boolean;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                grade: number | null;
                code: string | null;
                academicYearId: string | null;
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
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            academicYear: string;
            studentId: string;
            classId: string;
            sectionId: string;
            status: import("@prisma/client").$Enums.GradeStatus;
            subjectId: string;
            teacherId: string | null;
            isLocked: boolean;
            termId: string;
            caScore: number | null;
            midScore: number | null;
            finalScore: number | null;
            totalScore: number | null;
            gradeLetter: string | null;
            gradePoint: number | null;
            remark: string | null;
            registrarComment: string | null;
            internalNote: string | null;
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
                    name: string;
                    createdAt: Date;
                    updatedAt: Date;
                    academicYearId: string;
                    startDate: Date;
                    endDate: Date;
                    order: number;
                    isLocked: boolean;
                    percentageWeight: number;
                };
                class: {
                    id: string;
                    name: string;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    section: string;
                    grade: number | null;
                    academicYearId: string;
                    gradeId: string | null;
                    homeroomTeacherId: string | null;
                };
                section: {
                    id: string;
                    name: string;
                    classId: string;
                    homeroomTeacherId: string | null;
                    stream: string | null;
                    capacity: number;
                    roomNumber: string | null;
                    isExamRoom: boolean;
                };
                subject: {
                    id: string;
                    name: string;
                    description: string | null;
                    isActive: boolean;
                    schoolId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    grade: number | null;
                    code: string | null;
                    academicYearId: string | null;
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
                id: string;
                schoolId: string;
                createdAt: Date;
                updatedAt: Date;
                academicYear: string;
                studentId: string;
                classId: string;
                sectionId: string;
                status: import("@prisma/client").$Enums.GradeStatus;
                subjectId: string;
                teacherId: string | null;
                isLocked: boolean;
                termId: string;
                caScore: number | null;
                midScore: number | null;
                finalScore: number | null;
                totalScore: number | null;
                gradeLetter: string | null;
                gradePoint: number | null;
                remark: string | null;
                registrarComment: string | null;
                internalNote: string | null;
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
            name: string;
            isActive: boolean;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            calendarType: import("@prisma/client").$Enums.CalendarType;
            startDate: Date;
            endDate: Date;
            ethiopianYear: number | null;
            curriculumType: import("@prisma/client").$Enums.CurriculumType;
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
        description: string | null;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        gradeLetter: string;
        gradePoint: number;
        maxScore: number;
        minScore: number;
    }[]>;
    assignTeacher(req: AuthRequest, dto: TeacherAssignmentDto): Promise<{
        id: string;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        academicYear: string;
        classId: string;
        sectionId: string;
        subjectId: string;
        teacherId: string;
    }>;
    removeTeacherAssignment(req: AuthRequest, assignmentId: string): Promise<{
        id: string;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        academicYear: string;
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
        teacherId: string;
        teacherName: string | null;
        subjectId: string;
        classId: string;
        sectionId: string | null;
        subject: string;
        class: string;
        section: string | null;
        totalStudents: number;
        enteredGrades: number;
        percentage: number;
    }[]>;
    sendReminder(req: AuthRequest, body: {
        academicYear: string;
        term: string;
    }): Promise<{
        remindersSent: number;
        teachers: string[];
        skippedUnassigned: number;
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
