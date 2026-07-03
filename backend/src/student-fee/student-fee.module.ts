import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { StudentFeeController } from './student-fee.controller';
import { StudentFeeService } from './student-fee.service';

@Module({
  imports: [PrismaModule, SubscriptionModule],
  controllers: [StudentFeeController],
  providers: [StudentFeeService],
})
export class StudentFeeModule {}
