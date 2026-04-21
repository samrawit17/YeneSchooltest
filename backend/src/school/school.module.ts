import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { SchoolController } from './school.controller';
import { SchoolService } from './school.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    MulterModule.register({
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB limit
      },
    }),
  ],
  controllers: [SchoolController],
  providers: [SchoolService],
  exports: [SchoolService],
})
export class SchoolModule {}
