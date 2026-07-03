import { PrismaService } from '../../prisma/prisma.service';
import { UniversalDashboardResponseDto } from '../dto/dashboard-response.dto';
export declare class AdminDashboardService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private percent;
    getTeacherLeaderboard(schoolId: string): Promise<{
        rank: number;
        teacherId: string;
        teacherName: string;
        teacherEmail: string | null;
        overallScore: number;
        gradingScore: number;
        attendanceScore: number;
        lessonPlanScore: number;
        gradingSubmitted: number;
        gradingOnTime: number;
        attendanceSubmitted: number;
        lessonPlans: number;
    }[]>;
    private getEmptyDashboard;
    getDashboard(userId: string, schoolId?: string, options?: {
        role?: string;
        permissions?: string[];
    }): Promise<UniversalDashboardResponseDto>;
}
