"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

type FileItem = {
  id: number;
  filePath: string;
  fileName: string | null;
  description: string | null;
  fileType: string | null;
  createdAt: Date;
  uploadedBy: { name: string } | null;
  visit?: {
    id: number;
    operation?: { name: string } | null;
    caseNo?: number | null;
  } | null;
};

export function FileGallery({
  files,
  canDelete,
}: {
  files: FileItem[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/upload/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete file");
      }
    } catch {
      toast.error("Failed to delete file. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  if (files.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 border rounded-lg">
        No files uploaded yet
      </div>
    );
  }

  const isImage = (fileType: string | null) =>
    fileType && ["jpg", "jpeg", "png", "gif", "webp"].includes(fileType.toLowerCase());

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {files.map((file) => (
        <Card key={file.id} className="overflow-hidden group">
          <a
            href={file.filePath}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
              {isImage(file.fileType) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={file.filePath}
                  alt={file.fileName || "Patient file"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <FileText className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
          </a>
          <CardContent className="p-3 space-y-1">
            <p className="text-sm font-medium truncate">
              {file.fileName || "Untitled"}
            </p>
            {file.description && (
              <p className="text-xs text-muted-foreground truncate">
                {file.description}
              </p>
            )}
            {file.visit && (
              <p className="text-xs text-muted-foreground">
                Case #{file.visit.caseNo} — {file.visit.operation?.name || "Visit"}
              </p>
            )}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {format(new Date(file.createdAt), "MMM d, yyyy")}
                {file.uploadedBy && ` · Dr. ${file.uploadedBy.name}`}
              </p>
              {canDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.preventDefault()}
                      disabled={deleting === file.id}
                    >
                      {deleting === file.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3 text-destructive" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete file?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete &ldquo;{file.fileName || "this file"}&rdquo;. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(file.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
