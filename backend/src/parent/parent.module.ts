import { Module } from '@nestjs/common';
import { ParentController } from './parent.controller';
import { ParentService } from './parent.service';
import { PrismaService } from '../prisma/prisma.service';
import { CredentialModule } from '../credential/credential.module';

@Module({
  imports: [CredentialModule],
  controllers: [ParentController],
  providers: [ParentService, PrismaService],
  exports: [ParentService],
})
export class ParentModule {}
