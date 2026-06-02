import { Module } from '@nestjs/common';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentRequestController } from './enrollment-request.controller';
import { EnrollmentRequestService } from './enrollment-request.service';
import { SchoolModule } from '../school/school.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AcademicYearModule } from '../academic-year/academic-year.module';
import { NotificationModule } from '../notification/notification.module';
import { SchoolSettingsModule } from '../school-settings/school-settings.module';
import { CredentialModule } from '../credential/credential.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    SchoolModule,
    PrismaModule,
    AcademicYearModule,
    NotificationModule,
    SchoolSettingsModule,
    CredentialModule,
    SubscriptionModule,
  ],
  controllers: [EnrollmentController, EnrollmentRequestController],
  providers: [EnrollmentService, EnrollmentRequestService],
  exports: [EnrollmentService, EnrollmentRequestService],
})
export class EnrollmentModule {}
