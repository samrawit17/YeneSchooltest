import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { announcementsAPI, CreateAnnouncementDto } from "@/lib/api/content";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CalendarDatePicker } from "@/components/ui/CalendarDatePicker";
import { toast } from "sonner";
import { Loader2, Clock } from "lucide-react";

interface CreateAnnouncementFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ROLES = [
  { id: "student", label: "Students" },
  { id: "parent", label: "Parents" },
  { id: "teacher", label: "Staff" },
];

const CreateAnnouncementForm = ({ onSuccess, onCancel }: CreateAnnouncementFormProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CreateAnnouncementDto>({
    title: "",
    content: "",
    visibleTo: [],
    startDate: new Date().toISOString().split("T")[0],
    priority: "MEDIUM",
    location: "",
  });
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [postImmediately, setPostImmediately] = useState(true);
  const [scheduleDateValue, setScheduleDateValue] = useState<Date | undefined>(new Date());
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [endDateValue, setEndDateValue] = useState<Date | undefined>(undefined);

  const createMutation = useMutation({
    mutationFn: (data: CreateAnnouncementDto) => announcementsAPI.create(data),
    onSuccess: () => {
      toast.success("Announcement published successfully");
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
      onSuccess?.();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let startDate: string;
    if (postImmediately) {
      startDate = new Date().toISOString();
    } else if (scheduleDateValue) {
      const [hours, minutes] = scheduleTime.split(":").map(Number);
      const scheduled = new Date(scheduleDateValue);
      scheduled.setHours(hours, minutes, 0, 0);
      startDate = scheduled.toISOString();
    } else {
      startDate = new Date().toISOString();
    }
    
    const submitData: CreateAnnouncementDto = {
      title: formData.title,
      content: formData.content,
      startDate,
      visibleTo: selectedRoles,
      priority: formData.priority as "LOW" | "MEDIUM" | "HIGH",
      location: formData.location,
    };
    
    // Only include endDate if it has a value
    if (endDateValue) {
      submitData.endDate = endDateValue.toISOString();
    }
    
    createMutation.mutate(submitData);
  };

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="w-6 h-6 bg-[#e35336]/10 rounded-full flex items-center justify-center text-xs text-[#e35336]">1</span>
          Details
        </h3>
        <div className="space-y-4 pl-8">
          <div className="space-y-2">
            <Label>Title <span className="text-red-500">*</span></Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter announcement title"
              className="border-[#E2E8F0] bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  priority: value as "LOW" | "MEDIUM" | "HIGH",
                })
              }
            >
              <SelectTrigger className="bg-white dark:bg-gray-800 dark:border-gray-600">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Normal</SelectItem>
                <SelectItem value="MEDIUM">Important</SelectItem>
                <SelectItem value="HIGH">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 2. Audience */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="w-6 h-6 bg-[#e35336]/10 rounded-full flex items-center justify-center text-xs text-[#e35336]">2</span>
          Audience
        </h3>
        <div className="space-y-4 pl-8">
          <div className="flex flex-wrap gap-3">
            {ROLES.map((role) => (
              <label key={role.id} className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:border-[#e35336] bg-white dark:bg-gray-800 dark:border-gray-600">
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role.id)}
                  onChange={() => handleRoleToggle(role.id)}
                  className="w-4 h-4 accent-[#e35336]"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{role.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Content */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="w-6 h-6 bg-[#e35336]/10 rounded-full flex items-center justify-center text-xs text-[#e35336]">3</span>
          Content
        </h3>
        <div className="space-y-4 pl-8">
          <div className="space-y-2">
            <Label>Content <span className="text-red-500">*</span></Label>
            <Textarea
              id="content"
              placeholder="Enter announcement content..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={8}
              className="border-[#E2E8F0] bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              id="location"
              value={formData.location || ""}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Enter location (e.g., Main Hall, Room 101)"
              className="border-[#E2E8F0] bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* 4. Schedule */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="w-6 h-6 bg-[#e35336]/10 rounded-full flex items-center justify-center text-xs text-[#e35336]">4</span>
          Schedule
        </h3>
        <div className="space-y-4 pl-8">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-[#E2E8F0] dark:border-gray-600">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[#e35336]" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Post Immediately</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Publish this announcement right away</p>
              </div>
            </div>
            <Switch checked={postImmediately} onCheckedChange={setPostImmediately} />
          </div>
          {!postImmediately && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Schedule Date</Label>
                <CalendarDatePicker value={scheduleDateValue} onChange={setScheduleDateValue} placeholder="Select schedule date" className="border-[#E2E8F0]" />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="border-[#E2E8F0]" />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Expiration Date (Optional)</Label>
            <CalendarDatePicker value={endDateValue} onChange={setEndDateValue} placeholder="Select expiration date" className="border-[#E2E8F0]" />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="border-[#E2E8F0] text-gray-700 dark:text-gray-300 dark:border-gray-600">Cancel</Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Publish
        </Button>
      </div>
    </form>
  );
};

export default CreateAnnouncementForm;
