import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { HelpSeedService } from './seed/help-seed.service';

@Injectable()
export class HelpService implements OnApplicationBootstrap {
  private readonly logger = new Logger(HelpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly seedService: HelpSeedService,
  ) {}

  async onApplicationBootstrap() {
    await this.seedService.seed();
  }

  async findByRole(role: string, schoolId?: string) {
    return this.prisma.helpArticle.findMany({
      where: {
        isActive: true,
        OR: [
          { role: role as any },
          ...(schoolId ? [{ schoolId }] : []),
        ],
      },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        title: true,
        content: true,
        summary: true,
        category: true,
        linkUrl: true,
        tags: true,
        role: true,
        order: true,
      },
    });
  }

  async searchArticles(query: string, role?: string) {
    const where: Prisma.HelpArticleWhereInput = {
      isActive: true,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
        { tags: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (role) {
      where.role = role as any;
    }

    return this.prisma.helpArticle.findMany({
      where,
      orderBy: { order: 'asc' },
      take: 10,
      select: {
        id: true,
        title: true,
        content: true,
        summary: true,
        category: true,
        linkUrl: true,
        tags: true,
        role: true,
      },
    });
  }

  async findRelevant(query: string, role: string, maxResults = 5) {
    const terms = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const roleArticles = await this.findByRole(role);

    const scored = roleArticles.map((article) => {
      const searchText = `${article.title} ${article.content} ${article.tags || ''}`.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (searchText.includes(term)) {
          score += term.length;
        }
      }
      return { article, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map((s) => s.article);
  }
}
