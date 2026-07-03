import { PrismaService } from '../../prisma/prisma.service';
import { UniversalDashboardResponseDto } from '../dto/dashboard-response.dto';
export declare class ParentDashboardService {
    private prisma;
    constructor(prisma: PrismaService);
    private scoreToLetter;
    getDashboard(userId: string, schoolId?: string, userEmail?: string): Promise<UniversalDashboardResponseDto>;
}
