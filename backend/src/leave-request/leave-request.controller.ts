import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  LeaveRequestService,
} from './leave-request.service';
import {
  CreateLeaveRequestDto,
  UpdateLeaveRequestDto,
  ApproveLeaveRequestDto,
  RejectLeaveRequestDto,
  LeaveRequestQueryDto,
} from './dto/leave-request.dto';

interface AuthRequest {
  user: {
    id: string;
    schoolId: string;
    role: string;
  };
}

@Controller('leave-requests')
@UseGuards(AuthGuard('jwt'))
export class LeaveRequestController {
  constructor(private readonly leaveRequestService: LeaveRequestService) {}

  @Post()
  async create(@Request() req: AuthRequest, @Body() dto: CreateLeaveRequestDto) {
    return this.leaveRequestService.create(
      req.user.schoolId,
      req.user.id,
      dto,
    );
  }

  @Get()
  async findAll(@Request() req: AuthRequest, @Query() query: LeaveRequestQueryDto) {
    return this.leaveRequestService.findAll(req.user.schoolId, query);
  }

  @Get('my')
  async findMy(@Request() req: AuthRequest, @Query() query: LeaveRequestQueryDto) {
    return this.leaveRequestService.findMyRequests(
      req.user.schoolId,
      req.user.id,
      query,
    );
  }

  @Get('my/balance')
  async getMyBalance(@Request() req: AuthRequest) {
    return this.leaveRequestService.getLeaveBalance(
      req.user.schoolId,
      req.user.id,
    );
  }

  @Get(':id')
  async findById(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.leaveRequestService.findById(req.user.schoolId, id);
  }

  @Patch(':id/approve')
  async approve(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: ApproveLeaveRequestDto,
  ) {
    return this.leaveRequestService.approve(
      req.user.schoolId,
      id,
      req.user.id,
      dto,
    );
  }

  @Patch(':id/reject')
  async reject(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: RejectLeaveRequestDto,
  ) {
    return this.leaveRequestService.reject(
      req.user.schoolId,
      id,
      req.user.id,
      dto,
    );
  }

  @Delete(':id')
  async cancel(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.leaveRequestService.cancel(
      req.user.schoolId,
      req.user.id,
      id,
    );
  }
}