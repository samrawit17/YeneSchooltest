import { SearchService } from './search.service';
export declare class SearchController {
    private readonly searchService;
    constructor(searchService: SearchService);
    search(req: any, query: string): Promise<{
        data: import("./search.service").SearchResult[];
        permissions: import("./search.service").SearchableEntity[];
    }>;
}
