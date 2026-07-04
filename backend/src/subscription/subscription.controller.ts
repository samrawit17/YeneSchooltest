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
  UsePipes,
  ValidationPipe,
  Request,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { AssignPlanDto } from './dto/assign-plan.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { PaginationDto } from './dto/pagination.dto';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async getAllPlans(@Query() pagination?: PaginationDto) {
    try {
      return await this.subscriptionService.getAllPlans(pagination);
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
  @UsePipes(new ValidationPipe({ transform: true }))
  async createPlan(@Body() body: CreatePlanDto) {
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
  @UsePipes(new ValidationPipe({ transform: true }))
  async updatePlan(
    @Param('id') id: string,
    @Body() body: UpdatePlanDto,
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
  @UsePipes(new ValidationPipe({ transform: true }))
  async assignPlanToSchool(@Body() body: AssignPlanDto) {
    try {
      return await this.subscriptionService.assignPlanToSchool(
        body.schoolId,
        body.planId ?? null,
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
      if (error instanceof HttpException) throw error;
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
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Failed to get subscription: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('subscription')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @UsePipes(new ValidationPipe({ transform: true }))
  async createSubscription(@Body() body: CreateSubscriptionDto) {
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
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateSubscription(
    @Param('id') id: string,
    @Body() body: UpdateSubscriptionDto,
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

  @Post('subscription/:id/renew')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async renewSubscription(@Param('id') id: string) {
    console.log(`[renewSubscription] called with id: ${id}`);
    try {
      const result = await this.subscriptionService.renewSubscription(id);
      console.log(`[renewSubscription] success for id: ${id}`);
      return result;
    } catch (error) {
      console.error(`[renewSubscription] error for id: ${id}`, error.message);
      throw new HttpException(
        'Failed to renew subscription: ' + error.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('plan/:planId/schools')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async getSchoolsByPlan(
    @Param('planId') planId: string,
    @Query() pagination?: PaginationDto,
  ) {
    try {
      return await this.subscriptionService.getSchoolsByPlan(planId, pagination);
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
  async getSchoolsWithPlans(
    @Query('planId') planId?: string,
    @Query() pagination?: PaginationDto,
  ) {
    try {
      if (planId) {
        return await this.subscriptionService.getSchoolsByPlan(planId, pagination);
      }
      return await this.subscriptionService.getSchoolsWithPlans(pagination);
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
      if (!schoolId || !feature) {
        throw new BadRequestException('schoolId and feature are required');
      }
      this.assertSameSchoolOrSuperAdmin(req.user, schoolId);
      const plan = await this.subscriptionService.getSchoolPlan(schoolId);
      const hasAccess = plan
        ? this.subscriptionService.isFeatureAccessible(plan, feature)
        : false;
      return { hasAccess, feature: feature.trim().toUpperCase(), tier: plan?.tier || 'CORE' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
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
