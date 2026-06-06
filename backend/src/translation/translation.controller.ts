import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { TranslateBatchDto, TranslateTextDto } from './dto/translate-text.dto';
import { TranslationService } from './translation.service';

@Controller('translations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.IT_MANAGER,
  Role.REGISTRAR,
  Role.TEACHER,
  Role.STUDENT,
  Role.PARENT,
  Role.FINANCE,
)
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @Get('config')
  getConfig() {
    return this.translationService.getClientConfig();
  }

  @Post()
  translate(@Request() req: any, @Body() dto: TranslateTextDto) {
    return this.translationService.translateText(this.getContext(req), dto);
  }

  @Post('batch')
  translateBatch(@Request() req: any, @Body() dto: TranslateBatchDto) {
    return this.translationService.translateBatch(this.getContext(req), dto);
  }

  private getContext(req: any) {
    const user = req.user;
    if (!user?.id) {
      throw new ForbiddenException('Authenticated user is required');
    }

    return {
      userId: user.id,
      role: user.role,
      schoolId: user.schoolId || null,
    };
  }
}
