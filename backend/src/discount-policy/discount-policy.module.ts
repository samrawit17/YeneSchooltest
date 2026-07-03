import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DiscountPolicyController } from './discount-policy.controller';
import { DiscountPolicyService } from './discount-policy.service';

@Module({
  imports: [PrismaModule],
  controllers: [DiscountPolicyController],
  providers: [DiscountPolicyService],
  exports: [DiscountPolicyService],
})
export class DiscountPolicyModule {}
