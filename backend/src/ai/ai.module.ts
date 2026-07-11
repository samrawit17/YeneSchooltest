import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { StudentContextService } from './context/student-context.service';
import { SchoolContextService } from './context/school-context.service';
import { AiToolExecutorService } from './tools/ai-tool-executor.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AiController],
  providers: [AiService, StudentContextService, SchoolContextService, AiToolExecutorService],
  exports: [AiService, StudentContextService, SchoolContextService, AiToolExecutorService],
})
export class AiModule {}
