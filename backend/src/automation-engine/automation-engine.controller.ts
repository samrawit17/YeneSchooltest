import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { AutomationEngineService } from './automation-engine.service';
import { CreateRuleDto, UpdateRuleDto, ToggleRuleDto, AutomationLogQueryDto } from './dto/automation-engine.dto';

@Controller('automation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AutomationEngineController {
  constructor(private readonly automationService: AutomationEngineService) {}

  @Get('rules')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.IT_MANAGER)
  listRules(@Request() req: any, @Query() query: any) {
    return this.automationService.listRules(req.user.schoolId, query);
  }

  @Get('rules/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.IT_MANAGER)
  getRule(@Request() req: any, @Param('id') id: string) {
    return this.automationService.getRule(req.user.schoolId, id);
  }

  @Post('rules')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  createRule(@Request() req: any, @Body() dto: CreateRuleDto) {
    return this.automationService.createRule(req.user.schoolId, req.user.id, dto);
  }

  @Patch('rules/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  updateRule(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateRuleDto) {
    return this.automationService.updateRule(req.user.schoolId, id, dto);
  }

  @Delete('rules/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  deleteRule(@Request() req: any, @Param('id') id: string) {
    return this.automationService.deleteRule(req.user.schoolId, id);
  }

  @Patch('rules/:id/toggle')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  toggleRule(@Request() req: any, @Param('id') id: string, @Body() dto: ToggleRuleDto) {
    return this.automationService.toggleRule(req.user.schoolId, id, dto.isActive);
  }

  @Get('logs')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.IT_MANAGER)
  getLogs(@Request() req: any, @Query() query: AutomationLogQueryDto) {
    return this.automationService.getLogs(req.user.schoolId, query);
  }

  @Get('logs/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.IT_MANAGER)
  getLog(@Request() req: any, @Param('id') id: string) {
    return this.automationService.getLog(req.user.schoolId, id);
  }

  @Get('event-types')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.IT_MANAGER)
  getEventTypes() {
    return this.automationService.getAvailableEventTypes();
  }

  @Get('action-types')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.IT_MANAGER)
  getActionTypes() {
    return this.automationService.getAvailableActionTypes();
  }
}
