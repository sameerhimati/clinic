"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Loader2 } from "lucide-react";
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE, FILE_TYPE_ERROR, FILE_SIZE_ERROR, FILE_CATEGORIES, detectCategory } from "@/lib/file-constants";
import type { FileCategory } from "@/lib/file-constants";

export function FileUpload({
  patientId,
  visitId,
}: {
  patientId: number;
  visitId?: number;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<FileCategory>("OTHER");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((f: File) => {
    setError(null);
    if (!(ALLOWED_FILE_TYPES as readonly string[]).includes(f.type)) {
      setError(FILE_TYPE_ERROR);
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError(FILE_SIZE_ERROR);
      return;
    }
    setFile(f);
    setCategory(detectCategory(f.name));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files?.[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("patientId", String(patientId));
    formData.append("category", category);
    if (visitId) formData.append("visitId", String(visitId));
    if (description.trim()) formData.append("description", description.trim());

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      setFile(null);
      setDescription("");
      setCategory("OTHER");
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {file ? (
            <span className="font-medium text-foreground">{file.name}</span>
          ) : (
            <>Drop files here or click to browse</>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          JPG, PNG, PDF — Max 10MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
          onChange={(e) => {
            if (e.target.files?.[0]) handleFile(e.target.files[0]);
          }}
        />
      </div>

      {file && (
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <label className="text-sm text-muted-foreground shrink-0">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FileCategory)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {Object.entries(FILE_CATEGORIES).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Upload
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setFile(null);
                setDescription("");
                setCategory("OTHER");
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
