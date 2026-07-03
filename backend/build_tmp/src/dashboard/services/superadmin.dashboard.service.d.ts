import { PrismaService } from '../../prisma/prisma.service';
import { UniversalDashboardResponseDto } from '../dto/dashboard-response.dto';
export declare class SuperadminDashboardService {
    private prisma;
    constructor(prisma: PrismaService);
    getDashboard(userId: string): Promise<UniversalDashboardResponseDto>;
}
