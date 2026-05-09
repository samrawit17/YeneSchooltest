import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { SirenService } from './siren.service';

@Controller('api/siren')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.IT_MANAGER)
export class SirenController {
  constructor(private readonly sirenService: SirenService) {}

  // ==================== SCHEDULES (CRUD) ====================

  @Get('schedules')
  async getSchedules(@Query('schoolId') schoolId: string) {
    return this.sirenService.getSchedules(schoolId);
  }

  @Post('schedules')
  async createSchedule(@Body() data: any) {
    return this.sirenService.createSchedule(data);
  }

  @Put('schedules/:id')
  async updateSchedule(@Param('id') id: string, @Body() data: any) {
    return this.sirenService.updateSchedule(id, data);
  }

  @Delete('schedules/:id')
  async deleteSchedule(@Param('id') id: string) {
    return this.sirenService.deleteSchedule(id);
  }

  // ==================== EVENTS (HISTORY) ====================

  @Get('events')
  async getEvents(
    @Query('schoolId') schoolId: string,
    @Query('limit') limit?: string,
  ) {
    return this.sirenService.getEvents(schoolId, limit ? parseInt(limit) : 100);
  }

  // ==================== HARDWARE (CONFIG + TEST) ====================

  @Get('hardware')
  async getHardwareConfig(@Query('schoolId') schoolId: string) {
    return this.sirenService.getHardwareConfig(schoolId);
  }

  @Post('hardware')
  async saveHardwareConfig(@Body() data: any) {
    return this.sirenService.saveHardwareConfig(data);
  }

  @Put('hardware/:id')
  async updateHardwareConfig(@Param('id') id: string, @Body() data: any) {
    return this.sirenService.updateHardwareConfig(id, data);
  }

  @Post('hardware/test')
  @HttpCode(HttpStatus.OK)
  async testHardware(@Body() data: { webhookUrl: string; timeout: number }) {
    return this.sirenService.testWebhook(data.webhookUrl, data.timeout);
  }

  // ==================== MANUAL TRIGGER ====================

  @Post('trigger')
  @HttpCode(HttpStatus.OK)
  async manualTrigger(@Body() data: { schoolId: string; type: string }) {
    return this.sirenService.manualTrigger(data.schoolId, data.type);
  }
}
