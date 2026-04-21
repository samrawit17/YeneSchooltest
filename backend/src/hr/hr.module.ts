import { Module } from '@nestjs/common';
import { HrController } from './hr.controller';
import { HrService } from './hr.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CredentialModule } from '../credential/credential.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, CredentialModule, NotificationModule],
  controllers: [HrController],
  providers: [HrService],
  exports: [HrService],
})
export class HrModule {}
