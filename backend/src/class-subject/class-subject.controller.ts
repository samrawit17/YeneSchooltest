import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ClassSubjectService } from './class-subject.service';
import { CreateClassSubjectDto } from './dto/create-class-subject.dto';
import { UpdateClassSubjectDto } from './dto/update-class-subject.dto';
import { BulkAssignDto } from './dto/bulk-assign.dto';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('class-subjects')
export class ClassSubjectController {
  constructor(private readonly classSubjectService: ClassSubjectService) {}

  @Post()
  @Permissions('class:create')
  async create(@Body() data: CreateClassSubjectDto) {
    return this.classSubjectService.create(data);
  }

  @Post('bulk-assign')
  @Permissions('class:create')
  async bulkAssign(@Body() data: BulkAssignDto) {
    return this.classSubjectService.bulkAssign(data);
  }

  @Get()
  @Permissions('class:read')
  async findAll(
    @Query('schoolId') schoolId: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.classSubjectService.findAll(schoolId, academicYearId);
  }

  @Get('matrix')
  @Permissions('class:read')
  async getMatrix(
    @Query('schoolId') schoolId: string,
    @Query('academicYearId') academicYearId: string,
  ) {
    return this.classSubjectService.getMatrixData(schoolId, academicYearId);
  }

  @Get('by-class/:classId')
  @Permissions('class:read')
  async findByClass(
    @Param('classId') classId: string,
    @Query('sectionId') sectionId?: string,
  ) {
    return this.classSubjectService.findByClass(classId, sectionId);
  }

  @Get('by-teacher/:teacherId')
  @Permissions('class:read')
  async findByTeacher(
    @Param('teacherId') teacherId: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.classSubjectService.findByTeacher(teacherId, academicYearId);
  }

  @Get(':id')
  @Permissions('class:read')
  async findOne(@Param('id') id: string) {
    return this.classSubjectService.findOne(id);
  }

  @Put(':id')
  @Permissions('class:update')
  async update(@Param('id') id: string, @Body() data: UpdateClassSubjectDto) {
    return this.classSubjectService.update(id, data);
  }

  @Delete(':id')
  @Permissions('class:delete')
  async delete(@Param('id') id: string) {
    return this.classSubjectService.delete(id);
  }
}
