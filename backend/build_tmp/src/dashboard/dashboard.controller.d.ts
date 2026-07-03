import { TeacherDashboardService } from './services/teacher.dashboard.service';
import { StudentDashboardService } from './services/student.dashboard.service';
import { ParentDashboardService } from './services/parent.dashboard.service';
import { AdminDashboardService } from './services/admin.dashboard.service';
import { RegistrarDashboardService } from './services/registrar.dashboard.service';
import { SuperadminDashboardService } from './services/superadmin.dashboard.service';
import { UniversalDashboardResponseDto } from './dto/dashboard-response.dto';
import { CacheService } from '../infrastructure/cache/cache.service';
interface AuthenticatedRequest extends Request {
    user: {
        id: string;
        role: string;
        email?: string;
        schoolId?: string;
        permissions: string[];
    };
}
export declare class DashboardController {
    private readonly cacheService;
    private readonly teacherDashboardService;
    private readonly studentDashboardService;
    private readonly parentDashboardService;
    private readonly adminDashboardService;
    private readonly registrarDashboardService;
    private readonly superadminDashboardService;
    constructor(cacheService: CacheService, teacherDashboardService: TeacherDashboardService, studentDashboardService: StudentDashboardService, parentDashboardService: ParentDashboardService, adminDashboardService: AdminDashboardService, registrarDashboardService: RegistrarDashboardService, superadminDashboardService: SuperadminDashboardService);
    private getUserNamespace;
    private getSchoolNamespace;
    private getCachedDashboard;
    getDashboard(req: AuthenticatedRequest): Promise<UniversalDashboardResponseDto>;
    getTeacherDashboard(req: AuthenticatedRequest): Promise<UniversalDashboardResponseDto>;
    getStudentDashboard(req: AuthenticatedRequest): Promise<UniversalDashboardResponseDto>;
    getParentDashboard(req: AuthenticatedRequest): Promise<UniversalDashboardResponseDto>;
    getAdminDashboard(req: AuthenticatedRequest): Promise<UniversalDashboardResponseDto>;
    getTeacherLeaderboard(req: AuthenticatedRequest): Promise<UniversalDashboardResponseDto>;
    getItManagerDashboard(req: AuthenticatedRequest): Promise<UniversalDashboardResponseDto>;
    getRegistrarDashboard(req: AuthenticatedRequest): Promise<UniversalDashboardResponseDto>;
    getSuperadminDashboard(req: AuthenticatedRequest): Promise<UniversalDashboardResponseDto>;
}
export {};
