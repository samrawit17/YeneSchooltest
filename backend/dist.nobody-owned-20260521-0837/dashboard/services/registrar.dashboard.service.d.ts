import { PrismaService } from '../../prisma/prisma.service';
import { UniversalDashboardResponseDto } from '../dto/dashboard-response.dto';
export declare class RegistrarDashboardService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private getEmptyDashboard;
    getDashboard(userId: string, schoolId?: string): Promise<UniversalDashboardResponseDto>;
}
