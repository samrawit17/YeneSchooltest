"use client";

import { useCallback, useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  AlertCircle,
  Loader2,
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

interface PeriodTime {
  id: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
}

export function PeriodTimeManagement() {
  const { user } = useAuth();
  const [periods, setPeriods] = useState<PeriodTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    periodNumber: "",
    startTime: "",
    endTime: "",
  });

  const schoolId = user?.schoolId;

  // Fetch periods
  const fetchPeriods = useCallback(async () => {
    if (!schoolId) return;
    try {
      const res = await api.get('/api/period-time', {
        params: { schoolId },
        skipAuthErrorRedirect: true,
      });
      setPeriods(res.data || []);
    } catch (error) {
      toast.error("Failed to load period times");
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  const handleSave = async () => {
    if (!form.periodNumber || !form.startTime || !form.endTime) {
      toast.error("All fields are required");
      return;
    }

    if (form.startTime >= form.endTime) {
      toast.error("Start time must be before end time");
      return;
    }

    try {
      if (editingId) {
        await api.put(
          `/api/period-time/${editingId}`,
          {
            schoolId,
            periodNumber: parseInt(form.periodNumber),
            startTime: form.startTime,
            endTime: form.endTime,
          },
          { skipAuthErrorRedirect: true }
        );
        toast.success("Period time updated");
      } else {
        await api.post(
          '/api/period-time',
          {
            schoolId,
            periodNumber: parseInt(form.periodNumber),
            startTime: form.startTime,
            endTime: form.endTime,
          },
          {
            params: { schoolId },
            skipAuthErrorRedirect: true,
          }
        );
        toast.success("Period time created");
      }
      await fetchPeriods();
      setIsOpen(false);
      setEditingId(null);
      setForm({ periodNumber: "", startTime: "", endTime: "" });
    } catch (error) {
      toast.error("Failed to save period time");
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
    try {
      await api.delete(`/api/period-time/${deleteId}`, {
        skipAuthErrorRedirect: true,
      });
      toast.success("Period time deleted");
      await fetchPeriods();
      setDeleteId(null);
    } catch (error) {
      toast.error("Failed to delete period time");
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Period Times
            </CardTitle>
            <CardDescription>
              Configure school periods and their time slots
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Period
              </Button>
            </DialogTrigger>
            <DialogContent>
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
                  <Input
                    id="startTime"
                    type="time"
                    value={form.startTime}
                    onChange={(e) =>
                      setForm({ ...form, startTime: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={form.endTime}
                    onChange={(e) =>
                      setForm({ ...form, endTime: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
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

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : periods.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No periods configured yet</p>
          </div>
        ) : (
          <Table>
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
                      <TableCell className="font-mono">
                        {period.startTime}
                      </TableCell>
                      <TableCell className="font-mono">
                        {period.endTime}
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
        )}
      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Period Time?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The period time will be deleted
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
