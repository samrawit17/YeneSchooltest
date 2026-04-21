import { Module } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { AnnouncementController } from './announcement.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  providers: [AnnouncementService],
  controllers: [AnnouncementController],
  exports: [AnnouncementService],
})
export class AnnouncementModule {}
