# ADR-003: Offline-First Attendance with Dexie.js

**Status:** Accepted | **Date:** 2024-02-10 | **Author:** HUMAN Tech PLC

## Context
Many Ethiopian schools have unreliable internet connectivity. Attendance must work offline and sync when connectivity is restored.

## Decision
Use **Dexie.js** (IndexedDB wrapper) for offline attendance data storage, with a custom sync service for conflict resolution.

## Rationale
- Dexie.js provides a clean Promise-based API over IndexedDB
- IndexedDB works in all modern browsers
- Offline-first improves reliability in low-connectivity environments
- Conflict resolution uses server timestamp wins by default

## Consequences
- Attendance module has both online and offline code paths
- SyncService must handle conflict detection and resolution
- Network status monitoring via `useNetworkStatus` hook
- Additional test coverage needed for sync scenarios

## Alternatives Considered
- **Service Workers + Cache API**: More complex, harder to debug
- **LocalStorage**: Limited storage (5MB), synchronous API
- **Always-online only**: Unacceptable for target market
