"use client";

import { ChangeEvent, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authAPI } from "@/lib/api/auth";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

interface UserAvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  onUploaded?: (avatarUrl: string) => void;
}

export default function UserAvatarUpload({
  userId,
  currentAvatarUrl,
  onUploaded,
}: UserAvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!ACCEPTED_AVATAR_TYPES.has(file.type)) {
      toast.error("Photo must be JPG, PNG, or WEBP");
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Photo must be 2MB or smaller");
      return;
    }

    setIsUploading(true);
    try {
      const response = await authAPI.uploadAvatar(userId, file);
      const avatarUrl = response.data?.avatarUrl;
      if (avatarUrl) {
        onUploaded?.(avatarUrl);
      }
      toast.success("Photo updated");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading || !userId}
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
        ) : (
          <Camera className="w-4 h-4 mr-1.5" />
        )}
        {currentAvatarUrl ? "Change Photo" : "Upload Photo"}
      </Button>
    </>
  );
}
