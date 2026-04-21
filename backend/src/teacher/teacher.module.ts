import { Module } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { TeacherController } from './teacher.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [TeacherService],
  controllers: [TeacherController],
  exports: [TeacherService],
})
export class TeacherModule {}
