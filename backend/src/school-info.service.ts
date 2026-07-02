import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class SchoolInfoService {
  constructor(private readonly prisma: PrismaService) {}

  async getSchoolById(id: string) {
    return this.prisma.school.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        publicUrlSlug: true,
      },
    });
  }
}
