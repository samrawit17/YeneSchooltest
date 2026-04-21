import { Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CredentialModule } from '../credential/credential.module';
import { ClassModule } from '../class/class.module';

@Module({
  imports: [PrismaModule, CredentialModule, ClassModule],
  controllers: [StudentController],
  providers: [StudentService],
  exports: [StudentService],
})
export class StudentModule {}
