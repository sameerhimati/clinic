"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Upload, FolderUp, Search, Loader2, CheckCircle2, XCircle, User } from "lucide-react";
import { FILE_CATEGORIES, ALLOWED_FILE_TYPES, MAX_FILE_SIZE, detectCategory } from "@/lib/file-constants";
import type { FileCategory } from "@/lib/file-constants";

type Patient = {
  id: number;
  code: number;
  name: string;
  mobile: string | null;
};

type QueueItem = {
  id: string;
  file: File;
  category: FileCategory;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

export function BulkUploadClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [batchCategory, setBatchCategory] = useState<FileCategory | "">("");
  const [batchDescription, setBatchDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const searchPatients = useCallback(async (q: string) => {
    if (q.length < 1) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/patients/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.patients || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const onSearchChange = (val: string) => {
    setQuery(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchPatients(val), 250);
  };

  const selectPatient = (p: Patient) => {
    setPatient(p);
    setQuery("");
    setResults([]);
  };

  const addFiles = (fileList: FileList) => {
    const newItems: QueueItem[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      if (!(ALLOWED_FILE_TYPES as readonly string[]).includes(f.type)) continue;
      if (f.size > MAX_FILE_SIZE) continue;
      newItems.push({
        id: `${Date.now()}-${i}-${f.name}`,
        file: f,
        category: batchCategory || detectCategory(f.name),
        status: "pending",
      });
    }
    setQueue((prev) => [...prev, ...newItems]);
  };

  const removeItem = (id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  };

  const updateItemCategory = (id: string, cat: FileCategory) => {
    setQueue((prev) => prev.map((q) => q.id === id ? { ...q, category: cat } : q));
  };

  const applyBatchCategory = () => {
    if (!batchCategory) return;
    setQueue((prev) => prev.map((q) => q.status === "pending" ? { ...q, category: batchCategory } : q));
  };

  const startUpload = async () => {
    if (!patient || queue.length === 0) return;
    setUploading(true);
    setDoneCount(0);

    const pendingItems = queue.filter((q) => q.status === "pending");
    let completed = 0;

    for (const item of pendingItems) {
      setQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, status: "uploading" } : q));

      const formData = new FormData();
      formData.append("file", item.file);
      formData.append("patientId", String(patient.id));
      formData.append("category", item.category);
      if (batchDescription.trim()) formData.append("description", batchDescription.trim());

      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (res.ok) {
          setQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, status: "done" } : q));
          completed++;
        } else {
          const data = await res.json().catch(() => ({}));
          setQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, status: "error", error: data.error || "Upload failed" } : q));
        }
      } catch {
        setQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, status: "error", error: "Network error" } : q));
      }
      setDoneCount(++completed);
    }

    setUploading(false);
  };

  const pendingCount = queue.filter((q) => q.status === "pending").length;
  const errorCount = queue.filter((q) => q.status === "error").length;
  const successCount = queue.filter((q) => q.status === "done").length;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-2xl font-bold">Bulk Upload</h2>
      </div>
      <p className="text-sm text-muted-foreground -mt-3">
        Import historical X-rays, scanned records, and photos for a patient.
      </p>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Left: Patient selection */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select Patient</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {patient ? (
                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{patient.name}</p>
                      <p className="text-xs text-muted-foreground">#{patient.code}{patient.mobile && ` · ${patient.mobile}`}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setPatient(null); setQueue([]); }}>
                    Change
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, code, or phone"
                    value={query}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-8"
                  />
                  {searching && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                  {results.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {results.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => selectPatient(p)}
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between"
                        >
                          <span className="font-medium">{p.name}</span>
                          <span className="text-muted-foreground">#{p.code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Batch settings */}
          {patient && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Batch Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Category override</label>
                  <div className="flex gap-2">
                    <select
                      value={batchCategory}
                      onChange={(e) => setBatchCategory(e.target.value as FileCategory | "")}
                      className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Auto-detect</option>
                      {Object.entries(FILE_CATEGORIES).map(([key, { label }]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    {batchCategory && queue.length > 0 && (
                      <Button variant="outline" size="sm" onClick={applyBatchCategory}>
                        Apply
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Description (all files)</label>
                  <Input
                    placeholder="e.g. Scanned from paper records"
                    value={batchDescription}
                    onChange={(e) => setBatchDescription(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: File drop zone + queue */}
        <div className="space-y-4">
          {patient && (
            <>
              {/* Drop zone */}
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer hover:border-primary/50 hover:bg-primary/5"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }}
              >
                <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">Drop files here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG, PDF — Max 10MB each</p>
                <div className="flex justify-center gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                    <Upload className="h-3.5 w-3.5 mr-1.5" /> Files
                  </Button>
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}>
                    <FolderUp className="h-3.5 w-3.5 mr-1.5" /> Folder
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
                  onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }}
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
                  // @ts-expect-error webkitdirectory not in types
                  webkitdirectory=""
                  onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }}
                />
              </div>

              {/* File queue */}
              {queue.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        Files ({queue.length})
                      </CardTitle>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {successCount > 0 && <span className="text-green-600">{successCount} done</span>}
                        {errorCount > 0 && <span className="text-red-600">{errorCount} failed</span>}
                        {pendingCount > 0 && <span>{pendingCount} pending</span>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Progress bar during upload */}
                    {uploading && (
                      <div className="mb-3">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300 rounded-full"
                            style={{ width: `${(doneCount / queue.filter((q) => q.status !== "done" || q.status === "done").length) * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{doneCount} / {queue.length} uploaded</p>
                      </div>
                    )}

                    <div className="max-h-80 overflow-y-auto divide-y">
                      {queue.map((item) => {
                        const catMeta = FILE_CATEGORIES[item.category];
                        return (
                          <div key={item.id} className="flex items-center gap-3 py-2 text-sm">
                            {/* Status icon */}
                            <div className="shrink-0 w-5">
                              {item.status === "done" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                              {item.status === "error" && <XCircle className="h-4 w-4 text-red-500" />}
                              {item.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                              {item.status === "pending" && <div className="h-3 w-3 rounded-full border-2 border-muted-foreground/30 mx-0.5" />}
                            </div>
                            {/* Filename */}
                            <span className="truncate flex-1 min-w-0">{item.file.name}</span>
                            {/* Category */}
                            <select
                              value={item.category}
                              onChange={(e) => updateItemCategory(item.id, e.target.value as FileCategory)}
                              disabled={item.status !== "pending"}
                              className={`h-7 px-2 rounded text-xs font-medium border-0 ${catMeta.color}`}
                            >
                              {Object.entries(FILE_CATEGORIES).map(([key, { label }]) => (
                                <option key={key} value={key}>{label}</option>
                              ))}
                            </select>
                            {/* Size */}
                            <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
                              {formatSize(item.file.size)}
                            </span>
                            {/* Remove */}
                            {item.status === "pending" && (
                              <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-foreground text-xs shrink-0">
                                Remove
                              </button>
                            )}
                            {item.status === "error" && (
                              <span className="text-xs text-red-500 shrink-0">{item.error}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setQueue((prev) => prev.filter((q) => q.status !== "pending"))}
                        disabled={uploading || pendingCount === 0}
                      >
                        Clear pending
                      </Button>
                      <Button
                        onClick={startUpload}
                        disabled={uploading || pendingCount === 0}
                      >
                        {uploading ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
                        ) : (
                          <><Upload className="h-4 w-4 mr-2" /> Upload {pendingCount} file{pendingCount !== 1 ? "s" : ""}</>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!patient && (
            <div className="border rounded-lg p-12 text-center text-muted-foreground">
              <FolderUp className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Select a patient first</p>
              <p className="text-sm mt-1">Search and select a patient to start uploading files.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
