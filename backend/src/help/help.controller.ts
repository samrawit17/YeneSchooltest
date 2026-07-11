import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { HelpService } from './help.service';
import { QueryHelpDto } from './dto/help.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';

@Controller('help')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HelpController {
  constructor(private readonly helpService: HelpService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.TEACHER, Role.STUDENT, Role.PARENT, Role.FINANCE)
  async query(@Query() dto: QueryHelpDto) {
    if (dto.query) {
      return this.helpService.searchArticles(dto.query, dto.role);
    }
    return this.helpService.findByRole(dto.role || 'TEACHER', dto.schoolId);
  }
}
