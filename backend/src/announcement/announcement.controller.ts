import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseBoolPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { AnnouncementService } from './announcement.service';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from './dto/announcement.dto';
import { StorageService } from '../storage/storage.service';
import { Role } from '../auth/types/role.enum';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: Role;
    schoolId?: string;
  };
}

@Controller('announcements')
export class AnnouncementController {
  constructor(
    private readonly announcementService: AnnouncementService,
    private readonly storageService: StorageService,
  ) {}

  @Get('public')
  async findPublic(@Query('schoolId') schoolId?: string) {
    return this.announcementService.findPublic(schoolId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  @Permissions('announcement:create')
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() body: CreateAnnouncementDto,
  ) {
    const schoolId = req.user.schoolId;
    if (!schoolId) {
      return { success: false, message: 'School ID is required' };
    }
    return this.announcementService.create(body, req.user.id, schoolId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Permissions('announcement:read')
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('role') role?: string,
  ) {
    const schoolId = req.user.schoolId;
    if (!schoolId) {
      return { success: false, message: 'School ID is required' };
    }
    const userRole = role || req.user.role;
    return this.announcementService.findAll(schoolId, userRole, req.user.id);
  }

  @Get('active-count')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  async getActiveCount(
    @Request() req: AuthenticatedRequest,
    @Query('role') role?: string,
  ) {
    const schoolId = req.user.schoolId;
    if (!schoolId) {
      return { success: false, message: 'School ID is required' };
    }
    const userRole = role || req.user.role;
    const count = await this.announcementService.getActiveCount(
      schoolId,
      userRole,
    );
    return { count };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Permissions('announcement:read')
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const schoolId = req.user.schoolId;
    if (!schoolId) {
      return { success: false, message: 'School ID is required' };
    }
    return this.announcementService.findOne(id, schoolId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  @Permissions('announcement:update')
  async update(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: UpdateAnnouncementDto,
  ) {
    const schoolId = req.user.schoolId;
    if (!schoolId) {
      return { success: false, message: 'School ID is required' };
    }
    return this.announcementService.update(id, body, req.user.id, schoolId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  @Permissions('announcement:delete')
  async delete(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const schoolId = req.user.schoolId;
    if (!schoolId) {
      return { success: false, message: 'School ID is required' };
    }
    return this.announcementService.delete(id, schoolId);
  }

  @Post(':id/attach')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  @Permissions('announcement:update')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async attachFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthenticatedRequest,
  ) {
    const schoolId = req.user.schoolId;
    if (!schoolId) throw new BadRequestException('School ID is required');
    if (!file) throw new BadRequestException('File is required');

    const stored = await this.storageService.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      { schoolId, folder: 'announcements' },
    );

    return this.announcementService.addAttachment(id, schoolId, {
      name: file.originalname,
      url: stored.url,
      mimeType: file.mimetype,
      size: file.size,
    });
  }

  @Delete(':id/attach/:attachmentIndex')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  @Permissions('announcement:update')
  async removeAttachment(
    @Param('id') id: string,
    @Param('attachmentIndex', ParseIntPipe) attachmentIndex: number,
    @Request() req: AuthenticatedRequest,
  ) {
    const schoolId = req.user.schoolId;
    if (!schoolId) throw new BadRequestException('School ID is required');
    return this.announcementService.removeAttachment(id, schoolId, attachmentIndex);
  }

  @Patch(':id/pin')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  @Permissions('announcement:update')
  async togglePin(
    @Param('id') id: string,
    @Body('pinned', ParseBoolPipe) pinned: boolean,
    @Request() req: AuthenticatedRequest,
  ) {
    const schoolId = req.user.schoolId;
    if (!schoolId) throw new BadRequestException('School ID is required');
    return this.announcementService.update(id, { isPinned: pinned }, req.user.id, schoolId);
  }
}
