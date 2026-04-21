import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { SeatingService } from './seating.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { RequiresFeature } from '../subscription/decorators/subscription.decorator';
import { SubscriptionGuard } from '../subscription/guards/subscription.guard';
import {
  CreateSeatingPlanDto,
  SeatingPlanResponseDto,
  SeatingOverviewResponseDto,
} from './dto/seating.dto';

export interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    schoolId: string;
  };
}

@Controller('exams/seating')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
export class SeatingController {
  constructor(private readonly seatingService: SeatingService) {}

  /**
   * GET /exams/seating/plans
   * Get all seating plans for the school
   */
  @Get('plans')
  @RequiresFeature('EXAM_SEATING')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
  async getSeatingPlans(
    @Request() req: AuthRequest,
  ): Promise<SeatingPlanResponseDto[]> {
    return this.seatingService.getSeatingPlans(req.user.schoolId);
  }

  /**
   * GET /exams/seating/type/:examType/seating-plan
   * Get seating plan by exam type (MID_TERM, FINAL, etc.)
   */
  @Get('type/:examType/seating-plan')
  @RequiresFeature('EXAM_SEATING')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
  async getSeatingPlanByExamType(
    @Request() req: AuthRequest,
    @Param('examType') examType: string,
  ): Promise<SeatingPlanResponseDto | null> {
    return this.seatingService.getSeatingPlanByExamType(
      req.user.schoolId,
      examType,
    );
  }

  /**
   * POST /exams/seating/type/:examType/seating-plan
   * Create a new seating plan for an exam type
   */
  @Post('type/:examType/seating-plan')
  @RequiresFeature('EXAM_SEATING')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async createSeatingPlanByExamType(
    @Request() req: AuthRequest,
    @Param('examType') examType: string,
    @Body() dto: CreateSeatingPlanDto,
  ): Promise<SeatingPlanResponseDto> {
    return this.seatingService.createSeatingPlanByExamType(
      req.user.schoolId,
      req.user.id,
      examType,
      dto,
    );
  }

  /**
   * DELETE /exams/seating/plan/:id/students
   * Delete student assignments (for regeneration)
   */
  @Delete('plan/:id/students')
  @RequiresFeature('EXAM_SEATING')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async deleteSeatingStudents(
    @Request() req: AuthRequest,
    @Param('id') planId: string,
  ) {
    return this.seatingService.deleteSeatingStudents(req.user.schoolId, planId);
  }

  /**
   * POST /seating-plan/:id/generate
   * Generate seating assignments for a plan
   */
  @Post('plan/:id/generate')
  @RequiresFeature('EXAM_SEATING')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async generateSeating(
    @Request() req: AuthRequest,
    @Param('id') planId: string,
  ): Promise<SeatingOverviewResponseDto> {
    return this.seatingService.generateSeating(req.user.schoolId, planId);
  }

  /**
   * GET /seating-plan/:id
   * Get seating overview
   */
  @Get('plan/:id')
  @RequiresFeature('EXAM_SEATING')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
  async getSeatingOverview(
    @Request() req: AuthRequest,
    @Param('id') planId: string,
  ): Promise<SeatingOverviewResponseDto> {
    return this.seatingService.getSeatingOverview(req.user.schoolId, planId);
  }

  /**
   * GET /seating-plan/:id/print
   * Generate printable PDF seating list
   */
  @Get('plan/:id/print')
  @RequiresFeature('EXAM_SEATING')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
  async printSeatingPlan(
    @Request() req: AuthRequest,
    @Param('id') planId: string,
    @Res() res: Response,
  ): Promise<void> {
    return this.seatingService.generatePdfReport(
      req.user.schoolId,
      planId,
      res,
    );
  }

  /**
   * GET /seating-plan/:id/excel
   * Export seating to Excel
   */
  @Get('plan/:id/excel')
  @RequiresFeature('EXAM_SEATING')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.TEACHER)
  async exportSeatingExcel(
    @Request() req: AuthRequest,
    @Param('id') planId: string,
    @Res() res: Response,
  ): Promise<void> {
    return this.seatingService.generateExcelReport(
      req.user.schoolId,
      planId,
      res,
    );
  }

  /**
   * DELETE /seating-plan/:id
   * Delete seating plan and all associated data
   */
  @Delete('plan/:id')
  @RequiresFeature('EXAM_SEATING')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSeatingPlan(
    @Request() req: AuthRequest,
    @Param('id') planId: string,
  ): Promise<void> {
    return this.seatingService.deleteSeatingPlan(req.user.schoolId, planId);
  }
}
