"use client";

import { useCallback, useState, useEffect } from "react";
import { sirenScheduleAPI } from "@/lib/api/siren-schedules";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Bell,
  Clock,
  ToggleLeft,
  ToggleRight,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslations } from "@/hooks/useTranslations";

interface SirenSchedule {
  id: string;
  name: string;
  type: string;
  ringTime: string;
  daysOfWeek: number[];
  isActive: boolean;
}

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const SCHEDULE_TYPES = ["ASSEMBLY", "BREAK", "LUNCH", "DISMISSAL", "CUSTOM"];

function getCountdown(ringTime: string, daysOfWeek: number[]): string {
  const now = new Date();
  const [hours, minutes] = ringTime.split(":").map(Number);
  const ringDate = new Date();
  ringDate.setHours(hours, minutes, 0, 0);

  const currentDay = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const ringTimeMinutes = hours * 60 + minutes;

  const activeDays = [...daysOfWeek].sort((a, b) => a - b);
  if (activeDays.length === 0) return "No days set";

  let daysUntil = activeDays.find(d => d > currentDay) !== undefined
    ? activeDays.find(d => d > currentDay)! - currentDay
    : activeDays.find(d => d < currentDay) === undefined && activeDays.includes(currentDay)
      ? 0
      : 7 - currentDay + activeDays.find(d => d < currentDay)!;

  if (activeDays.includes(currentDay) && ringTimeMinutes > currentTime) {
    daysUntil = 0;
  }

  const diffMs = ringDate.getTime() - now.getTime();
  if (diffMs < 0) {
    ringDate.setDate(ringDate.getDate() + 1);
  }

  const diff = ringDate.getTime() - now.getTime();
  const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
  const minsLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secsLeft = Math.floor((diff % (1000 * 60)) / 1000);

  if (daysUntil === 0) {
    return `${hoursLeft.toString().padStart(2, '0')}:${minsLeft.toString().padStart(2, '0')}:${secsLeft.toString().padStart(2, '0')}`;
  }
  return `${daysUntil}d ${hoursLeft.toString().padStart(2, '0')}:${minsLeft.toString().padStart(2, '0')}:${secsLeft.toString().padStart(2, '0')}`;
}

export function SirenScheduleManagement() {
  const { user } = useAuth();
  const { t } = useTranslations<any>("sirenManagement");
  const [schedules, setSchedules] = useState<SirenSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [countdowns, setCountdowns] = useState<Record<string, string>>({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const [form, setForm] = useState({
    name: "",
    type: "ASSEMBLY",
    ringTime: "",
    daysOfWeek: [] as number[],
    isActive: true,
  });

  const schoolId = user?.schoolId;

  // Fetch schedules
  const fetchSchedules = useCallback(async () => {
    if (!schoolId) return;
    try {
      const res = await sirenScheduleAPI.list(schoolId);
      setSchedules(res.data || []);
    } catch (error) {
      toast.error(t.schedule.toasts.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [schoolId, t.schedule.toasts.loadFailed]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      setCountdowns(prev => {
        const next: Record<string, string> = {};
        schedules.forEach(s => {
          if (s.isActive) {
            next[s.id] = getCountdown(s.ringTime, s.daysOfWeek);
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [schedules]);

  const handleSave = async () => {
    if (!form.name || !form.ringTime || form.daysOfWeek.length === 0) {
      toast.error(t.schedule.toasts.fieldsRequired);
      return;
    }

    if (!schoolId) {
      toast.error(t.schedule.toasts.schoolNotFound);
      return;
    }

    try {
      if (editingId) {
        await sirenScheduleAPI.update(editingId, { schoolId, ...form });
        toast.success(t.schedule.toasts.updated);
      } else {
        await sirenScheduleAPI.create({ schoolId, ...form });
        toast.success(t.schedule.toasts.created);
      }
      await fetchSchedules();
      setIsOpen(false);
      setEditingId(null);
      setForm({
        name: "",
        type: "ASSEMBLY",
        ringTime: "",
        daysOfWeek: [],
        isActive: true,
      });
    } catch (error) {
      toast.error(t.schedule.toasts.saveFailed);
    }
  };

  const handleEdit = (schedule: SirenSchedule) => {
    setForm({
      name: schedule.name,
      type: schedule.type,
      ringTime: schedule.ringTime,
      daysOfWeek: schedule.daysOfWeek,
      isActive: schedule.isActive,
    });
    setEditingId(schedule.id);
    setIsOpen(true);
  };

  const handleToggleDay = (day: number) => {
    setForm({
      ...form,
      daysOfWeek: form.daysOfWeek.includes(day)
        ? form.daysOfWeek.filter((d) => d !== day)
        : [...form.daysOfWeek, day].sort(),
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await sirenScheduleAPI.delete(deleteId);
      toast.success(t.schedule.toasts.deleted);
      await fetchSchedules();
      setDeleteId(null);
    } catch (error) {
      toast.error(t.schedule.toasts.deleteFailed);
    }
  };
  const handleToggleActive = async (schedule: SirenSchedule) => {
    try {
      await sirenScheduleAPI.update(schedule.id, { ...schedule, isActive: !schedule.isActive });
      toast.success(t.schedule.toasts.updated);
      await fetchSchedules();
    } catch (error) {
      toast.error(t.schedule.toasts.updateFailed);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setEditingId(null);
      setForm({
        name: "",
        type: "ASSEMBLY",
        ringTime: "",
        daysOfWeek: [],
        isActive: true,
      });
    }
    setIsOpen(open);
  };

  return (
    <Card className="max-w-full overflow-hidden">
      <CardHeader>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex min-w-0 items-center gap-2">
              <Bell className="h-5 w-5 shrink-0" />
              {t.schedule.title}
            </CardTitle>
            <CardDescription className="break-words">
              {t.schedule.description}
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 self-start sm:self-auto">
                <Plus className="h-4 w-4 shrink-0" />
                {t.schedule.addSchedule}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? t.schedule.editSchedule : t.schedule.addSirenSchedule}
                </DialogTitle>
                <DialogDescription>
                  {t.schedule.dialogDescription}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">{t.schedule.name}</Label>
                  <Input
                    id="name"
                    placeholder={t.schedule.namePlaceholder}
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="type">{t.schedule.type}</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCHEDULE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {t.schedule.typeLabels[type] ?? type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="ringTime">{t.schedule.ringTime}</Label>
                    <TimePicker value={form.ringTime} onChange={(time) => setForm({ ...form, ringTime: time })} />
                  </div>
                </div>

                <div>
                  <Label>{t.schedule.days}</Label>
                  <div className="grid grid-cols-1 gap-3 rounded-md border bg-muted/50 p-3 sm:grid-cols-2">
                    {DAYS.map((day) => (
                      <div key={day.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`day-${day.value}`}
                          checked={form.daysOfWeek.includes(day.value)}
                          onCheckedChange={() => handleToggleDay(day.value)}
                        />
                        <label
                          htmlFor={`day-${day.value}`}
                          className="cursor-pointer text-sm"
                        >
                          {t.schedule.dayNames[day.value] ?? day.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  {t.schedule.cancel}
                </Button>
                <Button onClick={handleSave} className="gap-2">
                  <Save className="w-4 h-4" />
                  {editingId ? t.schedule.update : t.schedule.create}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="min-w-0">
        {loading ? (
          <div className="max-w-full overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t.schedule.name}</TableHead>
                  <TableHead>{t.schedule.type}</TableHead>
                  <TableHead>{t.schedule.time}</TableHead>
                  <TableHead>{t.schedule.tableDays}</TableHead>
                  <TableHead>{t.schedule.active}</TableHead>
                  <TableHead className="text-right">{t.schedule.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {t.schedule.noSchedules}
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              {t.schedule.emptyHint}
            </p>
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t.schedule.name}</TableHead>
                  <TableHead>{t.schedule.type}</TableHead>
                  <TableHead>{t.schedule.time}</TableHead>
                  <TableHead>{t.schedule.tableDays}</TableHead>
                  <TableHead>{t.schedule.countdown}</TableHead>
                  <TableHead>{t.schedule.status}</TableHead>
                  <TableHead className="text-right">{t.schedule.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">{schedule.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{t.schedule.typeLabels[schedule.type] ?? schedule.type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {schedule.ringTime}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {t.schedule.daysCount.replace("{count}", String(schedule.daysOfWeek.length))}
                      </span>
                    </TableCell>
                    <TableCell>
                      {schedule.isActive ? (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="font-mono text-sm font-medium text-primary">
                            {countdowns[schedule.id] || "--:--:--"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(schedule)}
                        className="gap-1"
                      >
                        {schedule.isActive ? (
                          <>
                            <ToggleRight className="w-4 h-4 text-green-600" />
                            {t.schedule.active}
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4 text-gray-400" />
                            {t.schedule.inactive}
                          </>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(schedule)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(schedule.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.schedule.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.schedule.deleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>{t.schedule.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              {t.schedule.delete}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
