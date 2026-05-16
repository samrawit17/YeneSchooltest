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
} from '@nestjs/common';
import { ClassSubjectService } from './class-subject.service';
import { CreateClassSubjectDto } from './dto/create-class-subject.dto';
import { UpdateClassSubjectDto } from './dto/update-class-subject.dto';
import { BulkAssignDto } from './dto/bulk-assign.dto';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('class-subjects')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ClassSubjectController {
  constructor(private readonly classSubjectService: ClassSubjectService) {}

  @Post()
  @Permissions('class:create')
  async create(@Body() data: CreateClassSubjectDto, @Request() req: any) {
    return this.classSubjectService.create(data, req.user.schoolId);
  }

  @Post('bulk-assign')
  @Permissions('class:create')
  async bulkAssign(@Body() data: BulkAssignDto, @Request() req: any) {
    return this.classSubjectService.bulkAssign(data, req.user.schoolId);
  }

  @Get()
  @Permissions('class:read')
  async findAll(
    @Request() req: any,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.classSubjectService.findAll(req.user.schoolId, academicYearId);
  }

  @Get('matrix')
  @Permissions('class:read')
  async getMatrix(
    @Request() req: any,
    @Query('academicYearId') academicYearId: string,
  ) {
    return this.classSubjectService.getMatrixData(
      req.user.schoolId,
      academicYearId,
    );
  }

  @Get('by-class/:classId')
  @Permissions('class:read')
  async findByClass(
    @Param('classId') classId: string,
    @Request() req: any,
    @Query('sectionId') sectionId?: string,
  ) {
    return this.classSubjectService.findByClass(
      classId,
      req.user.schoolId,
      sectionId,
    );
  }

  @Get('by-teacher/:teacherId')
  @Permissions('class:read')
  async findByTeacher(
    @Param('teacherId') teacherId: string,
    @Request() req: any,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.classSubjectService.findByTeacher(
      teacherId,
      req.user.schoolId,
      academicYearId,
    );
  }

  @Get(':id')
  @Permissions('class:read')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.classSubjectService.findOne(id, req.user.schoolId);
  }

  @Put(':id')
  @Permissions('class:update')
  async update(
    @Param('id') id: string,
    @Body() data: UpdateClassSubjectDto,
    @Request() req: any,
  ) {
    return this.classSubjectService.update(id, data, req.user.schoolId);
  }

  @Delete(':id')
  @Permissions('class:delete')
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.classSubjectService.delete(id, req.user.schoolId);
  }
}
