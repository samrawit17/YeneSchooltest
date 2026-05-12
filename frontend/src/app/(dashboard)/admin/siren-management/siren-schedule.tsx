"use client";

import { useCallback, useState, useEffect } from "react";
import { sirenScheduleAPI } from "@/lib/api/siren-schedules";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Bell,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  AlertCircle,
  Loader2,
  ToggleRight,
  ToggleLeft,
  Clock,
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
      toast.error("Failed to load siren schedules");
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

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
      toast.error("All fields are required");
      return;
    }

    try {
      if (editingId) {
        await sirenScheduleAPI.update(editingId, { schoolId, ...form });
        toast.success("Schedule updated");
      } else {
        await sirenScheduleAPI.create({ schoolId, ...form });
        toast.success("Schedule created");
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
      toast.error("Failed to save schedule");
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
      toast.success("Schedule deleted");
      await fetchSchedules();
      setDeleteId(null);
    } catch (error) {
      toast.error("Failed to delete schedule");
    }
  };
  const handleToggleActive = async (schedule: SirenSchedule) => {
    try {
      await sirenScheduleAPI.update(schedule.id, { ...schedule, isActive: !schedule.isActive });
      toast.success("Schedule updated");
      await fetchSchedules();
    } catch (error) {
      toast.error("Failed to update schedule");
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
              Siren Schedules
            </CardTitle>
            <CardDescription className="break-words">
              Manage static siren triggers (assembly, breaks, lunch, etc.)
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 self-start sm:self-auto">
                <Plus className="h-4 w-4 shrink-0" />
                Add Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Schedule" : "Add Siren Schedule"}
                </DialogTitle>
                <DialogDescription>
                  Set up manual siren schedules for recurring events
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Morning Assembly"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCHEDULE_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="ringTime">Ring Time</Label>
                    <Input
                      id="ringTime"
                      type="time"
                      value={form.ringTime}
                      onChange={(e) =>
                        setForm({ ...form, ringTime: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label>Days</Label>
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
                          {day.label}
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
                  Cancel
                </Button>
                <Button onClick={handleSave} className="gap-2">
                  <Save className="w-4 h-4" />
                  {editingId ? "Update" : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="min-w-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              No schedules configured yet
            </p>
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Countdown</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">{schedule.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{schedule.type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {schedule.ringTime}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {schedule.daysOfWeek.length} days
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
                            Active
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4 text-gray-400" />
                            Inactive
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
            <AlertDialogTitle>Delete Schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The schedule will be deleted
              permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
