import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { FeeStructureController } from './fee-structure.controller';
import { FeeStructureService } from './fee-structure.service';

@Module({
  imports: [PrismaModule, SubscriptionModule],
  controllers: [FeeStructureController],
  providers: [FeeStructureService],
  exports: [FeeStructureService],
})
export class FeeStructureModule {}
