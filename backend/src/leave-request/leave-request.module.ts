import { Module } from '@nestjs/common';
import { LeaveRequestController } from './leave-request.controller';
import { LeaveRequestService } from './leave-request.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [LeaveRequestController],
  providers: [LeaveRequestService],
  exports: [LeaveRequestService],
})
export class LeaveRequestModule {}