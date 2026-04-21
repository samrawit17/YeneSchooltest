import { Module } from '@nestjs/common';
import { ClassSubjectService } from './class-subject.service';
import { ClassSubjectController } from './class-subject.controller';

@Module({
  controllers: [ClassSubjectController],
  providers: [ClassSubjectService],
  exports: [ClassSubjectService],
})
export class ClassSubjectModule {}
