import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';
import {
  RemovePushSubscriptionDto,
  SavePushSubscriptionDto,
} from './dto/push-subscription.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  async getNotifications(
    @Request() req: any,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('types') types?: string,
    @Query('category') category?: string,
  ) {
    const options = {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit) : 20,
      type,
      types: types
        ? types
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
        : undefined,
      category,
      schoolId: req.user.schoolId, // Include schoolId to filter notifications by school
    };

    const notifications = await this.notificationService.getUserNotifications(
      req.user.id,
      req.user.role,
      options,
    );

    return notifications;
  }

  @Get('categories')
  async getCategories(@Request() req: any) {
    const categories = await this.notificationService.getNotificationCategories(
      req.user.id,
      req.user.role,
      req.user.schoolId,
    );
    return { categories };
  }

  @Get('unread-count')
  async getUnreadCount(
    @Request() req: any,
    @Query('types') types?: string,
  ) {
    const count = await this.notificationService.getUnreadCount(
      req.user.id,
      req.user.role,
      req.user.schoolId,
      types
        ? types
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
        : undefined,
    );
    return { count };
  }

  @Get('push/public-key')
  async getPushPublicKey() {
    return {
      enabled: this.notificationService.isWebPushConfigured(),
      publicKey: this.notificationService.getWebPushPublicKey(),
    };
  }

  @Post('push/subscriptions')
  async savePushSubscription(
    @Request() req: any,
    @Body() body: SavePushSubscriptionDto,
  ) {
    return this.notificationService.savePushSubscription({
      schoolId: req.user.schoolId,
      userId: req.user.id,
      subscription: body.subscription,
      userAgent: req.headers['user-agent'],
    });
  }

  @Delete('push/subscriptions')
  async removePushSubscription(
    @Request() req: any,
    @Body() body: RemovePushSubscriptionDto,
  ) {
    return this.notificationService.removePushSubscription(
      req.user.id,
      body.endpoint,
    );
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req: any) {
    return this.notificationService.markAsRead(id, req.user.id);
  }

  @Post('mark-all-read')
  async markAllAsRead(
    @Request() req: any,
    @Body() body?: { types?: string[] },
  ) {
    return this.notificationService.markAllAsRead(req.user.id, body?.types);
  }
}
