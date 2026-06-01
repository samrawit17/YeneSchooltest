import { PrismaService } from '../prisma/prisma.service';
import { AcademicYearService } from '../academic-year/academic-year.service';
import { CreateGradeDto, BulkGradeEntryDto, GradeFilterDto, ApproveGradeDto, GradingComponentDto, GradeScaleDto, TeacherAssignmentDto } from './dto/grading.dto';
import { CacheService } from '../infrastructure/cache/cache.service';
import { NotificationService } from '../notification/notification.service';
export declare class GradingService {
    private prisma;
    private academicYearService;
    private cacheService;
    private notificationService;
    constructor(prisma: PrismaService, academicYearService: AcademicYearService, cacheService: CacheService, notificationService: NotificationService);
    private getStudentGradesNamespace;
    private getTeacherGradesNamespace;
    private getSchoolGradesNamespace;
    private parseSettingValue;
    private ensureParentGradeAccessEnabled;
    private getSchoolGradingComponentsMap;
    private getEffectiveAssessmentMaxScore;
    private buildLegacyScoresFromComponents;
    private normalizeComponentPayload;
    private calculateTotalFromComponentScores;
    private normalizeAssessmentComponentCode;
    private getEffectiveGradeTotalScore;
    private invalidateGradeCaches;
    calculateGrade(schoolId: string, caScore?: number, midScore?: number, finalScore?: number): Promise<{
        totalScore: number;
        gradeLetter: string;
        gradePoint: number;
    }>;
    private getGradeFromScore;
    private assertTermIsOpen;
    private assertStudentInClassSection;
    private assertReviewStatus;
    private resolveTeacherGradingAccess;
    private ensureConsistentBulkPayload;
    private syncGradeLockStatus;
    private maskLockedGradeForPortal;
    private resolveChildStudentForParent;
    getStudentsForGradeEntry(teacherId: string, schoolId: string, academicYear: string, termId: string, classId: string, sectionId: string, subjectId: string): Promise<{
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
    private logGradeChange;
    verifyFinancialClearance(studentId: string, schoolId: string, academicYearId: string, termId?: string, checkOverdueOnly?: boolean): Promise<{
        isCleared: boolean;
        outstandingFees: any[];
    }>;
    updateGradeLockStatus(studentId: string, schoolId: string, academicYearId: string): Promise<void>;
    enterGrade(teacherId: string, schoolId: string, dto: CreateGradeDto): Promise<{
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
        internalNote: string | null;
        teacherId: string | null;
        approvedById: string | null;
        submittedById: string | null;
    }>;
    bulkEnterGrades(teacherId: string, schoolId: string, dto: BulkGradeEntryDto): Promise<{
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
    saveDraft(teacherId: string, schoolId: string, gradeId: string): Promise<{
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
        internalNote: string | null;
        teacherId: string | null;
        approvedById: string | null;
        submittedById: string | null;
    }>;
    submitToRegistrar(teacherId: string, schoolId: string, gradeId: string): Promise<{
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
        internalNote: string | null;
        teacherId: string | null;
        approvedById: string | null;
        submittedById: string | null;
    }>;
    submitAllToRegistrar(teacherId: string, schoolId: string, academicYear: string, termId: string, classId: string, sectionId: string, subjectId: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
    getGradesForReview(schoolId: string, filter: GradeFilterDto): Promise<({
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
        internalNote: string | null;
        teacherId: string | null;
        approvedById: string | null;
        submittedById: string | null;
    })[]>;
    reviewGrade(registrarId: string, schoolId: string, gradeId: string, dto: ApproveGradeDto): Promise<{
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
        internalNote: string | null;
        teacherId: string | null;
        approvedById: string | null;
        submittedById: string | null;
    }>;
    bulkApproveGrades(registrarId: string, schoolId: string, gradeIds: string[]): Promise<import("@prisma/client").Prisma.BatchPayload>;
    bulkRejectGrades(registrarId: string, schoolId: string, gradeIds: string[], comment: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
    getStudentGrades(studentId: string, schoolId: string, academicYear?: string, termId?: string): Promise<({
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
        internalNote: string | null;
        teacherId: string | null;
        approvedById: string | null;
        submittedById: string | null;
    } & {
        financeLockMessage?: string | null;
    })[]>;
    getChildGrades(parentId: string, childId: string, schoolId: string, academicYear?: string, termId?: string): Promise<({
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
        internalNote: string | null;
        teacherId: string | null;
        approvedById: string | null;
        submittedById: string | null;
    } & {
        financeLockMessage?: string | null;
    })[]>;
    getChildFinalGradesWithClass(parentId: string, childId: string, schoolId: string, academicYear: string, classId?: string): Promise<{
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
    getTeacherAssignments(teacherId: string, schoolId: string, academicYear: string): Promise<{
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
    createGradingComponents(schoolId: string, components: GradingComponentDto[]): Promise<any[]>;
    createGradeScales(schoolId: string, scales: GradeScaleDto[]): Promise<any[]>;
    getGradingComponents(schoolId: string): Promise<any>;
    getGradeScale(schoolId: string): Promise<{
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
    getAssessmentTypes(schoolId: string): Promise<string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray | {
        code: string;
        name: string;
        percentage: number;
    }[]>;
    createAssessmentTypes(schoolId: string, types: {
        code: string;
        name: string;
        percentage: number;
    }[]): Promise<any[]>;
    assignTeacher(schoolId: string, dto: TeacherAssignmentDto): Promise<{
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
    removeTeacherAssignment(schoolId: string, assignmentId: string): Promise<{
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
    getSubjectPerformanceReport(schoolId: string, academicYear: string, termId: string, subjectId: string): Promise<{
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
    getClassSummaryReport(schoolId: string, academicYear: string, termId: string, classId: string, sectionId: string): Promise<any[]>;
    calculateFinalGrade(studentId: string, schoolId: string, subjectId: string, academicYear: string): Promise<{
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
    getStudentFinalGrades(studentId: string, schoolId: string, academicYear: string, classId?: string, hideLockedScores?: boolean): Promise<Array<{
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
    }>>;
    verifyParentChild(parentId: string, studentId: string, schoolId: string): Promise<boolean>;
    getChildGradesWithAnalysis(parentId: string, childId: string, schoolId: string, academicYear?: string, termId?: string): Promise<{
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
            internalNote: string | null;
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
                internalNote: string | null;
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
    private calculateGPA;
    private ensureCurrentPeriodFeesPaid;
    private resolveCurrentTermId;
    calculatePeriodRankings(academicYearId: string, termId?: string, classId?: string, sectionId?: string): Promise<{
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
    bulkUploadFromCsv(teacherId: string, schoolId: string, data: {
        csvData: string;
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
    generateGradeTemplate(teacherId: string, schoolId: string, classId: string, sectionId: string, subjectId: string, academicYear: string): Promise<string>;
    getAssessmentScoresForReview(schoolId: string, filter: GradeFilterDto): Promise<({
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
        remarks: string | null;
        assessmentSubjectId: string;
        score: number | null;
        isAbsent: boolean;
        enteredBy: string;
        enteredAt: Date;
    })[]>;
    getEntryProgress(schoolId: string, academicYear: string, term: string): Promise<{
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
    sendReminder(schoolId: string, academicYear: string, term: string): Promise<{
        remindersSent: number;
        teachers: string[];
    }>;
    getPublishChecklist(schoolId: string, academicYear: string, term: string): Promise<any[]>;
    bulkPublish(schoolId: string, assessmentIds: string[], notifyParents: boolean): Promise<import("@prisma/client").Prisma.BatchPayload>;
    getPromotionList(schoolId: string, academicYear: string): Promise<{
        studentId: string;
        studentName: string;
        currentClass: string;
        gpa: number;
        recommendation: string;
    }[]>;
    overridePromotion(schoolId: string, studentId: string, recommendation: string): Promise<{
        studentId: string;
        recommendation: string;
        status: string;
    }>;
    confirmPromotions(schoolId: string, academicYear: string, notifyParents: boolean): Promise<{
        success: boolean;
        message: string;
    }>;
    bulkConfirmPromotions(schoolId: string, academicYear: string, notifyParents: boolean): Promise<{
        success: boolean;
        message: string;
    }>;
}
