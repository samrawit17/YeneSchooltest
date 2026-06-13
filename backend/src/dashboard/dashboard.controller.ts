import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { TeacherDashboardService } from './services/teacher.dashboard.service';
import { StudentDashboardService } from './services/student.dashboard.service';
import { ParentDashboardService } from './services/parent.dashboard.service';
import { AdminDashboardService } from './services/admin.dashboard.service';
import { RegistrarDashboardService } from './services/registrar.dashboard.service';
import { SuperadminDashboardService } from './services/superadmin.dashboard.service';
import { UniversalDashboardResponseDto } from './dto/dashboard-response.dto';
import { CacheService } from '../infrastructure/cache/cache.service';
import { CACHE_TTL } from '../infrastructure/cache/cache.constants';

// Extended request type with user
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: string;
    email?: string;
    schoolId?: string;
    permissions: string[];
  };
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(
    private readonly cacheService: CacheService,
    private readonly teacherDashboardService: TeacherDashboardService,
    private readonly studentDashboardService: StudentDashboardService,
    private readonly parentDashboardService: ParentDashboardService,
    private readonly adminDashboardService: AdminDashboardService,
    private readonly registrarDashboardService: RegistrarDashboardService,
    private readonly superadminDashboardService: SuperadminDashboardService,
  ) {}

  private getUserNamespace(userId: string, schoolId?: string) {
    return schoolId
      ? `dashboard:school:${schoolId}:user:${userId}`
      : `dashboard:user:${userId}`;
  }

  private getSchoolNamespace(schoolId: string) {
    return `dashboard:school:${schoolId}`;
  }

  private async getCachedDashboard(
    scope: 'user' | 'school',
    user: AuthenticatedRequest['user'],
    cacheKey: string,
    factory: () => Promise<UniversalDashboardResponseDto>,
  ): Promise<UniversalDashboardResponseDto> {
    const namespace =
      scope === 'school' && user.schoolId
        ? this.getSchoolNamespace(user.schoolId)
        : this.getUserNamespace(user.id, user.schoolId);

    const ttl =
      scope === 'school' ? CACHE_TTL.DASHBOARD_SCHOOL : CACHE_TTL.DASHBOARD_USER;

    return this.cacheService.getOrSetVersioned(
      namespace,
      cacheKey,
      ttl,
      factory,
    );
  }

  @Get()
  @Permissions('dashboard:view')
  async getDashboard(
    @Req() req: AuthenticatedRequest,
  ): Promise<UniversalDashboardResponseDto> {
    const { id: userId, role, schoolId, permissions } = req.user;

    // Dashboard content is role-filtered, not permission-filtered
    // All roles with dashboard:view get access, content is filtered by role
    switch (role) {
      case 'SUPER_ADMIN':
        return this.getCachedDashboard(
          'user',
          req.user,
          'overview:superadmin',
          () => this.superadminDashboardService.getDashboard(userId),
        );
      case 'ADMIN':
      case 'IT_MANAGER':
        return this.getCachedDashboard(
          'school',
          req.user,
          `overview:${role.toLowerCase()}`,
          () =>
            this.adminDashboardService.getDashboard(userId, schoolId, {
              role,
              permissions,
            }),
        );
      case 'REGISTRAR':
        return this.getCachedDashboard(
          'school',
          req.user,
          'overview:registrar',
          () => this.registrarDashboardService.getDashboard(userId, schoolId),
        );
      case 'FINANCE':
        return this.getCachedDashboard(
          'school',
          req.user,
          `overview:${role}`,
          () =>
            this.adminDashboardService.getDashboard(userId, schoolId, {
              role,
              permissions,
            }),
        );
      case 'TEACHER':
        return this.getCachedDashboard(
          'user',
          req.user,
          'overview:teacher',
          () => this.teacherDashboardService.getDashboard(userId, schoolId!),
        );
      case 'STUDENT':
        return this.getCachedDashboard(
          'user',
          req.user,
          'overview:student',
          () => this.studentDashboardService.getDashboard(userId, schoolId!),
        );
      case 'PARENT':
        return this.getCachedDashboard(
          'user',
          req.user,
          'overview:parent',
          () =>
            this.parentDashboardService.getDashboard(
              userId,
              schoolId,
              req.user.email,
            ),
        );
      default:
        throw new Error('Dashboard not available for your role');
    }
  }

  // Role-specific endpoints (optional, for direct access)
  @Get('teacher')
  @Permissions('dashboard:view')
  async getTeacherDashboard(
    @Req() req: AuthenticatedRequest,
  ): Promise<UniversalDashboardResponseDto> {
    return this.getCachedDashboard('user', req.user, 'teacher', () =>
      this.teacherDashboardService.getDashboard(
        req.user.id,
        req.user.schoolId!,
      ),
    );
  }

  @Get('student')
  @Permissions('dashboard:view')
  async getStudentDashboard(
    @Req() req: AuthenticatedRequest,
  ): Promise<UniversalDashboardResponseDto> {
    return this.getCachedDashboard('user', req.user, 'student', () =>
      this.studentDashboardService.getDashboard(
        req.user.id,
        req.user.schoolId!,
      ),
    );
  }

  @Get('parent')
  @Permissions('dashboard:view')
  async getParentDashboard(
    @Req() req: AuthenticatedRequest,
  ): Promise<UniversalDashboardResponseDto> {
    return this.getCachedDashboard('user', req.user, 'parent', () =>
      this.parentDashboardService.getDashboard(
        req.user.id,
        req.user.schoolId,
        req.user.email,
      ),
    );
  }

  @Get('admin')
  @Permissions('dashboard:view')
  async getAdminDashboard(
    @Req() req: AuthenticatedRequest,
  ): Promise<UniversalDashboardResponseDto> {
    return this.getCachedDashboard(
      'school',
      req.user,
      `admin:${req.user.role}`,
      () =>
        this.adminDashboardService.getDashboard(
          req.user.id,
          req.user.schoolId,
          {
            role: req.user.role,
            permissions: req.user.permissions || [],
          },
        ),
    );
  }

  @Get('admin/teacher-leaderboard')
  @Permissions('dashboard:view')
  async getTeacherLeaderboard(@Req() req: AuthenticatedRequest) {
    return this.getCachedDashboard(
      'school',
      req.user,
      `teacher-leaderboard:${req.user.role}`,
      async () => ({
        stats: {},
        alerts: [],
        quickActions: [],
        charts: {},
        metadata: {
          schoolId: req.user.schoolId,
          teacherLeaderboard:
            req.user.schoolId && req.user.role === 'ADMIN'
              ? await this.adminDashboardService.getTeacherLeaderboard(
                  req.user.schoolId,
                )
              : [],
          generatedAt: new Date(),
        },
      }),
    );
  }

  @Get('it-manager')
  @Permissions('dashboard:view')
  async getItManagerDashboard(
    @Req() req: AuthenticatedRequest,
  ): Promise<UniversalDashboardResponseDto> {
    return this.getCachedDashboard(
      'school',
      req.user,
      'it-manager',
      () =>
        this.adminDashboardService.getDashboard(
          req.user.id,
          req.user.schoolId,
          {
            role: req.user.role,
            permissions: req.user.permissions || [],
          },
        ),
    );
  }

  @Get('registrar')
  @Permissions('dashboard:view')
  async getRegistrarDashboard(
    @Req() req: AuthenticatedRequest,
  ): Promise<UniversalDashboardResponseDto> {
    return this.getCachedDashboard('school', req.user, 'registrar', () =>
      this.registrarDashboardService.getDashboard(
        req.user.id,
        req.user.schoolId,
      ),
    );
  }

  @Get('superadmin')
  @Permissions('dashboard:view')
  async getSuperadminDashboard(
    @Req() req: AuthenticatedRequest,
  ): Promise<UniversalDashboardResponseDto> {
    return this.getCachedDashboard('user', req.user, 'superadmin', () =>
      this.superadminDashboardService.getDashboard(req.user.id),
    );
  }
}
