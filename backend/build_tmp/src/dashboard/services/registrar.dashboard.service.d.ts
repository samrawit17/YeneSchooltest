import { PrismaService } from '../../prisma/prisma.service';
import { UniversalDashboardResponseDto } from '../dto/dashboard-response.dto';
export declare class RegistrarDashboardService {
    private prisma;
    private readonly logger;
    private readonly gradeSystemRanges;
    constructor(prisma: PrismaService);
    private getSchoolGradeRange;
    private getEmptyDashboard;
    getDashboard(userId: string, schoolId?: string): Promise<UniversalDashboardResponseDto>;
}
