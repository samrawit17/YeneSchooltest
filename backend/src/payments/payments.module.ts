import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { FeeStructureModule } from '../fee-structure/fee-structure.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PrismaModule, NotificationModule, SubscriptionModule, FeeStructureModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {
  private readonly _used = [FeeStructureModule, SubscriptionModule];
}
