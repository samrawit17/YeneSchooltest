import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';

@Module({
  controllers: [RolesController, PermissionsController],
  providers: [PrismaService, RolesService, PermissionsService],
})
export class RbacModule {}
