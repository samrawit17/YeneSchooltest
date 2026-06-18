import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { announcementsAPI, CreateAnnouncementDto } from "@/lib/api/content";
import { syncService } from "@/lib/db/sync-service";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { academicYearsAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CalendarDatePicker } from "@/components/ui/CalendarDatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import { toast } from "sonner";
import { Loader2, Clock } from "lucide-react";
import { useTranslations } from "@/hooks/useTranslations";

interface CreateAnnouncementFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CreateAnnouncementForm = ({ onSuccess, onCancel }: CreateAnnouncementFormProps) => {
  const { t } = useTranslations<any>("announcements");
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentAcademicYear } = useAcademicYear();
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string; isActive: boolean }[]>([]);
  const [formData, setFormData] = useState<CreateAnnouncementDto>({
    title: "",
    content: "",
    visibleTo: [],
    isPublic: false,
    startDate: new Date().toISOString().split("T")[0],
    priority: "MEDIUM",
    location: "",
    academicYearId: currentAcademicYear?.id || undefined,
  });
  useEffect(() => {
    if (!user?.schoolId) return;
    academicYearsAPI.getAll({ schoolId: user.schoolId }).then((res) => {
      const years = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setAcademicYears(years);
    }).catch(() => {});
  }, [user?.schoolId]);

  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [postImmediately, setPostImmediately] = useState(true);
  const [scheduleDateValue, setScheduleDateValue] = useState<Date | undefined>(new Date());
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [endDateValue, setEndDateValue] = useState<Date | undefined>(undefined);

  const createMutation = useMutation({
    mutationFn: (data: CreateAnnouncementDto) => announcementsAPI.create(data),
    onSuccess: () => {
      toast.success(t.form.published);
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
      onSuccess?.();
    },
    onError: async (error: any, data) => {
      const isNetworkError = !navigator.onLine || !error?.response;
      if (!isNetworkError) {
        toast.error(error?.response?.data?.message || t.form.failed);
        return;
      }

      await syncService.saveAnnouncementDraftOffline({
        ...data,
        localId: `announcement:${Date.now()}`,
        userId: user?.id,
      });
      toast.success(t.form.savedOffline);
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
    
    const showOnLoginPage = !!formData.isPublic;
    const submitData: CreateAnnouncementDto = {
      title: formData.title,
      content: formData.content,
      startDate,
      visibleTo: selectedRoles,
      isPublic: showOnLoginPage,
      priority: formData.priority as "LOW" | "MEDIUM" | "HIGH",
      location: formData.location || undefined,
      academicYearId: formData.academicYearId || undefined,
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

  const stepBadgeClass = "flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(var(--brand-color-rgb),0.12)] text-[11px] font-semibold text-[var(--brand-color,#e35336)]";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 1. Details */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <span className={stepBadgeClass}>1</span>
          {t.form.details}
        </h3>
        <div className="grid gap-4 pl-7 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t.form.title} <span className="text-red-500">*</span></Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t.form.titlePlaceholder}
              className="border-[#E2E8F0] bg-white focus-visible:ring-[var(--brand-color,#e35336)] dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <Label>{t.form.priority}</Label>
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
                <SelectValue placeholder={t.form.selectPriority} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">{t.normal}</SelectItem>
                <SelectItem value="MEDIUM">{t.important}</SelectItem>
                <SelectItem value="HIGH">{t.urgent}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Academic Year</Label>
            <Select
              value={formData.academicYearId || "none"}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  academicYearId: value === "none" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="bg-white dark:bg-gray-800 dark:border-gray-600">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {academicYears.map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    {year.name} {year.isActive ? "(Active)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 2. Audience */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <span className={stepBadgeClass}>2</span>
          {t.form.audience}
        </h3>
        <div className="space-y-4 pl-7">
          <div className="flex flex-wrap gap-3">
            {[
              { id: "student", label: t.students },
              { id: "parent", label: t.parents },
              { id: "staff", label: t.staff },
            ].map((role) => (
              <label key={role.id} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 cursor-pointer hover:border-[var(--brand-color,#e35336)] dark:bg-gray-800 dark:border-gray-600">
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role.id)}
                  onChange={() => handleRoleToggle(role.id)}
                  className="w-4 h-4 accent-[var(--brand-color,#e35336)]"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{role.label}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-gray-50 p-3 dark:bg-gray-800 dark:border-gray-600">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Show on login page</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Make this announcement visible before users sign in.</p>
            </div>
            <Switch
              checked={!!formData.isPublic}
              onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
            />
          </div>
        </div>
      </div>

      {/* 3. Content */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <span className={stepBadgeClass}>3</span>
          {t.form.content}
        </h3>
        <div className="grid gap-4 pl-7 md:grid-cols-[1.5fr_1fr]">
          <div className="space-y-2">
            <Label>{t.form.content} <span className="text-red-500">*</span></Label>
            <Textarea
              id="content"
              placeholder={t.form.contentPlaceholder}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={5}
              className="min-h-[132px] border-[#E2E8F0] bg-white focus-visible:ring-[var(--brand-color,#e35336)] dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <Label>{t.form.location} <span className="text-xs text-gray-400">(optional)</span></Label>
            <Input
              id="location"
              value={formData.location || ""}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder={t.form.locationPlaceholder}
              className="border-[#E2E8F0] bg-white focus-visible:ring-[var(--brand-color,#e35336)] dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* 4. Schedule */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <span className={stepBadgeClass}>4</span>
          {t.form.schedule}
        </h3>
        <div className="space-y-4 pl-7">
          <div className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-gray-50 p-3 dark:bg-gray-800 dark:border-gray-600">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[var(--brand-color,#e35336)]" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{t.form.postImmediately}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t.form.postImmediatelyDescription}</p>
              </div>
            </div>
            <Switch checked={postImmediately} onCheckedChange={setPostImmediately} />
          </div>
          {!postImmediately && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.form.scheduleDate}</Label>
                <CalendarDatePicker value={scheduleDateValue} onChange={setScheduleDateValue} placeholder={t.form.selectScheduleDate} className="border-[#E2E8F0] focus-visible:ring-[var(--brand-color,#e35336)]" />
              </div>
              <div className="space-y-2">
                <Label>{t.form.time}</Label>
                <TimePicker value={scheduleTime} onChange={setScheduleTime} />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>{t.form.expirationDate}</Label>
            <CalendarDatePicker value={endDateValue} onChange={setEndDateValue} placeholder={t.form.selectExpirationDate} className="border-[#E2E8F0] focus-visible:ring-[var(--brand-color,#e35336)]" />
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-5 flex justify-end gap-2 border-t bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-900">
        <Button type="button" variant="outline" onClick={onCancel} className="border-[#E2E8F0] text-gray-700 dark:text-gray-300 dark:border-gray-600">{t.form.cancel}</Button>
        <Button type="submit" disabled={createMutation.isPending} className="bg-[var(--brand-color,#e35336)] hover:bg-[var(--brand-color,#e35336)] hover:opacity-90">
          {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t.form.publish}
        </Button>
      </div>
    </form>
  );
};

export default CreateAnnouncementForm;
