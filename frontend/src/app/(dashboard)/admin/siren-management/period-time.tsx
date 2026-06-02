"use client";

import { useCallback, useState, useEffect } from "react";
import { periodTimeAPI } from "@/lib/api/siren-period-time";
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

interface PeriodTime {
  id: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
}

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
  const [periods, setPeriods] = useState<PeriodTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    periodNumber: "",
    startTime: "",
    endTime: "",
  });

  const schoolId = user?.schoolId;

  // Fetch periods
  const fetchPeriods = useCallback(async () => {
    if (!schoolId) {
      setPeriods([]);
      setLoading(false);
      return;
    }
    try {
      const res = await periodTimeAPI.list(schoolId);
      setPeriods(res.data || []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load period times"));
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  const validateForm = () => {
    if (!form.periodNumber || !form.startTime || !form.endTime) {
      toast.error("All fields are required");
      return null;
    }

    const periodNumber = Number(form.periodNumber);
    if (!Number.isInteger(periodNumber) || periodNumber < 1 || periodNumber > 12) {
      toast.error("Period number must be between 1 and 12");
      return null;
    }

    if (form.startTime >= form.endTime) {
      toast.error("Start time must be before end time");
      return null;
    }

    const existingPeriod = periods.find(
      (period) => period.id !== editingId && period.periodNumber === periodNumber
    );
    if (existingPeriod) {
      toast.error(`Period ${periodNumber} already exists`);
      return null;
    }

    const overlappingPeriod = periods.find(
      (period) =>
        period.id !== editingId &&
        timesOverlap(form.startTime, form.endTime, period.startTime, period.endTime)
    );
    if (overlappingPeriod) {
      toast.error(
        `Time overlaps Period ${overlappingPeriod.periodNumber} (${overlappingPeriod.startTime}-${overlappingPeriod.endTime})`
      );
      return null;
    }

    return periodNumber;
  };

  const handleSave = async () => {
    const periodNumber = validateForm();
    if (!periodNumber) return;

    if (!schoolId) {
      toast.error("School not found");
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
        toast.success("Period time updated");
      } else {
        await periodTimeAPI.create({
          schoolId,
          periodNumber,
          startTime: form.startTime,
          endTime: form.endTime,
        });
        toast.success("Period time created");
      }
      await fetchPeriods();
      setIsOpen(false);
      setEditingId(null);
      setForm({ periodNumber: "", startTime: "", endTime: "" });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save period time"));
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
      toast.success("Period time deleted");
      await fetchPeriods();
      setDeleteId(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete period time"));
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
              Period Times
            </CardTitle>
            <CardDescription className="break-words">
              Configure school periods and their time slots
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 self-start sm:self-auto">
                <Plus className="h-4 w-4 shrink-0" />
                Add Period
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Period" : "Add Period Time"}
                </DialogTitle>
                <DialogDescription>
                  Set up period numbers and their time slots
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="period">Period Number</Label>
                  <Input
                    id="period"
                    type="number"
                    min="1"
                    placeholder="e.g., 1, 2, 3"
                    value={form.periodNumber}
                    onChange={(e) =>
                      setForm({ ...form, periodNumber: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <TimePicker
                    value={form.startTime}
                    onChange={(time) => setForm({ ...form, startTime: time })}
                    placeholder="Select start time"
                    calendarType={schoolCalendarType}
                  />
                </div>

                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <TimePicker
                    value={form.endTime}
                    onChange={(time) => setForm({ ...form, endTime: time })}
                    placeholder="Select end time"
                    calendarType={schoolCalendarType}
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} className="gap-2" disabled={saving}>
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : editingId ? "Update" : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="min-w-0">
        {loading ? (
          <div className="max-w-full overflow-x-auto">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : periods.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No periods configured yet</p>
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((period) => {
                  const duration = calculateDuration(
                    period.startTime,
                    period.endTime
                  );
                  return (
                    <TableRow key={period.id}>
                      <TableCell>
                        <Badge variant="outline">
                          Period {period.periodNumber}
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
            <AlertDialogTitle>Delete Period Time?</AlertDialogTitle>
            <AlertDialogDescription>
              This can only be deleted when no timetable slots use the same
              start and end time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function calculateDuration(startTime: string, endTime: string): string {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  let minutes = endH * 60 + endM - (startH * 60 + startM);
  const hours = Math.floor(minutes / 60);
  minutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
