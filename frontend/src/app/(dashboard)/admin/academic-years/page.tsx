'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { academicYearsAPI, schoolSettingsAPI } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { FormattedDate } from '@/components/ui/FormattedDate';
import { CalendarDatePicker } from '@/components/ui/CalendarDatePicker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTranslations } from '@/hooks/useTranslations';

interface Term {
  id: string;
  name: string;
  order: number;
  percentageWeight: number;
  startDate: string;
  endDate: string;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  curriculumType: 'SEMESTER' | 'QUARTER' | 'TERM' | 'CUSTOM';
  calendarType: 'GREGORIAN' | 'ETHIOPIAN';
  terms: Term[];
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

const CURRICULUM_TYPES = [
  { value: 'SEMESTER', label: 'Semester System', description: '2 periods (Semester 1, Semester 2)' },
  { value: 'TERM', label: 'Term System', description: '3 periods (Term 1, Term 2, Term 3)' },
  { value: 'QUARTER', label: 'Quarter System', description: '4 periods (Q1, Q2, Q3, Q4)' },
  { value: 'CUSTOM', label: 'Custom Periods', description: 'Define your own number of periods' },
];

const CALENDAR_TYPES = [
  { value: 'GREGORIAN', label: 'Gregorian', description: 'Standard international calendar' },
  { value: 'ETHIOPIAN', label: 'Ethiopian', description: 'Traditional Ethiopian calendar (13 months)' },
];

export default function AcademicYearsPage() {
  const { t } = useTranslations<any>('academicYears');
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [schoolId, setSchoolId] = useState(user?.schoolId || '');

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTermModal, setShowTermModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [schoolCurriculumType, setSchoolCurriculumType] = useState<string>('QUARTER');

  // Fetch school settings to get the curriculum type that controls period creation.
  useEffect(() => {
    const fetchSchoolSettings = async () => {
      if (!user?.schoolId) return;
      try {
        const response = await schoolSettingsAPI.getAll(user.schoolId);
        const curriculumType = response.data?.curriculum_type;
        if (curriculumType) {
          setSchoolCurriculumType(String(curriculumType).toUpperCase());
        }
      } catch (error) {
        console.error('Error fetching school settings:', error);
      }
    };
    fetchSchoolSettings();
  }, [user?.schoolId]);

  // Form states
  const [newYear, setNewYear] = useState({
    name: '',
    startDate: '',
    endDate: '',
    curriculumType: '',
  });

  const [newTerm, setNewTerm] = useState({
    name: '',
    order: 1,
    percentageWeight: 0,
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (user?.schoolId) {
      setSchoolId(user.schoolId);
      fetchAcademicYears(user.schoolId);
    }
  }, [user]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const calendarType = user?.calendarType || 'ETHIOPIAN';

  const refreshAcademicContext = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.academicYears.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.academicYears.list(schoolId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.academicYears.active(user?.schoolId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.terms.current(user?.schoolId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.school.settings(user?.schoolId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.academicYears.currentState }),
      queryClient.invalidateQueries({ queryKey: queryKeys.terms.currentRoot }),
    ]);
  };

  const fetchAcademicYears = async (sid: string) => {
    try {
      setLoading(true);
      const response = await academicYearsAPI.getAll({ schoolId: sid });
      setAcademicYears(response.data);
      // Select first year matching calendar type, or first available year
      const filteredYears = response.data.filter((year: AcademicYear) =>
        year.calendarType === calendarType || !year.calendarType
      );
      const yearsToConsider = filteredYears.length > 0 ? filteredYears : response.data;
      if (yearsToConsider.length > 0) {
        if (selectedYear) {
          const updatedSelectedYear = response.data.find((y: AcademicYear) => y.id === selectedYear.id);
          if (updatedSelectedYear) {
            setSelectedYear(updatedSelectedYear);
          } else {
            setSelectedYear(yearsToConsider[0]);
          }
        } else {
          setSelectedYear(yearsToConsider[0]);
        }
      } else {
        setSelectedYear(null);
      }
    } catch (error) {
      console.error('Error fetching academic years:', error);
      toast.error(t.messages.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAcademicYear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await academicYearsAPI.create({
        name: newYear.name,
        startDate: newYear.startDate,
        endDate: newYear.endDate,
        schoolId,
        curriculumType: schoolCurriculumType || undefined,
        calendarType: user?.calendarType || 'ETHIOPIAN',
      });
      await fetchAcademicYears(schoolId);
      await refreshAcademicContext();
      setShowCreateModal(false);
      setNewYear({ name: '', startDate: '', endDate: '', curriculumType: '' } as any);
      toast.success(t.messages.yearCreated);
    } catch (error) {
      console.error('Error creating academic year:', error);
      toast.error(t.messages.yearCreateFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCurriculumType = async (curriculumType: string) => {
    if (!selectedYear) return;
    try {
      setSaving(true);
      await academicYearsAPI.updateCurriculumType(selectedYear.id, { curriculumType: curriculumType as any });
      await fetchAcademicYears(schoolId);
      await refreshAcademicContext();
      const updated = academicYears.find(y => y.id === selectedYear.id);
      if (updated) setSelectedYear({ ...updated, curriculumType: curriculumType as any });
      toast.success(t.messages.curriculumUpdated);
    } catch (error) {
      console.error('Error updating curriculum type:', error);
      toast.error(t.messages.curriculumLocked);
    } finally {
      setSaving(false);
    }
  };

  const handleActivateYear = async (id: string) => {
    try {
      setSaving(true);
      await academicYearsAPI.activate(id);
      await fetchAcademicYears(schoolId);
      setSelectedYear((prev) =>
        prev
          ? {
              ...prev,
              isActive: prev.id === id,
            }
          : prev,
      );
      await refreshAcademicContext();
      toast.success(t.messages.yearActivated);
    } catch (error) {
      console.error('Error activating academic year:', error);
      toast.error(t.messages.yearActivateFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedYear) return;
    try {
      setSaving(true);
      await academicYearsAPI.createTerm(selectedYear.id, newTerm);
      await fetchAcademicYears(schoolId);
      await refreshAcademicContext();
      setShowTermModal(false);
      setNewTerm({ name: '', order: 1, percentageWeight: 0, startDate: '', endDate: '' });
      toast.success(t.messages.periodCreated);
    } catch (error) {
      console.error('Error creating term:', error);
      toast.error(t.messages.periodCreateFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTerm) return;
    try {
      setSaving(true);
      await academicYearsAPI.updateTerm(editingTerm.id, newTerm);
      await fetchAcademicYears(schoolId);
      await refreshAcademicContext();
      setEditingTerm(null);
      setShowTermModal(false);
      toast.success(t.messages.periodUpdated);
    } catch (error) {
      console.error('Error updating term:', error);
      toast.error(t.messages.periodUpdateFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleLockTerm = async (termId: string, isLocked: boolean) => {
    try {
      setSaving(true);
      await academicYearsAPI.lockTerm(termId, !isLocked);
      await fetchAcademicYears(schoolId);
      await refreshAcademicContext();
      toast.success(!isLocked ? t.messages.periodLocked : t.messages.periodUnlocked);
    } catch (error) {
      console.error('Error locking term:', error);
      toast.error(!isLocked ? t.messages.periodLockFailed : t.messages.periodUnlockFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTerm = async (termId: string) => {
    if (!confirm(t.messages.deleteConfirm)) return;
    try {
      setSaving(true);
      await academicYearsAPI.deleteTerm(termId);
      await fetchAcademicYears(schoolId);
      await refreshAcademicContext();
      toast.success(t.messages.periodDeleted);
    } catch (error) {
      console.error('Error deleting term:', error);
      toast.error(t.messages.periodDeleteFailed);
    } finally {
      setSaving(false);
    }
  };

  const openEditTerm = (term: Term) => {
    setEditingTerm(term);
    setNewTerm({
      name: term.name,
      order: term.order,
      percentageWeight: term.percentageWeight,
      startDate: term.startDate.split('T')[0],
      endDate: term.endDate.split('T')[0],
    });
    setShowTermModal(true);
  };

  const getTotalWeight = () => {
    if (!selectedYear) return 0;
    return selectedYear.terms.reduce((sum, term) => sum + term.percentageWeight, 0);
  };

  const getYearStatus = (year: AcademicYear) => {
    if (year.isActive) return t.active;
    const now = new Date();
    const start = new Date(year.startDate);
    const end = new Date(year.endDate);
    if (now >= start && now <= end) return t.current;
    if (now < start) return t.upcoming;
    return t.past;
  };

  const getTermStatus = (term: Term) => {
    const now = new Date();
    const start = new Date(term.startDate);
    const end = new Date(term.endDate);
    if (term.isLocked) return t.locked;
    if (now >= start && now <= end) return t.active;
    if (now < start) return t.upcoming;
    return t.completed;
  };

  const getTermStatusColor = (status: string) => {
    switch (status) {
      case t.active: return 'bg-[rgba(var(--brand-color-rgb),0.1)] dark:bg-[rgba(var(--brand-color-rgb),0.18)] text-[var(--brand-color)]';
      case t.locked: return 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400';
      case t.completed: return 'bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-400';
      default: return 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--brand-color,#e35336)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="mt-3 text-2xl font-bold text-black">{t.title}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t.subtitle}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-lg bg-[var(--brand-color,#e35336)] px-4 py-2 text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--brand-color,#e35336)]/20"
        >
          {t.newAcademicYear}
        </button>
      </div>

      {!selectedYear && academicYears.length === 0 && (
        <div className="flex min-h-[55vh] items-center justify-center">
          <p className="text-center text-lg font-medium text-gray-500 dark:text-gray-400">
            {t.empty}
          </p>
        </div>
      )}

      {selectedYear && (
        <>
          {/* Periods/Terms */}
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border dark:border-slate-800">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold dark:text-white">
                  {t.periods} ({schoolCurriculumType})
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t.periodDescription}
                </p>
              </div>
              <div className="w-full md:w-auto md:min-w-[340px]">
                <select
                  value={selectedYear?.id || ''}
                  onChange={(e) => {
                    const year = academicYears.find(y => y.id === e.target.value);
                    setSelectedYear(year || null);
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-[var(--brand-color,#e35336)]/35 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  {academicYears.map(year => {
                      const status = getYearStatus(year);
                      return (
                        <option key={year.id} value={year.id}>
                          {year.name} ({year.calendarType || 'ETHIOPIAN'}) - {status}
                        </option>
                      );
                    })}
                </select>
              </div>
            </div>

            {/* Terms Table */}
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-slate-800">
                    <TableHead className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">{t.periodName}</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">{t.order}</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">{t.startDate}</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">{t.endDate}</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">{t.status}</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {selectedYear.terms.sort((a, b) => a.order - b.order).map(term => {
                    const status = getTermStatus(term);
                    const isCurrent = status === t.active;
                    return (
                      <TableRow key={term.id} className={`${term.isLocked ? 'bg-gray-50 dark:bg-slate-800' : 'dark:hover:bg-slate-800/50'} ${isCurrent ? 'ring-2 ring-inset ring-[var(--brand-color)]' : ''}`}>
                        <TableCell className="px-4 py-3 font-medium dark:text-white">
                          <div className="flex items-center gap-2">
                            {term.name}
                            {isCurrent && (
                              <span className="flex h-2 w-2 rounded-full bg-[var(--brand-color)] animate-pulse" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 dark:text-gray-300">{term.order}</TableCell>
                        <TableCell className="px-4 py-3 dark:text-gray-300"><FormattedDate date={term.startDate} /></TableCell>
                        <TableCell className="px-4 py-3 dark:text-gray-300"><FormattedDate date={term.endDate} /></TableCell>
                        <TableCell className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${getTermStatusColor(status)}`}>
                            {status}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-200"
                                aria-label={t.actions}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openEditTerm(term)}
                                disabled={term.isLocked}
                              >
                                {t.edit}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleLockTerm(term.id, term.isLocked)}
                              >
                                {term.isLocked ? t.unlock : t.lock}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteTerm(term.id)}
                                disabled={term.isLocked}
                                className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                              >
                                {t.delete}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {selectedYear.terms.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                {t.noPeriods}
              </p>
            )}
          </div>

          {/* Activate Button */}
          {!selectedYear.isActive && (
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border dark:border-slate-800">
              <button
                onClick={() => handleActivateYear(selectedYear.id)}
                disabled={saving || getTotalWeight() !== 100}
                className="rounded-lg bg-[var(--brand-color,#e35336)] px-6 py-2 text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--brand-color,#e35336)]/20 disabled:opacity-50"
              >
                {t.activate}
              </button>
              {getTotalWeight() !== 100 && (
                <p className="text-yellow-600 dark:text-yellow-400 mt-2">
                  {t.weightWarning}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Create Academic Year Dialog */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md border dark:border-slate-800 dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>{t.createYear}</DialogTitle>
          </DialogHeader>
            <form onSubmit={handleCreateAcademicYear} className="space-y-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
                {t.curriculumNotice} <strong>{schoolCurriculumType}</strong>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.name}</label>
                <input
                  type="text"
                  value={newYear.name}
                  onChange={e => setNewYear({ ...newYear, name: e.target.value })}
                  placeholder="2025-2026"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.startDate}</label>
                  <CalendarDatePicker
                    value={newYear.startDate ? new Date(newYear.startDate) : undefined}
                    onChange={(date) => setNewYear({ ...newYear, startDate: date ? date.toISOString() : '' })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.endDate}</label>
                  <CalendarDatePicker
                    value={newYear.endDate ? new Date(newYear.endDate) : undefined}
                    onChange={(date) => setNewYear({ ...newYear, endDate: date ? date.toISOString() : '' })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:text-gray-300"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[var(--brand-color,#e35336)] px-4 py-2 text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--brand-color,#e35336)]/20"
                >
                  {saving ? t.creating : t.create}
                </button>
              </div>
            </form>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Term Modal */}
      {showTermModal && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-md border dark:border-slate-800">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">
              {editingTerm ? t.editPeriod : t.addPeriod}
            </h3>
            <form onSubmit={editingTerm ? handleUpdateTerm : handleCreateTerm} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.periodName}</label>
                <input
                  type="text"
                  value={newTerm.name}
                  onChange={e => setNewTerm({ ...newTerm, name: e.target.value })}
                  placeholder={selectedYear?.curriculumType === 'QUARTER' ? 'Quarter 1' : 'Semester 1'}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.order}</label>
                  <input
                    type="number"
                    value={newTerm.order}
                    onChange={e => setNewTerm({ ...newTerm, order: parseInt(e.target.value) })}
                    min="1"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t.weight}</label>
                  <input
                    type="number"
                    value={newTerm.percentageWeight}
                    onChange={e => setNewTerm({ ...newTerm, percentageWeight: parseFloat(e.target.value) })}
                    min="0"
                    max="100"
                    step="0.01"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.startDate}</label>
                  <CalendarDatePicker
                    value={newTerm.startDate ? new Date(newTerm.startDate) : undefined}
                    onChange={(date) => setNewTerm({ ...newTerm, startDate: date ? date.toISOString() : '' })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.endDate}</label>
                  <CalendarDatePicker
                    value={newTerm.endDate ? new Date(newTerm.endDate) : undefined}
                    onChange={(date) => setNewTerm({ ...newTerm, endDate: date ? date.toISOString() : '' })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowTermModal(false);
                    setEditingTerm(null);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:text-gray-300"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[var(--brand-color,#e35336)] px-4 py-2 text-white transition-all hover:opacity-90 hover:shadow-lg hover:shadow-[var(--brand-color,#e35336)]/20"
                >
                  {saving ? t.saving : editingTerm ? t.update : t.create}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
