"use client";

import { Download, ExternalLink, FileText } from "lucide-react";

import { resolveAssetUrl } from "@/lib/asset-url";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type StudentDocumentRecord = {
  id?: string;
  type?: string;
  title?: string;
  name?: string;
  status?: string;
  description?: string;
  uploadedAt?: string;
  submittedAt?: string;
  submitted?: boolean;
  fileUrl?: string;
  url?: string;
  mimeType?: string;
  category?: string;
};

type StudentDocumentViewerProps = {
  document: StudentDocumentRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const formatDate = (value?: string | null) => {
  if (!value) return "Not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not recorded";
  return parsed.toLocaleString();
};

const getDocumentTitle = (document: StudentDocumentRecord | null) =>
  document?.title || document?.name || "Student Document";

const getDocumentUrl = (document: StudentDocumentRecord | null) => {
  const rawUrl = document?.fileUrl || document?.url;
  return rawUrl ? resolveAssetUrl(rawUrl) || rawUrl : "";
};

const isImageDocument = (document: StudentDocumentRecord | null, url: string) =>
  Boolean(document?.mimeType?.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(url));

const isPdfDocument = (document: StudentDocumentRecord | null, url: string) =>
  Boolean(document?.mimeType === "application/pdf" || /\.pdf($|\?)/i.test(url));

export default function StudentDocumentViewer({
  document,
  open,
  onOpenChange,
}: StudentDocumentViewerProps) {
  const url = getDocumentUrl(document);
  const title = getDocumentTitle(document);
  const status = document?.status || (document?.submitted ? "SUBMITTED" : "PENDING");
  const uploadedAt = document?.uploadedAt || document?.submittedAt;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-500" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {document?.type || "Document"} · {formatDate(uploadedAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-800 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
              <Badge className="mt-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                {status}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Category</p>
              <p className="mt-1 font-medium text-slate-900 dark:text-white">
                {document?.category || "Student registration"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Submitted</p>
              <p className="mt-1 font-medium text-slate-900 dark:text-white">{formatDate(uploadedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Type</p>
              <p className="mt-1 font-medium text-slate-900 dark:text-white">{document?.type || "N/A"}</p>
            </div>
          </div>

          {document?.description ? (
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">Note</p>
              <p className="mt-1 text-sm text-slate-800 dark:text-slate-200">{document.description}</p>
            </div>
          ) : null}

          {url ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={url} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1.5 h-4 w-4" />
                    Open
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={url} download>
                    <Download className="mr-1.5 h-4 w-4" />
                    Download
                  </a>
                </Button>
              </div>

              {isImageDocument(document, url) ? (
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                  <img src={url} alt={title} className="max-h-[60vh] w-full object-contain" />
                </div>
              ) : isPdfDocument(document, url) ? (
                <iframe
                  title={title}
                  src={url}
                  className="h-[60vh] w-full rounded-lg border border-slate-200 dark:border-slate-800"
                />
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  Preview is not available for this file type. Open or download the file.
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
              <FileText className="mx-auto mb-2 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                Physical document recorded
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                No digital file has been uploaded for this document.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
