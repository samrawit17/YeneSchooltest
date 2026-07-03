import { AssessmentsService } from './assessments.service';
import { AddAssessmentSubjectsDto, CreateAssessmentDto, ListAssessmentsFilterDto, SaveAssessmentScoresDto, UpdateAssessmentDto, UpdateAssessmentWeightsDto } from './dto/assessments.dto';
interface AuthRequest {
    user: {
        id: string;
        role: string;
        schoolId: string;
    };
}
export declare class AssessmentsController {
    private readonly assessmentsService;
    constructor(assessmentsService: AssessmentsService);
    getTeacherAssessments(req: AuthRequest, query: ListAssessmentsFilterDto): Promise<{
        id: string;
        assessmentId: string;
        title: string;
        type: string;
        status: import("@prisma/client").$Enums.AssessmentStatus;
        academicYear: {
            id: string;
            name: string;
        };
        term: {
            id: string;
            name: string;
        } | null;
        class: {
            id: string;
            name: string;
        };
        section: {
            id: string;
            name: string;
        } | null;
        subject: {
            id: string;
            name: string;
        };
        maxScore: number;
        startDate: Date;
        endDate: Date;
        scoreEntries: number;
        scoreStatus: string;
        canCreate: boolean;
        canEditScores: boolean;
        isReadOnly: boolean;
    }[]>;
    getScoreEntry(req: AuthRequest, id: string): Promise<{
        id: string;
        maxScore: number;
        subject: {
            id: string;
            name: string;
        };
        class: {
            id: string;
            name: string;
        };
        section: {
            id: string;
            name: string;
        } | null;
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
        students: {
            studentId: string;
            studentName: string;
            rollNumber: string | null;
            sectionName: string;
            score: number | null;
            isAbsent: boolean;
            remarks: string | null;
            status: import("@prisma/client").$Enums.AssessmentScoreStatus;
        }[];
    }>;
    saveScores(req: AuthRequest, id: string, dto: SaveAssessmentScoresDto): Promise<{
        id: string;
        maxScore: number;
        subject: {
            id: string;
            name: string;
        };
        class: {
            id: string;
            name: string;
        };
        section: {
            id: string;
            name: string;
        } | null;
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
        students: {
            studentId: string;
            studentName: string;
            rollNumber: string | null;
            sectionName: string;
            score: number | null;
            isAbsent: boolean;
            remarks: string | null;
            status: import("@prisma/client").$Enums.AssessmentScoreStatus;
        }[];
    }>;
    getStudentUpcoming(req: AuthRequest, academicYearId?: string): Promise<({
        subject: {
            id: string;
            name: string;
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
        scores: {
            status: import("@prisma/client").$Enums.AssessmentScoreStatus;
            score: number | null;
        }[];
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
    })[]>;
    getStudentResults(req: AuthRequest, academicYearId?: string, termId?: string): Promise<{
        subjectId: string;
        subjectName: string;
        termName: string | null;
        assessments: Array<Record<string, unknown>>;
        summary: {
            quizAverage: number | null;
            testAverage: number | null;
            midAverage: number | null;
            finalAverage: number | null;
            totalScore: number | null;
            gradeLetter: string | null;
            gradePoint: number | null;
        };
    }[]>;
    getParentUpcoming(req: AuthRequest, childId: string, academicYearId?: string): Promise<({
        subject: {
            id: string;
            name: string;
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
        scores: {
            status: import("@prisma/client").$Enums.AssessmentScoreStatus;
            score: number | null;
        }[];
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
    })[]>;
    getParentResults(req: AuthRequest, childId: string, academicYearId?: string, termId?: string): Promise<{
        subjectId: string;
        subjectName: string;
        termName: string | null;
        assessments: Array<Record<string, unknown>>;
        summary: {
            quizAverage: number | null;
            testAverage: number | null;
            midAverage: number | null;
            finalAverage: number | null;
            totalScore: number | null;
            gradeLetter: string | null;
            gradePoint: number | null;
        };
    }[]>;
    getMissingMarks(req: AuthRequest, query: ListAssessmentsFilterDto): Promise<{
        data: {
            assessmentSubjectId: string;
            assessmentId: string;
            title: string;
            type: string;
            subject: string;
            className: string;
            sectionName: string | null;
            expectedEntries: number;
            enteredEntries: number;
            missingEntries: number;
            isLocked: boolean;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getWeights(req: AuthRequest): Promise<{
        type: string;
        percentage: number;
    }[]>;
    updateWeights(req: AuthRequest, dto: UpdateAssessmentWeightsDto): Promise<{
        type: string;
        percentage: number;
    }[]>;
    createAssessment(req: AuthRequest, dto: CreateAssessmentDto): Promise<any>;
    listAssessments(req: AuthRequest, query: ListAssessmentsFilterDto): Promise<any[]>;
    clearAssessments(req: AuthRequest): Promise<{
        success: boolean;
        deleted: number;
    }>;
    getAssessmentById(req: AuthRequest, id: string): Promise<any>;
    updateAssessment(req: AuthRequest, id: string, dto: UpdateAssessmentDto): Promise<any>;
    addSubjects(req: AuthRequest, id: string, dto: AddAssessmentSubjectsDto): Promise<any>;
    lockAssessment(req: AuthRequest, id: string): Promise<{
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
    }>;
}
export {};
