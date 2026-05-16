import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { PlanTier } from '@prisma/client';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('plans')
  @UseGuards(JwtAuthGuard)
  async getAllPlans() {
    try {
      return await this.subscriptionService.getAllPlans();
    } catch (error) {
      throw new HttpException(
        'Failed to get plans: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async getPlanById(@Param('id') id: string) {
    try {
      const plan = await this.subscriptionService.getPlanById(id);
      if (!plan) {
        throw new HttpException('Plan not found', HttpStatus.NOT_FOUND);
      }
      return plan;
    } catch (error) {
      throw new HttpException(
        'Failed to get plan: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async createPlan(
    @Body()
    body: {
      name: string;
      tier: PlanTier;
      description?: string;
      features: string[];
    },
  ) {
    try {
      return await this.subscriptionService.createPlan(body);
    } catch (error) {
      throw new HttpException(
        'Failed to create plan: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async updatePlan(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      features?: string[];
      isActive?: boolean;
    },
  ) {
    try {
      const plan = await this.subscriptionService.updatePlan(id, body);
      if (!plan) {
        throw new HttpException('Plan not found', HttpStatus.NOT_FOUND);
      }
      return plan;
    } catch (error) {
      throw new HttpException(
        'Failed to update plan: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async deletePlan(@Param('id') id: string) {
    try {
      return await this.subscriptionService.deletePlan(id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete plan',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async assignPlanToSchool(@Body() body: { schoolId: string; planId: string | null }) {
    try {
      return await this.subscriptionService.assignPlanToSchool(
        body.schoolId,
        body.planId,
      );
    } catch (error) {
      throw new HttpException(
        'Failed to assign plan: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('school/:schoolId')
  @UseGuards(JwtAuthGuard)
  async getSchoolPlan(@Request() req: any, @Param('schoolId') schoolId: string) {
    try {
      this.assertSameSchoolOrSuperAdmin(req.user, schoolId);
      const plan = await this.subscriptionService.getSchoolPlan(schoolId);
      return plan || { tier: 'CORE', features: [] };
    } catch (error) {
      throw new HttpException(
        'Failed to get school plan: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('school/:schoolId/subscription')
  @UseGuards(JwtAuthGuard)
  async getSchoolSubscription(@Request() req: any, @Param('schoolId') schoolId: string) {
    try {
      this.assertSameSchoolOrSuperAdmin(req.user, schoolId);
      return await this.subscriptionService.getSchoolSubscription(schoolId);
    } catch (error) {
      throw new HttpException(
        'Failed to get subscription: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('subscription')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async createSubscription(
    @Body()
    body: {
      schoolId: string;
      planId: string;
      endDate?: string;
    },
  ) {
    try {
      return await this.subscriptionService.createSubscription({
        ...body,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      });
    } catch (error) {
      throw new HttpException(
        'Failed to create subscription: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('subscription/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async updateSubscription(
    @Param('id') id: string,
    @Body() body: { status?: string; endDate?: string },
  ) {
    try {
      return await this.subscriptionService.updateSubscription(id, {
        ...body,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      });
    } catch (error) {
      throw new HttpException(
        'Failed to update subscription: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('plan/:planId/schools')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async getSchoolsByPlan(@Param('planId') planId: string) {
    try {
      return await this.subscriptionService.getSchoolsByPlan(planId);
    } catch (error) {
      throw new HttpException(
        'Failed to get schools: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('schools')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async getSchoolsWithPlans(@Query('planId') planId?: string) {
    try {
      if (planId) {
        return await this.subscriptionService.getSchoolsByPlan(planId);
      }
      return await this.subscriptionService.getSchoolsWithPlans();
    } catch (error) {
      throw new HttpException(
        'Failed to get schools: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('check-feature')
  @UseGuards(JwtAuthGuard)
  async checkFeature(
    @Request() req: any,
    @Query('schoolId') schoolId: string,
    @Query('feature') feature: string,
  ) {
    try {
      this.assertSameSchoolOrSuperAdmin(req.user, schoolId);
      const plan = await this.subscriptionService.getSchoolPlan(schoolId);
      const hasAccess = plan
        ? this.subscriptionService.isFeatureAccessible(plan, feature)
        : false;
      return { hasAccess, feature, tier: plan?.tier || 'CORE' };
    } catch (error) {
      throw new HttpException(
        'Failed to check feature: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private assertSameSchoolOrSuperAdmin(user: any, schoolId: string) {
    if (user?.role === Role.SUPER_ADMIN) return;
    if (user?.schoolId && user.schoolId === schoolId) return;
    throw new ForbiddenException('You can only access your own school subscription');
  }
}
