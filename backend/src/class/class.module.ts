import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { SchoolSettingsModule } from '../school-settings/school-settings.module';
import { ClassController } from './class.controller';
import { ClassService } from './class.service';

@Module({
  imports: [PrismaModule, SchoolSettingsModule],
  controllers: [ClassController],
  providers: [ClassService, JwtAuthGuard, RolesGuard, PermissionsGuard],
  exports: [ClassService],
})
export class ClassModule {}
