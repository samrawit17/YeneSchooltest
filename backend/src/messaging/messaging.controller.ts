import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { MessagingService } from './messaging.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { RequiresFeature } from '../subscription/decorators/subscription.decorator';
import { SubscriptionGuard } from '../subscription/guards/subscription.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@RequiresFeature('MESSAGING')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get('staff')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.TEACHER, Role.FINANCE)
  async listStaff(@Request() req: any, @Query('search') search?: string) {
    return this.messagingService.listStaff(req.user, search);
  }

  @Post('conversation')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.TEACHER, Role.FINANCE)
  async createConversation(
    @Request() req: any,
    @Body() dto: CreateConversationDto,
  ) {
    return this.messagingService.createConversation(req.user, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.TEACHER, Role.FINANCE)
  async listConversations(@Request() req: any) {
    return this.messagingService.listConversations(req.user);
  }

  @Get(':conversationId')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.TEACHER, Role.FINANCE)
  async getConversationMessages(
    @Request() req: any,
    @Param('conversationId') conversationId: string,
  ) {
    return this.messagingService.getConversationMessages(
      req.user,
      conversationId,
    );
  }

  @Post(':conversationId')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.TEACHER, Role.FINANCE)
  async sendMessage(
    @Request() req: any,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagingService.sendMessage(req.user, conversationId, dto);
  }

  @Patch('read/:messageId')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.TEACHER, Role.FINANCE)
  async markRead(@Request() req: any, @Param('messageId') messageId: string) {
    return this.messagingService.markMessageRead(req.user, messageId);
  }
}
