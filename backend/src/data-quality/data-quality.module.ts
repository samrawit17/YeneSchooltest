import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SchoolSettingsModule } from '../school-settings/school-settings.module';
import { DataQualityController } from './data-quality.controller';
import { DataQualityService } from './data-quality.service';

@Module({
  imports: [PrismaModule, SchoolSettingsModule],
  controllers: [DataQualityController],
  providers: [DataQualityService],
})
export class DataQualityModule {}
