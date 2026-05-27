import { PrismaService } from '../prisma/prisma.service';
import { CreateSeatingPlanDto, SeatingPlanResponseDto, SeatingOverviewResponseDto } from './dto/seating.dto';
import { Response } from 'express';
export declare class SeatingService {
    private prisma;
    private readonly logger;
    private readonly allowedBigExamTypes;
    constructor(prisma: PrismaService);
    private isSupportedExamType;
    private isFinalExamType;
    private isMidExamType;
    getSeatingPlans(schoolId: string): Promise<SeatingPlanResponseDto[]>;
    getSeatingPlanByExamId(schoolId: string, examId: string): Promise<SeatingPlanResponseDto | null>;
    getSeatingPlanByExamType(schoolId: string, examType: string): Promise<SeatingPlanResponseDto | null>;
    createSeatingPlanByExamType(schoolId: string, userId: string, examType: string, dto: CreateSeatingPlanDto): Promise<SeatingPlanResponseDto>;
    deleteSeatingStudents(schoolId: string, planId: string): Promise<{
        message: string;
    }>;
    createSeatingPlan(schoolId: string, userId: string, examId: string, dto: CreateSeatingPlanDto): Promise<SeatingPlanResponseDto>;
    generateSeating(schoolId: string, planId: string): Promise<SeatingOverviewResponseDto>;
    getSeatingPlanById(schoolId: string, planId: string): Promise<SeatingPlanResponseDto>;
    getSeatingOverview(schoolId: string, planId: string): Promise<SeatingOverviewResponseDto>;
    deleteSeatingPlan(schoolId: string, planId: string): Promise<void>;
    generatePdfReport(schoolId: string, planId: string, res: Response): Promise<void>;
    generateExcelReport(schoolId: string, planId: string, res: Response): Promise<void>;
    private shuffleArray;
    private distributeStudentsToSections;
    private orderStudentsByMidResult;
    private orderStudentsByPreviousFinalResult;
}
