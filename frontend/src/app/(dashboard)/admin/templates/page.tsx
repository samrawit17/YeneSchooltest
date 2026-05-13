"use client";

import { useEffect, useState } from "react";
import { templatesAPI, type TemplateRecord, type TemplateType } from "@/lib/api/templates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, CheckCircle } from "lucide-react";

export default function TemplatesManagerPage() {
  const [type, setType] = useState<TemplateType>("ID_CARD");
  const [items, setItems] = useState<TemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const resp = await templatesAPI.list(type);
      setItems(resp.data || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [type]);

  const upload = async () => {
    if (!file) return toast.error("Select a template file");
    setUploading(true);
    try {
      await templatesAPI.upload({
        type,
        name: name.trim() || `${type === "ID_CARD" ? "ID Card" : "Certificate"} Template`,
        file,
      });
      setName("");
      setFile(null);
      toast.success("Template uploaded");
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const activate = async (id: string) => {
    try {
      await templatesAPI.activate(id);
      toast.success("Template set active");
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to activate template");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Template Manager</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Upload and activate imported templates.</p>
      </div>

      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardHeader>
          <CardTitle>Upload Template</CardTitle>
          <CardDescription>PDF or image template to use for generation.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Type</Label>
            <select
              className="w-full h-10 rounded-md border px-3 bg-white dark:bg-slate-800"
              value={type}
              onChange={(e) => setType(e.target.value as TemplateType)}
            >
              <option value="ID_CARD">ID Card</option>
              <option value="CERTIFICATE">Certificate</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs text-gray-500 mb-1 block">Template Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">File</Label>
            <Input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <div className="md:col-span-4 flex justify-end">
            <Button className="bg-[var(--brand-color,#e35336)] hover:opacity-90 text-white" onClick={upload} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload Template
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardHeader>
          <CardTitle>{type === "ID_CARD" ? "ID Card Templates" : "Certificate Templates"}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500">No templates yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((t) => (
                <div key={t.id} className="border rounded-lg p-3 dark:border-slate-700">
                  <div className="aspect-[1.586/1] rounded border overflow-hidden bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.backgroundUrl} alt={t.name} className="w-full h-full object-contain" />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate dark:text-white">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.isActive ? "Active" : "Inactive"}</p>
                    </div>
                    <Button size="sm" variant={t.isActive ? "outline" : "default"} onClick={() => activate(t.id)} disabled={t.isActive}>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      {t.isActive ? "Active" : "Set Active"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
