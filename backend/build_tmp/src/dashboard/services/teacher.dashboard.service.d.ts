import { PrismaService } from '../../prisma/prisma.service';
import { UniversalDashboardResponseDto } from '../dto/dashboard-response.dto';
export declare class TeacherDashboardService {
    private prisma;
    constructor(prisma: PrismaService);
    getDashboard(userId: string, schoolId: string): Promise<UniversalDashboardResponseDto>;
}
