import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@Request() req, @Query('q') query: string) {
    const schoolId = req.user.schoolId;
    const role = req.user.role;

    const categories = this.searchService.getSearchCategories(schoolId, role);

    if (!query || query.trim().length === 0) {
      return {
        data: [],
        permissions: categories,
      };
    }

    return this.searchService.globalSearch(query.trim(), schoolId, role);
  }
}
