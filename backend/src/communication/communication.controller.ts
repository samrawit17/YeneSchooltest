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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { CommunicationService } from './communication.service';
import { RequiresFeature } from '../subscription/decorators/subscription.decorator';
import { SubscriptionGuard } from '../subscription/guards/subscription.guard';
import {
  CreateCommunicationDto,
  CreateCommunicationReplyDto,
  UpdateCommunicationStatusDto,
  CommunicationQueryDto,
} from './dto/create-communication.dto';

@Controller('communications')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@RequiresFeature('COMMUNICATION_BOOK')
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  // ==================== COMMUNICATION ENDPOINTS ====================

  /**
   * Create a new communication entry
   * Teachers, Admins, Parents can create
   */
  @Post()
  @Roles(Role.TEACHER, Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN, Role.PARENT)
  async createCommunication(
    @Request() req: any,
    @Body() dto: CreateCommunicationDto,
  ) {
    return this.communicationService.createCommunication(
      req.user.schoolId,
      req.user.id,
      req.user.role,
      dto,
    );
  }

  /**
   * Get communications list with filtering
   */
  @Get()
  async getCommunications(
    @Request() req: any,
    @Query() query: CommunicationQueryDto,
  ) {
    return this.communicationService.getCommunications(
      req.user.schoolId,
      req.user.id,
      req.user.role,
      query,
    );
  }

  /**
   * Get unread communications count
   */
  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    return this.communicationService.getUnreadCount(
      req.user.schoolId,
      req.user.id,
      req.user.role,
    );
  }

  /**
   * Get my communications count (user-specific count for menu/navbar)
   * Returns count of communications relevant to the current user
   */
  @Get('my-count')
  async getMyCount(@Request() req: any, @Query('status') status?: string) {
    return this.communicationService.getMyCommunicationsCount(
      req.user.schoolId,
      req.user.id,
      req.user.role,
      status,
    );
  }

  /**
   * Get a single communication by ID
   */
  @Get(':id')
  async getCommunicationById(@Request() req: any, @Param('id') id: string) {
    return this.communicationService.getCommunicationById(
      req.user.schoolId,
      req.user.id,
      req.user.role,
      id,
    );
  }

  /**
   * Update communication status (OPEN -> CLOSED)
   */
  @Put(':id/status')
  async updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCommunicationStatusDto,
  ) {
    return this.communicationService.updateStatus(
      req.user.schoolId,
      req.user.id,
      req.user.role,
      id,
      dto,
    );
  }

  /**
   * Delete a communication (Admin only)
   */
  @Delete(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  async deleteCommunication(@Request() req: any, @Param('id') id: string) {
    return this.communicationService.deleteCommunication(
      req.user.schoolId,
      req.user.id,
      req.user.role,
      id,
    );
  }

  // ==================== REPLY ENDPOINTS ====================

  /**
   * Add a reply to a communication (Parents/Teachers/Admins can reply)
   */
  @Post(':id/replies')
  async addReply(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CreateCommunicationReplyDto,
  ) {
    return this.communicationService.addReply(
      req.user.schoolId,
      req.user.id,
      req.user.role,
      id,
      dto,
    );
  }

  /**
   * Delete a reply
   */
  @Delete('replies/:replyId')
  async deleteReply(@Request() req: any, @Param('replyId') replyId: string) {
    return this.communicationService.deleteReply(
      req.user.schoolId,
      req.user.id,
      req.user.role,
      replyId,
    );
  }
}
