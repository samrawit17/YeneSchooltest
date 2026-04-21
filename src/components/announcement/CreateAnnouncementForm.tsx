"use client";

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { announcementsAPI, CreateAnnouncementDto } from "@/lib/api";
import { showToast } from "nextjs-toast-notify";
import { 
  X, 
  Loader2, 
  Calendar, 
  AlertTriangle,
  CheckCircle2,
  Users,
  Globe,
  Clock,
  Upload,
  Image as ImageIcon,
  FileText,
  Bold,
  List,
  Link as LinkIcon,
  Trash2,
  Plus,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CalendarDatePicker } from "@/components/ui/CalendarDatePicker";

interface CreateAnnouncementFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Categories
const CATEGORIES = [
  { id: "general", label: "General" },
  { id: "exam", label: "Exam" },
  { id: "event", label: "Event" },
  { id: "emergency", label: "Emergency" },
];

// Priority levels
const PRIORITIES = [
  { id: "LOW", label: "Normal", color: "blue" },
  { id: "MEDIUM", label: "Important", color: "amber" },
  { id: "HIGH", label: "Urgent", color: "red" },
];

// Role options
const ROLES = [
  { id: "student", label: "Students" },
  { id: "parent", label: "Parents" },
  { id: "teacher", label: "Staff" },
];

// Mock grades
const GRADES = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", 
  "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", 
  "Grade 11", "Grade 12"
];

// Mock classes
const CLASSES = [
  "Class A", "Class B", "Class C", "Class D", "Class E"
];

const CreateAnnouncementForm = ({ onSuccess, onCancel }: CreateAnnouncementFormProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<CreateAnnouncementDto>({
    title: "",
    content: "",
    visibleTo: [],
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    priority: "MEDIUM",
  });

  // Date states for Ethiopian calendar
  const [startDateValue, setStartDateValue] = useState<Date | undefined>(new Date());
  const [endDateValue, setEndDateValue] = useState<Date | undefined>(undefined);

  // Additional form fields
  const [category, setCategory] = useState("general");
  const [schoolWide, setSchoolWide] = useState(true);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [postImmediately, setPostImmediately] = useState(true);
  const [scheduleDateValue, setScheduleDateValue] = useState<Date | undefined>(undefined);
  const [scheduleTime, setScheduleTime] = useState("");
  const [requireAcknowledgment, setRequireAcknowledgment] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  
  // File uploads (mock)
  const [attachments, setAttachments] = useState<File[]>([]);
  const [images, setImages] = useState<File[]>([]);

  const createMutation = useMutation({
    mutationFn: async (data: CreateAnnouncementDto) => {
      const response = await announcementsAPI.create(data);
      return response.data;
    },
    onSuccess: () => {
      showToast.success("Announcement created successfully");
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      resetForm();
      onSuccess?.();
    },
    onError: (error: any) => {
      showToast.error(error.response?.data?.message || "Failed to create announcement");
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      visibleTo: [],
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      priority: "MEDIUM",
    });
    setCategory("general");
    setSchoolWide(true);
    setSelectedGrades([]);
    setSelectedClasses([]);
    setSelectedRoles([]);
    setPostImmediately(true);
    setScheduleDateValue(undefined);
    setScheduleTime("");
    setStartDateValue(new Date());
    setEndDateValue(undefined);
    setRequireAcknowledgment(false);
    setAllowComments(true);
    setAttachments([]);
    setImages([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      showToast.error("Please enter a title");
      return;
    }
    if (!formData.content.trim()) {
      showToast.error("Please enter content");
      return;
    }

    // Calculate start date based on schedule
    let startDate = startDateValue ? startDateValue.toISOString().split("T")[0] : formData.startDate;
    if (!postImmediately && scheduleDateValue) {
      const scheduleDateStr = scheduleDateValue.toISOString().split("T")[0];
      startDate = scheduleDateStr;
      if (scheduleTime) {
        startDate = `${scheduleDateStr}T${scheduleTime}`;
      }
    }

    // For school-wide announcements, don't send visibleTo (or send undefined)
    // For targeted announcements, send the selected roles
    const submitData = {
      ...formData,
      startDate,
      endDate: endDateValue ? endDateValue.toISOString().split("T")[0] : undefined,
      visibleTo: schoolWide ? undefined : (formData.visibleTo && formData.visibleTo.length > 0 ? formData.visibleTo : undefined),
    };
    
    createMutation.mutate(submitData);
  };

  const handleRoleToggle = (roleId: string) => {
    const current = selectedRoles;
    const newRoles = current.includes(roleId)
      ? current.filter(r => r !== roleId)
      : [...current, roleId];
    setSelectedRoles(newRoles);
    
    // Update visibleTo
    const visibleTo = [...newRoles];
    setFormData({ ...formData, visibleTo });
  };

  const handleGradeToggle = (grade: string) => {
    setSelectedGrades(prev => 
      prev.includes(grade) 
        ? prev.filter(g => g !== grade)
        : [...prev, grade]
    );
  };

  const handleClassToggle = (cls: string) => {
    setSelectedClasses(prev => 
      prev.includes(cls) 
        ? prev.filter(c => c !== cls)
        : [...prev, cls]
    );
  };

  const handleFileUpload = (type: 'image' | 'file') => {
    if (type === 'image') {
      imageInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const files = Array.from(e.target.files || []);
    if (type === 'image') {
      setImages(prev => [...prev, ...files]);
    } else {
      setAttachments(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number, type: 'image' | 'file') => {
    if (type === 'image') {
      setImages(prev => prev.filter((_, i) => i !== index));
    } else {
      setAttachments(prev => prev.filter((_, i) => i !== index));
    }
  };

  const insertFormatting = (format: 'bold' | 'list' | 'link') => {
    const textarea = document.getElementById('content') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content;
    const selectedText = text.substring(start, end);

    let newText = '';
    let cursorOffset = 0;

    switch (format) {
      case 'bold':
        newText = `**${selectedText}**`;
        cursorOffset = 2;
        break;
      case 'list':
        newText = `\n- ${selectedText}`;
        cursorOffset = 3;
        break;
      case 'link':
        newText = `[${selectedText}](url)`;
        cursorOffset = 1;
        break;
    }

    const newContent = text.substring(0, start) + newText + text.substring(end);
    setFormData({ ...formData, content: newContent });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 1. Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="w-6 h-6 bg-[#e35336]/10 rounded-full flex items-center justify-center text-xs text-[#e35336]">1</span>
          Basic Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-8">
          {/* Title */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
            <Input
              id="title"
              placeholder="Enter announcement title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="border-[#E2E8F0] focus:border-[#e35336] focus:ring-[#e35336]/20"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Announcement Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="border-[#E2E8F0]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority Level</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: "HIGH" | "MEDIUM" | "LOW") => 
                setFormData({ ...formData, priority: value })
              }
            >
              <SelectTrigger className="border-[#E2E8F0]">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      {p.id === "HIGH" && <AlertTriangle className={`w-4 h-4 text-${p.color}-500`} />}
                      {p.id === "MEDIUM" && <CheckCircle2 className={`w-4 h-4 text-${p.color}-500`} />}
                      {p.id === "LOW" && <CheckCircle2 className={`w-4 h-4 text-${p.color}-500`} />}
                      <span>{p.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 2. Audience Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="w-6 h-6 bg-[#e35336]/10 rounded-full flex items-center justify-center text-xs text-[#e35336]">2</span>
          Audience Selection
        </h3>

        <div className="space-y-4 pl-8">
          {/* School-wide Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-[#E2E8F0]">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-[#e35336]" />
              <div>
                <p className="font-medium text-gray-900">School-wide</p>
                <p className="text-sm text-gray-500">Make this announcement visible to everyone</p>
              </div>
            </div>
            <Switch
              checked={schoolWide}
              onCheckedChange={setSchoolWide}
            />
          </div>

          {!schoolWide && (
            <>
              {/* Select Grades */}
              <div className="space-y-2">
                <Label>Select Grades</Label>
                <div className="flex flex-wrap gap-2">
                  {GRADES.map((grade) => (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => handleGradeToggle(grade)}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                        selectedGrades.includes(grade)
                          ? "bg-[#e35336] text-white border-[#e35336]"
                          : "bg-white text-gray-700 border-[#E2E8F0] hover:border-[#e35336]"
                      }`}
                    >
                      {grade}
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Classes */}
              <div className="space-y-2">
                <Label>Select Classes</Label>
                <div className="flex flex-wrap gap-2">
                  {CLASSES.map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => handleClassToggle(cls)}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                        selectedClasses.includes(cls)
                          ? "bg-[#e35336] text-white border-[#e35336]"
                          : "bg-white text-gray-700 border-[#E2E8F0] hover:border-[#e35336]"
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Roles */}
              <div className="space-y-2">
                <Label>Select Role</Label>
                <div className="flex flex-wrap gap-3">
                  {ROLES.map((role) => (
                    <label
                      key={role.id}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedRoles.includes(role.id)
                          ? "bg-[#e35336]/10 border-[#e35336] text-[#e35336]"
                          : "bg-white border-[#E2E8F0] text-gray-700 hover:border-[#e35336]"
                      }`}
                    >
                      <Checkbox
                        checked={selectedRoles.includes(role.id)}
                        onCheckedChange={() => handleRoleToggle(role.id)}
                      />
                      <span className="text-sm font-medium">{role.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. Content */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="w-6 h-6 bg-[#e35336]/10 rounded-full flex items-center justify-center text-xs text-[#e35336]">3</span>
          Content
        </h3>

        <div className="space-y-4 pl-8">
          {/* Rich Text Editor Toolbar */}
          <div className="space-y-2">
            <Label>Content <span className="text-red-500">*</span></Label>
            <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => insertFormatting('bold')}
                  className="p-2 hover:bg-gray-200 rounded transition-colors"
                  title="Bold"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('list')}
                  className="p-2 hover:bg-gray-200 rounded transition-colors"
                  title="Bullet List"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('link')}
                  className="p-2 hover:bg-gray-200 rounded transition-colors"
                  title="Insert Link"
                >
                  <LinkIcon className="w-4 h-4" />
                </button>
              </div>
              <Textarea
                id="content"
                placeholder="Enter announcement content..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={8}
                className="border-0 focus:ring-0 resize-none"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Image Upload</Label>
            <input
              type="file"
              ref={imageInputRef}
              onChange={(e) => handleFileChange(e, 'image')}
              accept="image/*"
              multiple
              className="hidden"
            />
            <div 
              onClick={() => handleFileUpload('image')}
              className="border-2 border-dashed border-[#E2E8F0] rounded-lg p-6 text-center cursor-pointer hover:border-[#e35336] transition-colors"
            >
              <ImageIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Click to upload images</p>
              <p className="text-xs text-gray-400">PNG, JPG, GIF up to 10MB</p>
            </div>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {images.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-[#E2E8F0]">
                    <ImageIcon className="w-4 h-4 text-[#e35336]" />
                    <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(index, 'image')}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* File Attachment */}
          <div className="space-y-2">
            <Label>File Attachment</Label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileChange(e, 'file')}
              multiple
              className="hidden"
            />
            <div 
              onClick={() => handleFileUpload('file')}
              className="border-2 border-dashed border-[#E2E8F0] rounded-lg p-6 text-center cursor-pointer hover:border-[#e35336] transition-colors"
            >
              <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Click to upload files</p>
              <p className="text-xs text-gray-400">PDF, DOC, XLS up to 25MB</p>
            </div>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-[#E2E8F0]">
                    <FileText className="w-4 h-4 text-[#e35336]" />
                    <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(index, 'file')}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Schedule */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="w-6 h-6 bg-[#e35336]/10 rounded-full flex items-center justify-center text-xs text-[#e35336]">4</span>
          Schedule
        </h3>

        <div className="space-y-4 pl-8">
          {/* Post Immediately Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-[#E2E8F0]">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[#e35336]" />
              <div>
                <p className="font-medium text-gray-900">Post Immediately</p>
                <p className="text-sm text-gray-500">Publish this announcement right away</p>
              </div>
            </div>
            <Switch
              checked={postImmediately}
              onCheckedChange={setPostImmediately}
            />
          </div>

          {/* Schedule Date & Time */}
          {!postImmediately && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Schedule Date & Time</Label>
                <CalendarDatePicker
                  value={scheduleDateValue}
                  onChange={setScheduleDateValue}
                  placeholder="Select schedule date"
                  className="border-[#E2E8F0]"
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="pl-10 border-[#E2E8F0]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Expiration Date */}
          <div className="space-y-2">
            <Label>Expiration Date (Optional)</Label>
            <CalendarDatePicker
              value={endDateValue}
              onChange={setEndDateValue}
              placeholder="Select expiration date"
              className="border-[#E2E8F0]"
            />
          </div>
        </div>
      </div>

      {/* 5. Read Tracking */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="w-6 h-6 bg-[#e35336]/10 rounded-full flex items-center justify-center text-xs text-[#e35336]">5</span>
          Read Tracking
        </h3>

        <div className="space-y-4 pl-8">
          {/* Require Acknowledgment */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-[#E2E8F0]">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#e35336]" />
              <div>
                <p className="font-medium text-gray-900">Require Acknowledgment</p>
                <p className="text-sm text-gray-500">Recipients must mark as read</p>
              </div>
            </div>
            <Switch
              checked={requireAcknowledgment}
              onCheckedChange={setRequireAcknowledgment}
            />
          </div>

          {/* Allow Comments */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-[#E2E8F0]">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-[#e35336]" />
              <div>
                <p className="font-medium text-gray-900">Allow Comments</p>
                <p className="text-sm text-gray-500">Allow recipients to comment on this announcement</p>
              </div>
            </div>
            <Switch
              checked={allowComments}
              onCheckedChange={setAllowComments}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t border-[#E2E8F0]">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="border-[#E2E8F0] text-gray-700">
            Cancel
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={createMutation.isPending}
          className="bg-[#e35336] hover:bg-[#e35336]/90 text-white min-w-[180px]"
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Publish Announcement
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default CreateAnnouncementForm;
