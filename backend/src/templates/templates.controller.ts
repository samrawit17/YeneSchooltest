import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/types/role.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { TemplatesService } from './templates.service';

@Controller('templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  async list(@Request() req, @Query('type') type?: 'CERTIFICATE' | 'ID_CARD') {
    return this.templatesService.list(req.user.schoolId, type);
  }

  @Post('upload')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { name: string; type: 'CERTIFICATE' | 'ID_CARD' },
  ) {
    return this.templatesService.upload(req.user.schoolId, req.user.id, body, file);
  }

  @Patch(':id/activate')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  async activate(@Request() req, @Param('id') id: string) {
    return this.templatesService.activate(req.user.schoolId, id);
  }

  @Post('fields')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  async saveFields(
    @Request() req,
    @Body() body: { template_id: string; fields: Array<Record<string, any>> },
  ) {
    return this.templatesService.saveFieldMap(
      req.user.schoolId,
      body.template_id,
      body.fields || [],
    );
  }
}
