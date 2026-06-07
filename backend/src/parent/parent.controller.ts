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
  Request,
  UsePipes,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { ParentService } from './parent.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateParentDto,
  UpdateParentDto,
  LinkParentToStudentDto,
  CreateParentAndLinkDto,
} from './dto/parent.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';

@Controller('parents')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ParentController {
  constructor(private readonly parentService: ParentService) {}

  private requireSchoolId(req: any): string {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      throw new BadRequestException('School context is required');
    }
    return schoolId;
  }

  // ==================== PARENT ENDPOINTS (for own profile) ====================

  /**
   * Get current parent's profile with children
   * Parent can only view their own profile
   */
  @Get('me/profile')
  @Roles(Role.PARENT)
  async getMyProfile(@Request() req) {
    return this.parentService.getParentByUserId(
      req.user.id,
      this.requireSchoolId(req),
    );
  }

  /**
   * Get current parent's children
   * Parent can only view their own children
   */
  @Get('me/children')
  @Roles(Role.PARENT)
  async getMyChildren(@Request() req) {
    const children = await this.parentService.getChildrenByParentUserId(
      req.user.id,
      this.requireSchoolId(req),
    );
    return { children };
  }

  @Get('me/teachers')
  @Roles(Role.PARENT)
  async getMyRelatedTeachers(@Request() req) {
    const teachers = await this.parentService.getRelatedTeachersByParentUserId(
      req.user.id,
      this.requireSchoolId(req),
    );
    return { teachers };
  }

  /**
   * Get a specific child details for current parent
   * Parent can only view their own children's details
   */
  @Get('me/children/:childId')
  @Roles(Role.PARENT)
  async getMyChildById(@Param('childId') childId: string, @Request() req) {
    return this.parentService.getChildByIdForParent(
      req.user.id,
      childId,
      this.requireSchoolId(req),
    );
  }

  // ==================== ADMIN ONLY ENDPOINTS ====================

  /**
   * Get all parents for a school
   * School read roles can view parent directory
   */
  @Get()
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  @Permissions('parent:read')
  async getParents(
    @Request() req,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('children') children?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.parentService.getParents(this.requireSchoolId(req), {
      search,
      page: pageNum,
      limit: limitNum,
      status,
      children,
    });
  }

  /**
   * Get parent by ID
   * School read roles can view parent profiles
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  @Permissions('parent:read')
  async getParentById(@Param('id') parentId: string, @Request() req) {
    return this.parentService.getParentById(parentId, this.requireSchoolId(req));
  }

  /**
   * Update parent profile
   * ADMIN and REGISTRAR can update parent profiles
   */
  @Put(':id')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('parent:update')
  async updateParent(
    @Param('id') parentId: string,
    @Body() updateDto: UpdateParentDto,
    @Request() req,
  ) {
    const schoolId = this.requireSchoolId(req);
    return this.parentService.updateParent(
      parentId,
      schoolId,
      updateDto,
    );
  }

  /**
   * Create a new parent (without linking to student)
   * ADMIN and REGISTRAR can create parents
   */
  @Post()
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('parent:create')
  async createParent(@Body() createParentDto: CreateParentDto, @Request() req) {
    const schoolId = this.requireSchoolId(req);

    return this.parentService.createParent(
      { ...createParentDto, schoolId },
      req.user.id,
    );
  }

  /**
   * Create parent and link to student in one operation
   * This is the recommended flow for adding parents
   * ADMIN and REGISTRAR can perform this action
   */
  @Post('create-and-link')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('parent:create', 'parent:link_student')
  async createParentAndLink(
    @Body() createParentAndLinkDto: CreateParentAndLinkDto,
    @Request() req,
  ) {
    return this.parentService.createParentAndLink(
      createParentAndLinkDto,
      req.user.id,
      this.requireSchoolId(req),
    );
  }

  /**
   * Link existing parent to student
   * ADMIN and REGISTRAR can perform this action
   */
  @Post('link')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('parent:link_student')
  async linkParentToStudent(
    @Body() linkDto: LinkParentToStudentDto,
    @Request() req,
  ) {
    return this.parentService.linkParentToStudent(
      linkDto,
      this.requireSchoolId(req),
    );
  }

  /**
   * Unlink parent from student
   * ADMIN and REGISTRAR can perform this action
   */
  @Delete('unlink/:parentId/:studentId')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('parent:unlink_student')
  async unlinkParentFromStudent(
    @Param('parentId') parentId: string,
    @Param('studentId') studentId: string,
    @Request() req,
  ) {
    return this.parentService.unlinkParentFromStudent(
      parentId,
      studentId,
      this.requireSchoolId(req),
    );
  }
}
