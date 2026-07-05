import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { gradingAPI } from '@/lib/api';
import { syncService } from '@/lib/db/sync-service';

interface CachedGradeAssignment {
  id: string;
  academicYearId: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  type?: string;
  isHomeroom?: boolean;
  userId: string;
  cachedAt: number;
}

interface CachedGradingComponent {
  id: string;
  code: string;
  name: string;
  percentage: number;
  academicYearId?: string;
  cachedAt: number;
}

interface CachedGradeEntryData {
  id: string;
  academicYearId: string;
  termId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  students: Record<string, unknown>[];
  componentAvailability: Record<string, unknown>;
  gradingComponents: { code: string; name: string; percentage: number }[];
  isTermLocked: boolean;
  userId: string;
  cachedAt: number;
  updatedAt: number;
}

interface SyncStatus {
  pendingCount: number;
  failedCount: number;
  isOnline: boolean;
  isSyncing: boolean;
}

interface UseOfflineGradingOptions {
  userId?: string;
  academicYearId?: string;
  autoSync?: boolean;
}

export function useOfflineGrading(options: UseOfflineGradingOptions = {}) {
  const { userId, academicYearId, autoSync = true } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    pendingCount: 0,
    failedCount: 0,
    isOnline: true,
    isSyncing: false,
  });

  useEffect(() => {
    if (autoSync) {
      syncService.startAutoSync();
    }
    return () => {
      if (autoSync) {
        syncService.stopAutoSync();
      }
    };
  }, [autoSync]);

  useEffect(() => {
    const updateSyncStatus = async () => {
      const status = await syncService.getSyncStatus();
      setSyncStatus(prev => ({ ...prev, ...status }));
    };
    updateSyncStatus();
    const interval = setInterval(updateSyncStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleSyncComplete = () => { updateSyncStatus(); };
    const handleSyncFailed = () => { updateSyncStatus(); };
    const updateSyncStatus = async () => {
      const status = await syncService.getSyncStatus();
      setSyncStatus(prev => ({ ...prev, ...status }));
    };
    syncService.on('sync_completed', handleSyncComplete);
    syncService.on('sync_failed', handleSyncFailed);
    return () => {
      syncService.off('sync_completed', handleSyncComplete);
      syncService.off('sync_failed', handleSyncFailed);
    };
  }, []);

  const cachedAssignments = useLiveQuery(async () => {
    if (!academicYearId || !userId) return [];
    return db.gradeAssignments
      .where({ academicYearId, userId })
      .toArray();
  }, [academicYearId, userId]);

  const cachedComponents = useLiveQuery(async () => {
    return db.gradeComponents.toArray();
  }, []);

  const cacheAssignments = useCallback(async (academicYear: string): Promise<void> => {
    try {
      setIsLoading(true);
      const assignmentRes = await gradingAPI.getTeacherAssignments({ academicYear });
      const root = assignmentRes.data?.data ?? assignmentRes.data;
      if (!Array.isArray(root)) return;

      const assignments = root.map((a: any) => {
        const subjectId = a.subject?.id || a.subjectId || '';
        const subjectName = a.subject?.name || a.subjectName || 'Unknown Subject';
        const classId = a.class?.id || a.classId || '';
        const className = a.class?.name || a.className || 'Unknown Class';
        const sectionId = a.section?.id || a.sectionId || '';
        const sectionName = a.section?.name || a.sectionName || 'Unknown Section';
        return {
          id: a.id || `${classId}:${sectionId}:${subjectId}`,
          academicYearId: academicYear,
          subjectId,
          subjectName,
          classId,
          className,
          sectionId,
          sectionName,
          type: a.type,
          isHomeroom: a.isHomeroom,
        };
      }).filter((a: any) => a.subjectId && a.classId);

      await syncService.cacheTeacherAssignments(assignments, userId || '');
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to cache assignments'));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const cacheComponents = useCallback(async (academicYear?: string): Promise<void> => {
    try {
      const weightsRes = await gradingAPI.getTeacherAssessmentTypes();
      const weightsData = Array.isArray(weightsRes.data)
        ? weightsRes.data
        : weightsRes.data?.data ?? [];
      if (weightsData.length > 0) {
        await syncService.cacheGradingComponents(
          weightsData.map((item: { code?: string; type?: string; name?: string; percentage: number }) => ({
            code: item.code ?? item.type ?? '',
            name: item.name || item.code || item.type || '',
            percentage: item.percentage,
          })),
          academicYear
        );
      }
    } catch {
      // silent
    }
  }, []);

  const cacheGradeEntryData = useCallback(async (params: {
    academicYear: string;
    termId: string;
    classId: string;
    sectionId: string;
    subjectId: string;
  }): Promise<void> => {
    try {
      const res = await gradingAPI.getTeacherStudents(params);
      const data = res.data;
      const studentData = data?.students || (Array.isArray(data) ? data : (data.data || []));
      const availabilityData = Array.isArray(data?.componentAvailability)
        ? data.componentAvailability
        : [];
      const isTermLocked = data?.isTermLocked || false;

      const availabilityMap = Object.fromEntries(
        availabilityData.map((item: any) => [
          String(item.code).toUpperCase(),
          item,
        ]),
      );

      const components = await syncService.getCachedGradingComponents(params.academicYear);

      await syncService.cacheGradeEntryData({
        academicYearId: params.academicYear,
        termId: params.termId,
        classId: params.classId,
        sectionId: params.sectionId,
        subjectId: params.subjectId,
        students: studentData,
        componentAvailability: availabilityMap,
        gradingComponents: components.length > 0
          ? components.map(c => ({ code: c.code, name: c.name, percentage: c.percentage }))
          : [
              { code: 'CA', name: 'Continuous Assessment', percentage: 15 },
              { code: 'MID', name: 'Mid Exam', percentage: 20 },
              { code: 'FINAL', name: 'Final Exam', percentage: 30 },
            ],
        isTermLocked,
        userId: userId || '',
      });

      await syncService.cacheComponentAvailability(availabilityMap, {
        academicYearId: params.academicYear,
        termId: params.termId,
        classId: params.classId,
        sectionId: params.sectionId,
        subjectId: params.subjectId,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to cache grade data'));
    }
  }, [userId]);

  const getCachedGradeData = useCallback(async (
    classId: string,
    sectionId: string,
    subjectId: string,
    termId: string,
  ): Promise<CachedGradeEntryData | undefined> => {
    return syncService.getCachedGradeEntryData(classId, sectionId, subjectId, termId);
  }, []);

  const getCachedComponentAvailability = useCallback(async (
    classId: string,
    sectionId: string,
    subjectId: string,
    termId: string,
  ): Promise<Record<string, unknown> | undefined> => {
    return syncService.getCachedComponentAvailability(classId, sectionId, subjectId, termId);
  }, []);

  const saveDraftOffline = useCallback(async (payload: Record<string, unknown>): Promise<number> => {
    return syncService.saveGradeDraftOffline(payload);
  }, []);

  const submitOffline = useCallback(async (payload: Record<string, unknown>): Promise<number> => {
    return syncService.queueGradeSubmissionOffline(payload);
  }, []);

  const syncNow = useCallback(async () => {
    return syncService.syncNow();
  }, []);

  const hasPendingChanges = useMemo(() => {
    return syncStatus.pendingCount > 0 || syncStatus.failedCount > 0;
  }, [syncStatus.pendingCount, syncStatus.failedCount]);

  return {
    cachedAssignments,
    cachedComponents,
    isLoading,
    error,
    syncStatus,
    hasPendingChanges,

    cacheAssignments,
    cacheComponents,
    cacheGradeEntryData,
    getCachedGradeData,
    getCachedComponentAvailability,
    saveDraftOffline,
    submitOffline,
    syncNow,
  };
}

export default useOfflineGrading;
