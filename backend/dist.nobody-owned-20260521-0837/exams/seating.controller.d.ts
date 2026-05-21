import type { Response } from 'express';
import { SeatingService } from './seating.service';
import { CreateSeatingPlanDto, SeatingPlanResponseDto, SeatingOverviewResponseDto } from './dto/seating.dto';
export interface AuthRequest extends Request {
    user: {
        id: string;
        email: string;
        role: string;
        schoolId: string;
    };
}
export declare class SeatingController {
    private readonly seatingService;
    constructor(seatingService: SeatingService);
    getSeatingPlans(req: AuthRequest): Promise<SeatingPlanResponseDto[]>;
    getSeatingPlanByExamType(req: AuthRequest, examType: string): Promise<SeatingPlanResponseDto | null>;
    createSeatingPlanByExamType(req: AuthRequest, examType: string, dto: CreateSeatingPlanDto): Promise<SeatingPlanResponseDto>;
    deleteSeatingStudents(req: AuthRequest, planId: string): Promise<{
        message: string;
    }>;
    generateSeating(req: AuthRequest, planId: string): Promise<SeatingOverviewResponseDto>;
    getSeatingOverview(req: AuthRequest, planId: string): Promise<SeatingOverviewResponseDto>;
    printSeatingPlan(req: AuthRequest, planId: string, res: Response): Promise<void>;
    exportSeatingExcel(req: AuthRequest, planId: string, res: Response): Promise<void>;
    deleteSeatingPlan(req: AuthRequest, planId: string): Promise<void>;
}
