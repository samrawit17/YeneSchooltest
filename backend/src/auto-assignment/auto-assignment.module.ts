import { Module } from '@nestjs/common';
import { AutoAssignmentController } from './auto-assignment.controller';
import { AutoAssignmentService } from './auto-assignment.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * AutoAssignmentModule
 *
 * Module for automatic class and section assignment functionality.
 * Provides endpoints for triggering auto-assignment, checking capacity,
 * and managing student placements.
 */
@Module({
  controllers: [AutoAssignmentController],
  providers: [AutoAssignmentService, PrismaService],
  exports: [AutoAssignmentService],
})
export class AutoAssignmentModule {}
