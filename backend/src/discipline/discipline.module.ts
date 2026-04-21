import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DisciplineService } from './discipline.service';
import { DisciplineController } from './discipline.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DisciplineController],
  providers: [DisciplineService],
  exports: [DisciplineService],
})
export class DisciplineModule {}