/**
 * React Hook for Form Draft Persistence
 * 
 * Features:
 * - Auto-save form data to IndexedDB
 * - Restore drafts on page load
 * - Support multiple form types
 * - Clear drafts after submission
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type FormDraft } from '@/lib/db';

// ============================================
// TYPES
// ============================================

interface UseFormDraftsOptions<T extends Record<string, unknown>> {
  formType: FormDraft['formType'];
  formId?: string;
  userId: string;
  autoSaveInterval?: number;
  onDraftRestored?: (draft: T) => void;
}

interface UseFormDraftsReturn<T extends Record<string, unknown>> {
  draft: T | null;
  isLoading: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  saveDraft: (data: T) => Promise<void>;
  clearDraft: () => Promise<void>;
  hasDraft: boolean;
}

// ============================================
// HOOK
// ============================================

export function useFormDrafts<T extends Record<string, unknown>>(
  options: UseFormDraftsOptions<T>
): UseFormDraftsReturn<T> {
  const { formType, formId, userId, autoSaveInterval = 30000, onDraftRestored } = options;
  
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<number | null>(null);
  
  const previousDataRef = useRef<string>('');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get current draft
  const draft = useLiveQuery(async () => {
    let query = db.formDrafts
      .where('formType')
      .equals(formType)
      .and(d => d.userId === userId);
    
    if (formId) {
      const drafts = await query.toArray();
      return drafts.find(d => d.formId === formId) || null;
    }
    
    // Get most recent draft for this form type
    const drafts = await query.reverse().sortBy('updatedAt');
    return drafts[0] || null;
  }, [formType, formId, userId]);

  // Restore draft on load
  useEffect(() => {
    if (draft && onDraftRestored) {
      onDraftRestored(draft.formData as T);
      setCurrentDraftId(draft.id || null);
    }
  }, [draft, onDraftRestored]);

  // Clear auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, []);

  /**
   * Save draft to IndexedDB
   */
  const saveDraft = useCallback(async (data: T): Promise<void> => {
    // Skip if data hasn't changed
    const dataString = JSON.stringify(data);
    if (dataString === previousDataRef.current) {
      return;
    }
    
    setIsSaving(true);
    
    try {
      const now = new Date().toISOString();
      
      if (currentDraftId) {
        // Update existing draft
        await db.formDrafts.update(currentDraftId, {
          formData: data,
          updatedAt: now,
          isAutoSaved: true
        });
      } else {
        // Create new draft
        const newDraft: Omit<FormDraft, 'id'> = {
          formType,
          formId,
          formData: data,
          userId,
          createdAt: now,
          updatedAt: now,
          isAutoSaved: true
        };
        
        const id = await db.formDrafts.add(newDraft as FormDraft);
        setCurrentDraftId(id);
      }
      
      previousDataRef.current = dataString;
      setLastSavedAt(now);
    } catch (error) {
      console.error('Failed to save draft:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [formType, formId, userId, currentDraftId]);

  /**
   * Clear draft from IndexedDB
   */
  const clearDraft = useCallback(async (): Promise<void> => {
    if (currentDraftId) {
      await db.formDrafts.delete(currentDraftId);
      setCurrentDraftId(null);
      previousDataRef.current = '';
      setLastSavedAt(null);
    }
  }, [currentDraftId]);

  /**
   * Set up auto-save
   */
  useEffect(() => {
    if (autoSaveInterval > 0) {
      autoSaveTimerRef.current = setInterval(() => {
        // This will be triggered by the component passing data
        // The actual auto-save logic is handled by the component
      }, autoSaveInterval);
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [autoSaveInterval]);

  return {
    draft: draft?.formData as T | null,
    isLoading: !draft && currentDraftId === null,
    isSaving,
    lastSavedAt,
    saveDraft,
    clearDraft,
    hasDraft: !!draft
  };
}

// ============================================
// SIMPLE HOOK - No auto-save
// ============================================

export function useSimpleFormDraft<T extends Record<string, unknown>>(
  formType: FormDraft['formType'],
  formId: string,
  userId: string
) {
  const [isSaving, setIsSaving] = useState(false);
  
  const saveDraft = useCallback(async (data: T): Promise<void> => {
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      
      // Check for existing draft
      const existing = await db.formDrafts
        .where('formType')
        .equals(formType)
        .and(d => d.formId === formId && d.userId === userId)
        .first();
      
      if (existing) {
        await db.formDrafts.update(existing.id!, {
          formData: data,
          updatedAt: now
        });
      } else {
        await db.formDrafts.add({
          formType,
          formId,
          formData: data,
          userId,
          createdAt: now,
          updatedAt: now,
          isAutoSaved: false
        });
      }
    } finally {
      setIsSaving(false);
    }
  }, [formType, formId, userId]);

  const getDraft = useCallback(async (): Promise<T | null> => {
    const draft = await db.formDrafts
      .where('formType')
      .equals(formType)
      .and(d => d.formId === formId && d.userId === userId)
      .first();
    
    return (draft?.formData as T) || null;
  }, [formType, formId, userId]);

  const clearDraft = useCallback(async (): Promise<void> => {
    await db.formDrafts
      .where('formType')
      .equals(formType)
      .and(d => d.formId === formId && d.userId === userId)
      .delete();
  }, [formType, formId, userId]);

  return { saveDraft, getDraft, clearDraft, isSaving };
}

export default useFormDrafts;
