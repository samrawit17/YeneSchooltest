# Search Module

> Purpose: Global search across all entities for quick data retrieval.

---

## Responsibilities
- Cross-entity search (students, teachers, staff, classes, etc.)
- Search result ranking and relevance
- Quick lookup for navigation

## Features
- Unified search API across all entity types
- Text-based search with partial matching
- Entity-type filtering
- Result ranking by relevance
- Integration with GlobalSearch component in navbar

## Permissions
- Results scoped to user's role and schoolId
- `ADMIN`: Search all school entities
- `TEACHER`: Search students, classes in assigned scope
- Others: Search within own scope

## Related Documents
- `backend/src/search/`
- `frontend/src/components/GlobalSearch.tsx`
