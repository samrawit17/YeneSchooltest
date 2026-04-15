'use client';

import { useState, useEffect } from 'react';
import { academicYearsAPI } from '@/lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { FormattedDate } from '@/components/ui/FormattedDate';
import { CalendarDatePicker } from '@/components/ui/CalendarDatePicker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [schoolCurriculumType, setSchoolCurriculumType] = useState<string>('QUARTER');

  // Fetch school settings to get curriculum type
  useEffect(() => {
    const fetchSchoolSettings = async () => {
      if (!user?.schoolId) return;
      try {
        const response = await academicYearsAPI.getAll({ schoolId: user.schoolId });
        // Get curriculum type from first academic year or default to QUARTER
        const years = response.data || [];
        if (years.length > 0 && years[0].curriculumType) {
          setSchoolCurriculumType(years[0].curriculumType);
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
    curriculumType: 'QUARTER',
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

  const calendarType = user?.calendarType || 'ETHIOPIAN';

  const refreshAcademicContext = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['academic-years'] }),
      queryClient.invalidateQueries({ queryKey: ['academic-years', schoolId] }),
      queryClient.invalidateQueries({ queryKey: ['active-academic-year', user?.schoolId] }),
      queryClient.invalidateQueries({ queryKey: ['current-term', user?.schoolId] }),
      queryClient.invalidateQueries({ queryKey: ['school-settings', user?.schoolId] }),
      queryClient.invalidateQueries({ queryKey: ['academic-year-active'] }),
      queryClient.invalidateQueries({ queryKey: ['current-term'] }),
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
      toast.error('Failed to load academic years');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAcademicYear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await academicYearsAPI.create({
        ...newYear,
        schoolId,
        calendarType: user?.calendarType || 'ETHIOPIAN',
      });
      await fetchAcademicYears(schoolId);
      await refreshAcademicContext();
      setShowCreateModal(false);
      setNewYear({ name: '', startDate: '', endDate: '', curriculumType: 'SEMESTER' } as any);
      toast.success('Academic year created successfully');
    } catch (error) {
      console.error('Error creating academic year:', error);
      toast.error('Failed to create academic year');
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
      toast.success('Curriculum type updated successfully');
    } catch (error) {
      console.error('Error updating curriculum type:', error);
      toast.error('Cannot change curriculum type after grading has begun');
    } finally {
      setSaving(false);
    }
  };

  const handleActivateYear = async (id: string) => {
    try {
      setSaving(true);
      await academicYearsAPI.activate(id);
      await fetchAcademicYears(schoolId);
      await refreshAcademicContext();
      toast.success('Academic year activated successfully');
    } catch (error) {
      console.error('Error activating academic year:', error);
      toast.error('Failed to activate academic year');
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
      toast.success('Period created successfully');
    } catch (error) {
      console.error('Error creating term:', error);
      toast.error('Failed to create period');
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
      toast.success('Period updated successfully');
    } catch (error) {
      console.error('Error updating term:', error);
      toast.error('Failed to update period');
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
      toast.success(`Period ${!isLocked ? 'locked' : 'unlocked'} successfully`);
    } catch (error) {
      console.error('Error locking term:', error);
      toast.error(`Failed to ${!isLocked ? 'lock' : 'unlock'} period`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTerm = async (termId: string) => {
    if (!confirm('Are you sure you want to delete this period?')) return;
    try {
      setSaving(true);
      await academicYearsAPI.deleteTerm(termId);
      await fetchAcademicYears(schoolId);
      await refreshAcademicContext();
      toast.success('Period deleted successfully');
    } catch (error) {
      console.error('Error deleting term:', error);
      toast.error('Cannot delete a period that has grades or is locked');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e35336]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl mt-3 font-bold text-[#e35336]">Unified Academic Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Configure your school's academic structure and calendars</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-[#e35336] text-white rounded-lg hover:bg-[#d14830]"
        >
          + New Academic Year
        </button>
      </div>

      {/* Academic Year Selection */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border dark:border-slate-800">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Academic Year
        </label>
        <select
          value={selectedYear?.id || ''}
          onChange={(e) => {
            const year = academicYears.find(y => y.id === e.target.value);
            setSelectedYear(year || null);
          }}
          className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        >
          {academicYears.map(year => (
            <option key={year.id} value={year.id}>
              {year.name} ({year.calendarType || 'ETHIOPIAN'}) {year.isActive && '(Active)'}
            </option>
          ))}
        </select>
      </div>

      {selectedYear && (
        <>
          {/* Periods/Terms */}
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold dark:text-white">
                Periods ({schoolCurriculumType})
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {selectedYear.terms.length} period(s) auto-created
              </span>
            </div>

            {/* Weight Summary */}
            <div className={`mb-4 p-3 rounded-lg ${getTotalWeight() === 100 ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
              }`}>
              Total Weight: {getTotalWeight()}% {getTotalWeight() === 100 ? '✓' : '(Should be 100%)'}
            </div>

            {/* Terms Table */}
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-slate-800">
                    <TableHead className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Period Name</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Order</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Weight %</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">End Date</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Status</TableHead>
                    <TableHead className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {selectedYear.terms.sort((a, b) => a.order - b.order).map(term => (
                    <TableRow key={term.id} className={term.isLocked ? 'bg-gray-50 dark:bg-slate-800' : 'dark:hover:bg-slate-800/50'}>
                      <TableCell className="px-4 py-3 font-medium dark:text-white">{term.name}</TableCell>
                      <TableCell className="px-4 py-3 dark:text-gray-300">{term.order}</TableCell>
                      <TableCell className="px-4 py-3 dark:text-gray-300">{term.percentageWeight}%</TableCell>
                      <TableCell className="px-4 py-3 dark:text-gray-300"><FormattedDate date={term.startDate} /></TableCell>
                      <TableCell className="px-4 py-3 dark:text-gray-300"><FormattedDate date={term.endDate} /></TableCell>
                      <TableCell className="px-4 py-3">
                        {term.isLocked ? (
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 rounded text-xs">Locked</span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 rounded text-xs">Active</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditTerm(term)}
                            disabled={term.isLocked}
                            className="text-[#e35336] hover:text-[#d14830] disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleLockTerm(term.id, term.isLocked)}
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                          >
                            {term.isLocked ? 'Unlock' : 'Lock'}
                          </button>
                          <button
                            onClick={() => handleDeleteTerm(term.id)}
                            disabled={term.isLocked}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {selectedYear.terms.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No periods configured. The curriculum type will auto-create periods when you save.
              </p>
            )}
          </div>

          {/* Activate Button */}
          {!selectedYear.isActive && (
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border dark:border-slate-800">
              <button
                onClick={() => handleActivateYear(selectedYear.id)}
                disabled={saving || getTotalWeight() !== 100}
                className="px-6 py-2 bg-[#e35336] text-white rounded-lg hover:bg-[#d14830] disabled:opacity-50"
              >
                Activate Academic Year
              </button>
              {getTotalWeight() !== 100 && (
                <p className="text-yellow-600 dark:text-yellow-400 mt-2">
                  Please ensure period weights total 100% before activating.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Create Academic Year Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-md border dark:border-slate-800">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Create Academic Year</h3>
            <form onSubmit={handleCreateAcademicYear} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                  <CalendarDatePicker
                    value={newYear.startDate ? new Date(newYear.startDate) : undefined}
                    onChange={(date) => setNewYear({ ...newYear, startDate: date ? date.toISOString() : '' })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                  <CalendarDatePicker
                    value={newYear.endDate ? new Date(newYear.endDate) : undefined}
                    onChange={(date) => setNewYear({ ...newYear, endDate: date ? date.toISOString() : '' })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Curriculum Type</label>
                <div className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400 text-sm">
                  {newYear.curriculumType === 'QUARTER' && 'Quarter (4 periods) - Auto-created'}
                  {newYear.curriculumType === 'TERM' && 'Term (3 periods) - Auto-created'}
                  {newYear.curriculumType === 'SEMESTER' && 'Semester (2 periods) - Auto-created'}
                  {newYear.curriculumType === 'CUSTOM' && 'Custom (No auto-creation)'}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Periods are automatically created based on this selection</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Calendar Type</label>
                <div className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400">
                  {user?.calendarType || 'ETHIOPIAN'} (Inherited from School Settings)
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#e35336] text-white rounded-lg hover:bg-[#d14830]"
                >
                  {saving ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit Term Modal */}
      {showTermModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-md border dark:border-slate-800">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">
              {editingTerm ? 'Edit Period' : 'Add Period'}
            </h3>
            <form onSubmit={editingTerm ? handleUpdateTerm : handleCreateTerm} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Period Name</label>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Order</label>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Weight %</label>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                  <CalendarDatePicker
                    value={newTerm.startDate ? new Date(newTerm.startDate) : undefined}
                    onChange={(date) => setNewTerm({ ...newTerm, startDate: date ? date.toISOString() : '' })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#e35336] text-white rounded-lg hover:bg-[#d14830]"
                >
                  {saving ? 'Saving...' : editingTerm ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
