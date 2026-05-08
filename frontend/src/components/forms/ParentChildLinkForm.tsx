"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Link, Unlink, Plus, Trash2, User, Users } from "lucide-react";
import { studentsAPI } from "@/lib/api";
import { parentsAPI } from "@/lib/api/people";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Schema for linking
const linkSchema = z.object({
  parentProfileId: z.string().min(1, "Parent is required"),
  studentProfileId: z.string().min(1, "Student is required"),
  relation: z.string().min(1, "Relation is required"),
  isPrimary: z.boolean().default(false),
  emergencyContact: z.boolean().default(false),
});

type LinkFormData = z.infer<typeof linkSchema>;

interface Parent {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  children?: {
    id: string;
    studentId: string;
    studentName: string;
    studentCode: string;
    relation: string;
    isPrimary: boolean;
    emergencyContact: boolean;
  }[];
}

interface Student {
  id: string;
  userId: string;
  user?: {
    name?: string;
    email?: string;
  };
  // Backward-compatible fields (some endpoints flatten `user`)
  name?: string;
  email?: string;
  studentCode?: string;
  rollNumber?: string;
  gender?: string;
}

interface ParentChildLinkFormProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "link" | "manage";
  parentData?: Parent;
  studentData?: Student;
  onSuccess?: () => void;
}

const RELATIONS = [
  { value: "FATHER", label: "Father" },
  { value: "MOTHER", label: "Mother" },
  { value: "GUARDIAN", label: "Guardian" },
  { value: "UNCLE", label: "Uncle" },
  { value: "AUNT", label: "Aunt" },
  { value: "GRANDFATHER", label: "Grandfather" },
  { value: "GRANDMOTHER", label: "Grandmother" },
  { value: "OTHER", label: "Other" },
];

const ParentChildLinkForm = ({
  isOpen,
  onClose,
  mode,
  parentData,
  studentData,
  onSuccess,
}: ParentChildLinkFormProps) => {
  const [selectedParentId, setSelectedParentId] = useState(parentData?.id || "");
  const [selectedStudentId, setSelectedStudentId] = useState(studentData?.id || "");
  const [selectedRelation, setSelectedRelation] = useState("FATHER");
  const [isPrimary, setIsPrimary] = useState(false);
  const [emergencyContact, setEmergencyContact] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const queryClient = useQueryClient();

  // Fetch parents
  const { data: parents, isLoading: loadingParents } = useQuery({
    queryKey: ["parents"],
    queryFn: async () => {
      const response = await parentsAPI.getAll({ limit: 100 });
      return response.data?.data || response.data || [];
    },
    enabled: isOpen && mode === "link" && !parentData,
  });

  // Fetch students
  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ["students", "approved", studentSearch],
    queryFn: async () => {
      const response = await studentsAPI.getAll({
        status: "APPROVED",
        limit: "25",
        search: studentSearch.trim() || undefined,
      });
      return response.data?.data || response.data || [];
    },
    enabled: isOpen && mode === "link" && !studentData,
  });

  // Get linked children for manage mode
  const linkedChildren = parentData?.children || [];
  const linkedStudentIds = new Set(linkedChildren.map((child) => child.studentId));
  const availableStudents = Array.isArray(students)
    ? students.filter((student: Student) => !linkedStudentIds.has(student.id))
    : [];

  useEffect(() => {
    if (!isOpen) return;
    setStudentSearch("");
    // Keep selection when opening for a specific student.
    if (!studentData) setSelectedStudentId("");
    if (parentData?.id) setSelectedParentId(parentData.id);
  }, [isOpen, parentData?.id, studentData]);

  // Link mutation
  const linkMutation = useMutation({
    mutationFn: async (data: LinkFormData) => {
      return parentsAPI.linkToStudent(data);
    },
    onSuccess: () => {
      toast.success("Parent linked to student successfully");
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to link parent to student");
    },
  });

  // Unlink mutation
  const unlinkMutation = useMutation({
    mutationFn: async ({ parentId, studentId }: { parentId: string; studentId: string }) => {
      return parentsAPI.unlinkFromStudent(parentId, studentId);
    },
    onSuccess: () => {
      toast.success("Parent unlinked from student successfully");
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to unlink parent from student");
    },
  });

  const handleLink = async () => {
    if (!selectedParentId || !selectedStudentId) {
      toast.error("Please select both parent and student");
      return;
    }

    setSaving(true);
    try {
      await linkMutation.mutateAsync({
        parentProfileId: selectedParentId,
        studentProfileId: selectedStudentId,
        relation: selectedRelation,
        isPrimary,
        emergencyContact,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async (studentId: string) => {
    if (confirm("Are you sure you want to unlink this student from the parent?")) {
      await unlinkMutation.mutateAsync({
        parentId: parentData?.id || selectedParentId,
        studentId,
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "link" ? "Link Parent to Student" : "Manage Parent-Child Links"}
          </DialogTitle>
          <DialogDescription>
            {mode === "link"
              ? "Create a relationship between a parent and a student"
              : `Manage children linked to ${parentData?.name}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {mode === "link" ? (
            <>
              {/* Parent Selection */}
              {!parentData && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Parent</label>
                  <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a parent" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingParents ? (
                        <SelectItem value="loading" disabled>
                          Loading...
                        </SelectItem>
                      ) : (
                        parents?.map((parent: Parent) => (
                          <SelectItem key={parent.id} value={parent.id}>
                            <div className="flex items-center gap-2">
                              <span>{parent.name}</span>
                              <span className="text-gray-500">({parent.email})</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Student Selection */}
              {!studentData && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Student</label>
                  <Input
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search by name or student code..."
                  />
                  <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingStudents ? (
                        <SelectItem value="loading" disabled>
                          Loading...
                        </SelectItem>
                      ) : availableStudents.length === 0 ? (
                        <SelectItem value="no-results" disabled>
                          {studentSearch.trim()
                            ? "No matching students found"
                            : linkedChildren.length > 0
                              ? "All students are already linked"
                              : "No students found"}
                        </SelectItem>
                      ) : (
                        availableStudents.map((student: Student) => {
                          const displayName = student.user?.name || student.name || "Unknown";
                          return (
                          <SelectItem key={student.id} value={student.id}>
                            <div className="flex items-center gap-2">
                              <span>{displayName}</span>
                              {student.studentCode && (
                                <span className="text-gray-500">({student.studentCode})</span>
                              )}
                            </div>
                          </SelectItem>
                        );
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Relation Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Relation</label>
                <Select value={selectedRelation} onValueChange={setSelectedRelation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select relation" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONS.map((rel) => (
                      <SelectItem key={rel.value} value={rel.value}>
                        {rel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Options */}
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm">Set as primary contact</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm">Emergency contact</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleLink} disabled={saving || linkMutation.isPending}>
                  {saving || linkMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Linking...
                    </>
                  ) : (
                    <>
                      <Link className="w-4 h-4 mr-2" />
                      Link
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Manage Mode - Show linked children */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Linked Children</h3>
                  <Button
                    size="sm"
                    onClick={() => {
                      // Switch to link mode for adding new child
                      // This could open another modal or change the mode
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Child
                  </Button>
                </div>

                {linkedChildren.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Relation</TableHead>
                          <TableHead>Primary</TableHead>
                          <TableHead>Emergency</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {linkedChildren.map((child) => (
                          <TableRow key={child.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback>
                                    {getInitials(child.studentName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{child.studentName}</p>
                                  <p className="text-xs text-gray-500">{child.studentCode}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{child.relation}</Badge>
                            </TableCell>
                            <TableCell>
                              {child.isPrimary ? (
                                <Badge className="bg-green-100 text-green-700">Yes</Badge>
                              ) : (
                                <span className="text-gray-400">No</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {child.emergencyContact ? (
                                <Badge className="bg-red-100 text-red-700">Yes</Badge>
                              ) : (
                                <span className="text-gray-400">No</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleUnlink(child.studentId)}
                                disabled={unlinkMutation.isPending}
                              >
                                <Unlink className="w-4 h-4 mr-1" />
                                Unlink
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No children linked to this parent</p>
                    <Button className="mt-4" size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Link a Child
                    </Button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ParentChildLinkForm;
