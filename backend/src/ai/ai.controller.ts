import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllowSuperAdminMixedRole } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { RateLimit } from '../infrastructure/rate-limit/rate-limit.decorator';
import { ChatDto, ReportGenerateDto, AlertsQueryDto, RecommendDto } from './dto/chat.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: string;
    schoolId?: string;
    permissions: string[];
  };
}

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('chat')
  @RateLimit({ limit: 20, windowSec: 60 })
  @AllowSuperAdminMixedRole()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER, Role.PARENT, Role.STUDENT, Role.REGISTRAR, Role.FINANCE)
  async chat(@Body() dto: ChatDto, @Req() req: AuthenticatedRequest) {
    let { schoolId } = req.user;
    if (!schoolId && req.user.role === Role.SUPER_ADMIN) {
      schoolId = dto.schoolId || '';
    }
    if (!schoolId) {
      throw new BadRequestException('School context is required');
    }
    return this.aiService.chat(dto.message, {
      role: req.user.role,
      schoolId,
      studentId: dto.studentId,
      classId: dto.classId,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('report/generate')
  @RateLimit({ limit: 10, windowSec: 60 })
  @AllowSuperAdminMixedRole()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER, Role.REGISTRAR)
  async generateReport(@Body() dto: ReportGenerateDto, @Req() req: AuthenticatedRequest) {
    return this.aiService.generateReport(
      dto.studentId,
      req.user.schoolId || '',
      dto.tone,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('alerts')
  @RateLimit({ limit: 20, windowSec: 60 })
  @AllowSuperAdminMixedRole()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER)
  async getAlerts(@Query() query: AlertsQueryDto, @Req() req: AuthenticatedRequest) {
    const schoolId = req.user.schoolId;
    if (!schoolId) {
      throw new BadRequestException('School context is required');
    }
    return this.aiService.getAlerts(schoolId, query.studentId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('recommend')
  @AllowSuperAdminMixedRole()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.TEACHER, Role.PARENT)
  async getRecommendations(@Body() dto: RecommendDto, @Req() req: AuthenticatedRequest) {
    return this.aiService.getRecommendations(
      req.user.schoolId || '',
      dto.studentId,
      dto.classId,
      dto.subjectId,
    );
  }

  @Get('status')
  async getStatus() {
    return {
      configured: this.aiService.isConfigured,
      provider: this.aiService.isConfigured ? this.aiService.providerName : null,
      message: this.aiService.isConfigured
        ? `AI service is ready (${this.aiService.providerName})`
        : 'AI service is in offline mode. Set AI_API_KEY or OPENAI_API_KEY to enable.',
    };
  }
}
