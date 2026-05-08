"use client";

import { useCallback, useState, useEffect } from "react";
import { sirenEventAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  History,
  AlertCircle,
  Loader2,
  Filter,
  RefreshCw,
  Download,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface SirenEvent {
  id: string;
  type: string;
  triggerType: string;
  firedAt: string;
  periodNumber?: number;
  webhookSent: boolean;
  pushSent: boolean;
}

export function SirenEventHistory() {
  const { user } = useAuth();
  const [events, setEvents] = useState<SirenEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const schoolId = user?.schoolId;

  // Fetch events
  const fetchEvents = useCallback(async () => {
    if (!schoolId) return;
    try {
      const res = await sirenEventAPI.list(schoolId, 100);
      setEvents(res.data || []);
    } catch (error) {
      toast.error("Failed to load siren events");
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = events.filter((event) => {
    const matchesFilter =
      filter === "all" || event.triggerType === filter;
    const matchesSearch =
      event.type.toLowerCase().includes(search.toLowerCase()) ||
      event.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleExport = () => {
    const csv = [
      ["Type", "Trigger Type", "Fired At", "Webhook Sent", "Push Sent"],
      ...filteredEvents.map((e) => [
        e.type,
        e.triggerType,
        new Date(e.firedAt).toLocaleString(),
        e.webhookSent ? "Yes" : "No",
        e.pushSent ? "Yes" : "No",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `siren-events-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Siren Events
            </CardTitle>
            <CardDescription>
              View audit log of all siren triggers
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchEvents}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-2"
              disabled={filteredEvents.length === 0}
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="DYNAMIC">Dynamic (Timetable)</SelectItem>
                <SelectItem value="STATIC">Static (Manual)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No events found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Fired At</TableHead>
                    <TableHead>Webhook</TableHead>
                    <TableHead>Push</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">
                        <Badge variant="outline">{event.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            event.triggerType === "DYNAMIC"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {event.triggerType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {event.periodNumber ? `Period ${event.periodNumber}` : "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(event.firedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            event.webhookSent ? "default" : "outline"
                          }
                          className={event.webhookSent ? "bg-green-100 text-green-800" : ""}
                        >
                          {event.webhookSent ? "Sent" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={event.pushSent ? "default" : "outline"}
                          className={event.pushSent ? "bg-green-100 text-green-800" : ""}
                        >
                          {event.pushSent ? "Sent" : "Pending"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 text-sm text-muted-foreground">
            <div>
              Showing {filteredEvents.length} of {events.length} events
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
