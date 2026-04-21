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
} from '@nestjs/common';
import { HrService } from './hr.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeQueryDto,
} from './dto/employee.dto';
import {
  CreatePayrollDto,
  ProcessPayrollDto,
  PayrollQueryDto,
  CreateSalaryStructureDto,
  BulkAttendanceDto,
  AttendanceQueryDto,
} from './dto/payroll.dto';

interface AuthRequest {
  user: {
    id: string;
    schoolId: string;
    role: string;
  };
}

@Controller('hr')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class HrController {
  constructor(private readonly hrService: HrService) {}

  // ==================== EMPLOYEE MANAGEMENT ====================

  @Post('employees')
  @Permissions('employee:create')
  async createEmployee(
    @Request() req: AuthRequest,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.hrService.createEmployee(req.user.schoolId, dto, req.user.id);
  }

  @Get('employees')
  @Permissions('employee:read')
  async getEmployees(
    @Request() req: AuthRequest,
    @Query() query: EmployeeQueryDto,
  ) {
    return this.hrService.getEmployees(req.user.schoolId, query);
  }

  @Get('employees/:id')
  @Permissions('employee:read')
  async getEmployeeById(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.hrService.getEmployeeById(req.user.schoolId, id);
  }

  @Put('employees/:id')
  @Permissions('employee:update')
  async updateEmployee(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.hrService.updateEmployee(req.user.schoolId, id, dto);
  }

  @Delete('employees/:id')
  @Permissions('employee:delete')
  async deleteEmployee(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.hrService.deleteEmployee(req.user.schoolId, id);
  }

  // ==================== PAYROLL MANAGEMENT (HR) ====================

  @Post('payroll')
  @Permissions('payroll:create')
  async createPayroll(
    @Request() req: AuthRequest,
    @Body() dto: CreatePayrollDto,
  ) {
    return this.hrService.createPayroll(req.user.schoolId, dto, req.user.id);
  }

  @Post('payroll/:id/calculate')
  @Permissions('payroll:calculate')
  async calculatePayroll(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: ProcessPayrollDto,
  ) {
    return this.hrService.calculatePayroll(
      req.user.schoolId,
      id,
      dto,
      req.user.id,
    );
  }

  @Post('payroll/:id/submit')
  @Permissions('payroll:submit')
  async submitPayrollToFinance(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.hrService.submitPayrollToFinance(req.user.schoolId, id, req.user.id);
  }

  @Get('payroll')
  @Permissions('payroll:read')
  async getPayrolls(
    @Request() req: AuthRequest,
    @Query() query: PayrollQueryDto,
  ) {
    return this.hrService.getPayrolls(req.user.schoolId, query);
  }

  @Get('payroll/:id')
  @Permissions('payroll:read')
  async getPayrollById(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.hrService.getPayrollById(req.user.schoolId, id);
  }

  // Legacy endpoint - redirect to calculate
  @Post('payroll/:id/process')
  @Permissions('payroll:calculate')
  async processPayroll(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: ProcessPayrollDto,
  ) {
    return this.hrService.calculatePayroll(
      req.user.schoolId,
      id,
      dto,
      req.user.id,
    );
  }

  // ==================== SALARY STRUCTURE ====================

  @Post('salary-structure')
  @Permissions('salary:create')
  async createSalaryStructure(
    @Request() req: AuthRequest,
    @Body() dto: CreateSalaryStructureDto,
  ) {
    return this.hrService.createSalaryStructure(req.user.schoolId, dto);
  }

  @Get('salary-structure')
  @Permissions('salary:read')
  async getSalaryStructures(@Request() req: AuthRequest) {
    return this.hrService.getSalaryStructures(req.user.schoolId);
  }

  @Put('salary-structure/:id')
  @Permissions('salary:update')
  async updateSalaryStructure(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: CreateSalaryStructureDto,
  ) {
    return this.hrService.updateSalaryStructure(req.user.schoolId, id, dto);
  }

  @Delete('salary-structure/:id')
  @Permissions('salary:delete')
  async deleteSalaryStructure(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.hrService.deleteSalaryStructure(req.user.schoolId, id);
  }

  // ==================== ATTENDANCE ====================

  @Post('attendance/:employeeId')
  @Permissions('attendance:create')
  async recordAttendance(
    @Request() req: AuthRequest,
    @Param('employeeId') employeeId: string,
    @Body() dto: BulkAttendanceDto,
  ) {
    return this.hrService.recordAttendance(
      req.user.schoolId,
      employeeId,
      dto,
      req.user.id,
    );
  }

  @Get('attendance')
  @Permissions('attendance:read')
  async getAttendance(
    @Request() req: AuthRequest,
    @Query() query: AttendanceQueryDto,
  ) {
    return this.hrService.getAttendance(req.user.schoolId, query);
  }

  @Get('attendance/me')
  @Permissions('attendance:read')
  async getMyAttendance(
    @Request() req: AuthRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.hrService.getEmployeeAttendance(
      req.user.schoolId,
      req.user.id,
      startDate,
      endDate,
    );
  }

  @Get('attendance/:employeeId')
  @Permissions('attendance:read')
  async getEmployeeAttendance(
    @Request() req: AuthRequest,
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.hrService.getEmployeeAttendance(
      req.user.schoolId,
      employeeId,
      startDate,
      endDate,
    );
  }

  // ==================== DASHBOARD ====================

  @Get('dashboard/stats')
  @Permissions('hr:read')
  async getDashboardStats(@Request() req: AuthRequest) {
    return this.hrService.getDashboardStats(req.user.schoolId);
  }
}
