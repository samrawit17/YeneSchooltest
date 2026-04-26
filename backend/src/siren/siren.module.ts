import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SirenService } from './siren.service';
import { SirenController } from './siren.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, NotificationModule],
  controllers: [SirenController],
  providers: [SirenService],
  exports: [SirenService],
})
export class SirenModule {}
