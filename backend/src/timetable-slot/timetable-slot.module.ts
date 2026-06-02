import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { TimetableSlotController } from './timetable-slot.controller';
import { TimetableSlotService } from './timetable-slot.service';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [PrismaModule, SubscriptionModule],
  controllers: [TimetableSlotController],
  providers: [TimetableSlotService, JwtAuthGuard, RolesGuard, PermissionsGuard],
  exports: [TimetableSlotService],
})
export class TimetableSlotModule {}
