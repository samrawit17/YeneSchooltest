"use client";

import { useCallback, useState, useEffect } from "react";
import { periodTimeAPI } from "@/lib/api/siren-period-time";
import { schoolSettingsAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { formatTimeByCalendarType } from "@/lib/calendar-utils";
import { toast } from "sonner";
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  Save,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimePicker } from "@/components/ui/TimePicker";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "@/hooks/useTranslations";

interface PeriodTime {
  id: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  timetableSlotCount?: number;
  canDelete?: boolean;
}

const DEFAULT_MAX_PERIODS_PER_DAY = 7;

type ApiErrorLike = {
  response?: {
    data?: {
      message?: string | string[];
      error?: string;
    };
  };
  message?: string;
};

function getApiErrorMessage(error: unknown, fallback: string) {
  const apiError = error as ApiErrorLike;
  const message = apiError.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join(", ");
  }

  return message || apiError.response?.data?.error || apiError.message || fallback;
}

function timeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function timesOverlap(
  leftStart: string,
  leftEnd: string,
  rightStart: string,
  rightEnd: string
) {
  return (
    timeToMinutes(leftStart) < timeToMinutes(rightEnd) &&
    timeToMinutes(rightStart) < timeToMinutes(leftEnd)
  );
}

export function PeriodTimeManagement() {
  const { user } = useAuth();
  const { schoolCalendarType } = useAcademicYear();
  const { t } = useTranslations<any>("sirenManagement");
  const [periods, setPeriods] = useState<PeriodTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [maxPeriodsPerDay, setMaxPeriodsPerDay] = useState(DEFAULT_MAX_PERIODS_PER_DAY);
  const [form, setForm] = useState({
    periodNumber: "",
    startTime: "",
    endTime: "",
  });

  const schoolId = user?.schoolId;
  const editingPeriod = editingId ? periods.find((period) => period.id === editingId) : null;
  const deletePeriod = deleteId ? periods.find((period) => period.id === deleteId) : null;
  const hasReachedMaxPeriods = periods.length >= maxPeriodsPerDay;

  // Fetch periods
  const fetchPeriods = useCallback(async () => {
    if (!schoolId) {
      setPeriods([]);
      setLoading(false);
      return;
    }
    try {
      const [res, settingsRes] = await Promise.all([
        periodTimeAPI.list(schoolId),
        schoolSettingsAPI.getAll(schoolId, { skipAuthErrorRedirect: true }).catch(() => null),
      ]);
      const configuredMaxPeriods = Number(settingsRes?.data?.MAX_PERIODS_PER_DAY);
      setMaxPeriodsPerDay(
        Number.isInteger(configuredMaxPeriods) &&
          configuredMaxPeriods >= 1 &&
          configuredMaxPeriods <= 12
          ? configuredMaxPeriods
          : DEFAULT_MAX_PERIODS_PER_DAY,
      );
      setPeriods(res.data || []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t.period.toasts.loadFailed));
    } finally {
      setLoading(false);
    }
  }, [schoolId, t.period.toasts.loadFailed]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  const validateForm = () => {
    if (!form.periodNumber || !form.startTime || !form.endTime) {
      toast.error(t.period.toasts.fieldsRequired);
      return null;
    }

    const periodNumber = Number(form.periodNumber);
    if (!Number.isInteger(periodNumber) || periodNumber < 1 || periodNumber > maxPeriodsPerDay) {
      toast.error(t.period.toasts.periodRange.replace("{max}", String(maxPeriodsPerDay)));
      return null;
    }

    if (!editingId && hasReachedMaxPeriods) {
      toast.error(t.period.toasts.maxReached.replace("{max}", String(maxPeriodsPerDay)));
      return null;
    }

    if (form.startTime >= form.endTime) {
      toast.error(t.period.toasts.startBeforeEnd);
      return null;
    }

    const existingPeriod = periods.find(
      (period) => period.id !== editingId && period.periodNumber === periodNumber
    );
    if (existingPeriod) {
      toast.error(t.period.toasts.periodExists.replace("{number}", String(periodNumber)));
      return null;
    }

    const overlappingPeriod = periods.find(
      (period) =>
        period.id !== editingId &&
        timesOverlap(form.startTime, form.endTime, period.startTime, period.endTime)
    );
    if (overlappingPeriod) {
      toast.error(
        t.period.toasts.timeOverlaps
          .replace("{number}", String(overlappingPeriod.periodNumber))
          .replace("{start}", overlappingPeriod.startTime)
          .replace("{end}", overlappingPeriod.endTime)
      );
      return null;
    }

    return periodNumber;
  };

  const handleSave = async () => {
    const periodNumber = validateForm();
    if (!periodNumber) return;

    if (!schoolId) {
      toast.error(t.period.toasts.schoolNotFound);
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await periodTimeAPI.update(editingId, {
          schoolId,
          periodNumber,
          startTime: form.startTime,
          endTime: form.endTime,
        });
        toast.success(t.period.toasts.updated);
      } else {
        await periodTimeAPI.create({
          schoolId,
          periodNumber,
          startTime: form.startTime,
          endTime: form.endTime,
        });
        toast.success(t.period.toasts.created);
      }
      await fetchPeriods();
      setIsOpen(false);
      setEditingId(null);
      setForm({ periodNumber: "", startTime: "", endTime: "" });
    } catch (error) {
      toast.error(getApiErrorMessage(error, t.period.toasts.saveFailed));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (period: PeriodTime) => {
    setForm({
      periodNumber: period.periodNumber.toString(),
      startTime: period.startTime,
      endTime: period.endTime,
    });
    setEditingId(period.id);
    setIsOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await periodTimeAPI.delete(deleteId);
      toast.success(t.period.toasts.deleted);
      await fetchPeriods();
      setDeleteId(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t.period.toasts.deleteFailed));
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setEditingId(null);
      setForm({ periodNumber: "", startTime: "", endTime: "" });
    }
    setIsOpen(open);
  };

  return (
    <Card className="max-w-full overflow-hidden">
      <CardHeader>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex min-w-0 items-center gap-2">
              <Clock className="h-5 w-5 shrink-0" />
              {t.period.title}
            </CardTitle>
            <CardDescription className="break-words">
              {t.period.description}
            </CardDescription>
            <p className="mt-1 text-xs text-muted-foreground">
              {t.period.maxConfigured.replace("{max}", String(maxPeriodsPerDay))}
            </p>
          </div>
          <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="gap-2 self-start sm:self-auto"
                disabled={hasReachedMaxPeriods}
                title={hasReachedMaxPeriods ? t.period.toasts.maxReached.replace("{max}", String(maxPeriodsPerDay)) : undefined}
              >
                <Plus className="h-4 w-4 shrink-0" />
                {t.period.addPeriod}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? t.period.editPeriod : t.period.addPeriodTime}
                </DialogTitle>
                <DialogDescription>
                  {t.period.dialogDescription}
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                <div className="font-medium">{t.period.impactTitle}</div>
                <div className="mt-1">
                  {editingPeriod?.timetableSlotCount
                    ? t.period.impactWithUsage.replace("{count}", String(editingPeriod.timetableSlotCount))
                    : t.period.impactWithoutUsage}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="period">{t.period.periodNumber}</Label>
                  <Input
                    id="period"
                    type="number"
                    min="1"
                    max={maxPeriodsPerDay}
                    placeholder={t.period.periodPlaceholder}
                    value={form.periodNumber}
                    onChange={(e) =>
                      setForm({ ...form, periodNumber: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="startTime">{t.period.startTime}</Label>
                  <TimePicker
                    value={form.startTime}
                    onChange={(time) => setForm({ ...form, startTime: time })}
                    placeholder={t.period.startPlaceholder}
                    calendarType={schoolCalendarType}
                  />
                </div>

                <div>
                  <Label htmlFor="endTime">{t.period.endTime}</Label>
                  <TimePicker
                    value={form.endTime}
                    onChange={(time) => setForm({ ...form, endTime: time })}
                    placeholder={t.period.endPlaceholder}
                    calendarType={schoolCalendarType}
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  {t.period.cancel}
                </Button>
                <Button onClick={handleSave} className="gap-2" disabled={saving}>
                  <Save className="w-4 h-4" />
                  {saving ? t.period.saving : editingId ? t.period.update : t.period.create}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="min-w-0">
        {loading ? (
          <div className="max-w-full overflow-x-auto">
            <Table className="min-w-[680px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t.period.period}</TableHead>
                  <TableHead>{t.period.startTime}</TableHead>
                  <TableHead>{t.period.endTime}</TableHead>
                  <TableHead>{t.period.duration}</TableHead>
                  <TableHead>{t.period.usage}</TableHead>
                  <TableHead className="text-right">{t.period.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : periods.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">{t.period.noPeriods}</p>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              {t.period.emptyHint}
            </p>
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <Table className="min-w-[680px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t.period.period}</TableHead>
                  <TableHead>{t.period.startTime}</TableHead>
                  <TableHead>{t.period.endTime}</TableHead>
                  <TableHead>{t.period.duration}</TableHead>
                  <TableHead>{t.period.usage}</TableHead>
                  <TableHead className="text-right">{t.period.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((period) => {
                  const duration = calculateDuration(
                    period.startTime,
                    period.endTime,
                    t.period.durationHoursMinutes,
                    t.period.durationMinutes
                  );
                  return (
                    <TableRow key={period.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {t.period.periodLabel.replace("{number}", String(period.periodNumber))}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatTimeByCalendarType(period.startTime, schoolCalendarType)}
                        </div>
                        <div className="text-xs text-muted-foreground">{period.startTime}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatTimeByCalendarType(period.endTime, schoolCalendarType)}
                        </div>
                        <div className="text-xs text-muted-foreground">{period.endTime}</div>
                      </TableCell>
                      <TableCell>{duration}</TableCell>
                      <TableCell>
                        <Badge variant={period.timetableSlotCount ? "secondary" : "outline"}>
                          {period.timetableSlotCount
                            ? t.period.usedBySlots.replace("{count}", String(period.timetableSlotCount))
                            : t.period.notUsed}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(period)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(period.id)}
                            disabled={period.canDelete === false}
                            title={period.canDelete === false ? t.period.deleteBlocked : undefined}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.period.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {deletePeriod?.timetableSlotCount
                ? t.period.deleteBlockedWithUsage.replace("{count}", String(deletePeriod.timetableSlotCount))
                : t.period.deleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>{t.period.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting || deletePeriod?.canDelete === false}
              className="bg-destructive"
            >
              {deleting ? t.period.deleting : t.period.delete}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function calculateDuration(
  startTime: string,
  endTime: string,
  hoursMinutesTemplate: string,
  minutesTemplate: string
): string {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  let minutes = endH * 60 + endM - (startH * 60 + startM);
  const hours = Math.floor(minutes / 60);
  minutes = minutes % 60;

  if (hours > 0) {
    return hoursMinutesTemplate
      .replace("{hours}", String(hours))
      .replace("{minutes}", String(minutes));
  }
  return minutesTemplate.replace("{minutes}", String(minutes));
}
