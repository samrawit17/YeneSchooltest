import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { SectionController } from './section.controller';
import { SectionService } from './section.service';

@Module({
  imports: [PrismaModule],
  controllers: [SectionController],
  providers: [SectionService, JwtAuthGuard, RolesGuard, PermissionsGuard],
  exports: [SectionService],
})
export class SectionModule {}
