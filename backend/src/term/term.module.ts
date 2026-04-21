import { Module } from '@nestjs/common';
import { TermController } from './term.controller';
import { TermService } from './term.service';

@Module({
  controllers: [TermController],
  providers: [TermService],
  exports: [TermService],
})
export class TermModule {}
