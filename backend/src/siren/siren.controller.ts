import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { SirenService } from './siren.service';
import { RequiresFeature } from '../subscription/decorators/subscription.decorator';
import { SubscriptionGuard } from '../subscription/guards/subscription.guard';

@Controller('api/siren')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@Roles(Role.ADMIN, Role.IT_MANAGER)
@RequiresFeature('SIREN_ALERT')
export class SirenController {
  constructor(private readonly sirenService: SirenService) {}

  // ==================== SCHEDULES (CRUD) ====================

  @Get('schedules')
  async getSchedules(@Request() req: any) {
    return this.sirenService.getSchedules(req.user.schoolId);
  }

  @Post('schedules')
  async createSchedule(@Request() req: any, @Body() data: any) {
    return this.sirenService.createSchedule(req.user.schoolId, data);
  }

  @Put('schedules/:id')
  async updateSchedule(
    @Request() req: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.sirenService.updateSchedule(req.user.schoolId, id, data);
  }

  @Delete('schedules/:id')
  async deleteSchedule(@Request() req: any, @Param('id') id: string) {
    return this.sirenService.deleteSchedule(req.user.schoolId, id);
  }

  // ==================== EVENTS (HISTORY) ====================

  @Get('events')
  async getEvents(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    return this.sirenService.getEvents(
      req.user.schoolId,
      limit ? parseInt(limit) : 100,
    );
  }

  // ==================== HARDWARE (CONFIG + TEST) ====================

  @Get('hardware')
  async getHardwareConfig(@Request() req: any) {
    return this.sirenService.getHardwareConfig(req.user.schoolId);
  }

  @Post('hardware')
  async saveHardwareConfig(@Request() req: any, @Body() data: any) {
    return this.sirenService.saveHardwareConfig(req.user.schoolId, data);
  }

  @Put('hardware/:id')
  async updateHardwareConfig(
    @Request() req: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.sirenService.updateHardwareConfig(req.user.schoolId, id, data);
  }

  @Post('hardware/test')
  @HttpCode(HttpStatus.OK)
  async testHardware(@Body() data: { webhookUrl: string; timeout: number }) {
    return this.sirenService.testWebhook(data.webhookUrl, data.timeout);
  }

  // ==================== MANUAL TRIGGER ====================

  @Post('trigger')
  @HttpCode(HttpStatus.OK)
  async manualTrigger(@Request() req: any, @Body() data: { type: string }) {
    return this.sirenService.manualTrigger(req.user.schoolId, data.type);
  }
}
