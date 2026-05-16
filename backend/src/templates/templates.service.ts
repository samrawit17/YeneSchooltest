import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TemplatesService {
  private schemaReady = false;
  private schemaInitPromise: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private async ensureTemplateSchema() {
    if (this.schemaReady) return;
    if (this.schemaInitPromise) {
      await this.schemaInitPromise;
      return;
    }

    this.schemaInitPromise = (async () => {
      await this.prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_type t
            JOIN pg_namespace n ON n.oid = t.typnamespace
            WHERE t.typname = 'DocumentTemplateType' AND n.nspname = 'public'
          ) THEN
            CREATE TYPE "DocumentTemplateType" AS ENUM ('CERTIFICATE', 'ID_CARD');
          END IF;
        END
        $$;
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Template" (
          "id" TEXT NOT NULL,
          "schoolId" TEXT NOT NULL,
          "type" "DocumentTemplateType" NOT NULL,
          "name" TEXT NOT NULL,
          "backgroundUrl" TEXT NOT NULL,
          "fieldMapJson" TEXT,
          "isActive" BOOLEAN NOT NULL DEFAULT false,
          "createdById" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
        );
      `);

      await this.prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'Template_schoolId_fkey'
          ) THEN
            ALTER TABLE "Template"
              ADD CONSTRAINT "Template_schoolId_fkey"
              FOREIGN KEY ("schoolId") REFERENCES "School"("id")
              ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END
        $$;
      `);

      await this.prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'Template_createdById_fkey'
          ) THEN
            ALTER TABLE "Template"
              ADD CONSTRAINT "Template_createdById_fkey"
              FOREIGN KEY ("createdById") REFERENCES "User"("id")
              ON DELETE SET NULL ON UPDATE CASCADE;
          END IF;
        END
        $$;
      `);

      await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Template_schoolId_type_idx" ON "Template"("schoolId", "type");`);
      await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Template_schoolId_isActive_idx" ON "Template"("schoolId", "isActive");`);
      await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Template_createdById_idx" ON "Template"("createdById");`);

      this.schemaReady = true;
    })();

    try {
      await this.schemaInitPromise;
    } finally {
      this.schemaInitPromise = null;
    }
  }

  async list(schoolId: string, type?: 'CERTIFICATE' | 'ID_CARD') {
    await this.ensureTemplateSchema();
    return this.prisma.template.findMany({
      where: { schoolId, ...(type ? { type } : {}) },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async upload(
    schoolId: string,
    createdById: string | undefined,
    input: { name: string; type: 'CERTIFICATE' | 'ID_CARD' },
    file: Express.Multer.File,
  ) {
    await this.ensureTemplateSchema();
    const folderName = input.type === 'CERTIFICATE' ? 'certificate-templates' : 'id-card-templates';
    const backendPublicDir = path.join(process.cwd(), 'public', 'uploads', folderName);
    const frontendPublicDir = path.join(process.cwd(), '..', 'frontend', 'public', 'uploads', folderName);
    if (!fs.existsSync(backendPublicDir)) fs.mkdirSync(backendPublicDir, { recursive: true });
    if (!fs.existsSync(frontendPublicDir)) fs.mkdirSync(frontendPublicDir, { recursive: true });
    const fileName = `${schoolId}-${Date.now()}${path.extname(file.originalname)}`;
    const backendFilePath = path.join(backendPublicDir, fileName);
    const frontendFilePath = path.join(frontendPublicDir, fileName);
    fs.writeFileSync(backendFilePath, file.buffer);
    fs.copyFileSync(backendFilePath, frontendFilePath);
    const backgroundUrl = `/uploads/${folderName}/${fileName}`;

    return this.prisma.template.create({
      data: {
        schoolId,
        type: input.type,
        name: input.name || `${input.type} Template`,
        backgroundUrl,
        createdById: createdById || null,
      },
    });
  }

  async activate(schoolId: string, templateId: string) {
    await this.ensureTemplateSchema();
    const tpl = await this.prisma.template.findFirst({ where: { id: templateId, schoolId } });
    if (!tpl) throw new NotFoundException('Template not found');
    await this.prisma.$transaction([
      this.prisma.template.updateMany({ where: { schoolId, type: tpl.type }, data: { isActive: false } }),
      this.prisma.template.updateMany({ where: { id: templateId, schoolId }, data: { isActive: true } }),
    ]);
    return this.prisma.template.findFirst({ where: { id: templateId, schoolId } });
  }

  async saveFieldMap(
    schoolId: string,
    templateId: string,
    fields: Array<Record<string, any>>,
  ) {
    await this.ensureTemplateSchema();
    const tpl = await this.prisma.template.findFirst({ where: { id: templateId, schoolId } });
    if (!tpl) throw new NotFoundException('Template not found');
    if (!Array.isArray(fields)) throw new BadRequestException('fields must be an array');
    await this.prisma.template.updateMany({
      where: { id: templateId, schoolId },
      data: { fieldMapJson: JSON.stringify(fields) },
    });
    return this.prisma.template.findFirst({ where: { id: templateId, schoolId } });
  }

  async getActiveTemplate(schoolId: string, type: 'CERTIFICATE' | 'ID_CARD') {
    await this.ensureTemplateSchema();
    return this.prisma.template.findFirst({
      where: { schoolId, type, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
