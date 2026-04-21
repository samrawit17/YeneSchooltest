import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { BulkUploadService } from './bulk-upload.service';
import { BulkUploadController } from './bulk-upload.controller';
import { PrismaModule } from '../prisma/prisma.module';

import { CredentialModule } from '../credential/credential.module';

@Module({
  imports: [
    PrismaModule,
    CredentialModule,
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  ],
  controllers: [BulkUploadController],
  providers: [BulkUploadService],
  exports: [BulkUploadService],
})
export class BulkUploadModule {}
