import { Module } from '@nestjs/common';
import { RegistrarController } from './registrar.controller';
import { RegistrarService } from './registrar.service';
import { PrismaService } from '../prisma/prisma.service';
import { AutoAssignmentModule } from '../auto-assignment/auto-assignment.module';
import { CredentialModule } from '../credential/credential.module';

@Module({
  imports: [AutoAssignmentModule, CredentialModule],
  controllers: [RegistrarController],
  providers: [RegistrarService, PrismaService],
  exports: [RegistrarService],
})
export class RegistrarModule {}
