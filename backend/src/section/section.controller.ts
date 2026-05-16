import {
  Controller,
  BadRequestException,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { SectionService } from './section.service';
import { Role } from '../auth/types/role.enum';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: Role;
    schoolId?: string;
  };
}

@Controller('sections')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class SectionController {
  constructor(
    private sectionService: SectionService,
    private prismaService: PrismaService,
  ) {}

  // Note: Section creation is now handled automatically via bulk upload
  // Manual section creation is disabled to maintain randomized distribution

  @Get()
  @Permissions('section:read')
  async findAll(
    @Query('classId') classId?: string,
    @Query('classIds') classIds?: string, // Handle comma-separated list
    @Query('search') search?: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    const schoolId = req?.user?.schoolId;

    if (search && schoolId) {
      return this.sectionService.search(schoolId, search);
    }

    const ids = classIds ? classIds.split(',') : undefined;
    return this.sectionService.findAll(schoolId, classId, ids);
  }

  @Get(':id')
  @Permissions('section:read')
  async findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const schoolId = req.user.schoolId;
    if (!schoolId) return { success: false, message: 'School ID is required' };
    return this.sectionService.findOne(id, schoolId);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  @Permissions('section:update')
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const schoolId = req.user.schoolId;
    if (!schoolId) return { success: false, message: 'School ID is required' };
    return this.sectionService.update(id, schoolId, {
      name: body.name,
      capacity: body.capacity,
      roomNumber: body.roomNumber,
      homeroomTeacherId: body.homeroomTeacherId,
    });
  }

  // Note: Section deletion is not included in the new permission philosophy

  // Note: Auto-creation is also handled via bulk upload

  @Put(':id/homeroom-teacher')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  @Permissions('section:update')
  async setHomeroomTeacher(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: AuthenticatedRequest,
  ) {
    const schoolId = req.user.schoolId;
    if (!schoolId) return { success: false, message: 'School ID is required' };
    return this.sectionService.update(id, schoolId, {
      homeroomTeacherId: body.homeroomTeacherId,
    });
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  @Permissions('section:delete')
  async delete(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const schoolId = req.user.schoolId;
    if (!schoolId) return { success: false, message: 'School ID is required' };
    return this.sectionService.delete(id, schoolId);
  }

  /**
   * Sync all section capacities to match school setting DEFAULT_SECTION_CAPACITY
   */
  @Put('sync-capacity')
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  @Permissions('section:update')
  async syncCapacity(@Request() req: AuthenticatedRequest) {
    const schoolId = req.user.schoolId;
    if (!schoolId) {
      return { status: 'error', message: 'School ID not found' };
    }

    // Get the configured capacity from school settings
    const capacitySetting = await this.prismaService.schoolSetting.findUnique({
      where: { schoolId_key: { schoolId, key: 'DEFAULT_SECTION_CAPACITY' } },
    });

    let newCapacity = 30;
    if (capacitySetting?.value) {
      const parsed =
        typeof capacitySetting.value === 'number'
          ? capacitySetting.value
          : parseInt(capacitySetting.value, 10);
      if (!isNaN(parsed) && parsed > 0) {
        newCapacity = parsed;
      }
    }

    // Update all sections for this school
    const sections = await this.prismaService.section.findMany({
      where: { class: { schoolId } },
      include: {
        class: true,
        _count: {
          select: { studentClasses: true },
        },
      },
    });

    const overCapacitySections = sections.filter(
      (section) => section._count.studentClasses > newCapacity,
    );

    if (overCapacitySections.length > 0) {
      const sectionNames = overCapacitySections
        .slice(0, 5)
        .map(
          (section) =>
            `${section.class.name}-${section.name} (${section._count.studentClasses})`,
        )
        .join(', ');

      throw new BadRequestException(
        `Cannot sync capacity to ${newCapacity}. Some sections already exceed that enrollment: ${sectionNames}`,
      );
    }

    await this.prismaService.$transaction(
      sections.map((section) =>
        this.prismaService.section.update({
          where: { id: section.id },
          data: { capacity: newCapacity },
        }),
      ),
    );

    return {
      status: 'success',
      message: `Updated ${sections.length} sections to capacity ${newCapacity}`,
      updatedCount: sections.length,
      newCapacity,
    };
  }
}
