"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Dialog as DialogPrimitive } from "radix-ui";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, Download, Info } from "lucide-react";
import { FILE_CATEGORIES } from "@/lib/file-constants";
import type { FileCategory } from "@/lib/file-constants";
import type { FileItem } from "@/components/file-gallery";
import { formatDate } from "@/lib/format";

export function FileLightbox({
  files,
  initialIndex,
  onClose,
}: {
  files: FileItem[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showInfo, setShowInfo] = useState(false);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const file = files[index];
  const isImg = file?.fileType && ["jpg", "jpeg", "png", "gif", "webp"].includes(file.fileType.toLowerCase());
  const isPdf = file?.fileType === "pdf";
  const cat = FILE_CATEGORIES[(file?.category as FileCategory) || "OTHER"] || FILE_CATEGORIES.OTHER;

  const go = useCallback((dir: 1 | -1) => {
    setIndex((i) => {
      const next = i + dir;
      if (next < 0 || next >= files.length) return i;
      return next;
    });
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [files.length]);

  const zoomTo = useCallback((level: number) => {
    const clamped = Math.max(0.5, Math.min(5, level));
    setZoom(clamped);
    if (clamped <= 1) setPan({ x: 0, y: 0 });
  }, []);

  const fitZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          go(-1);
          break;
        case "ArrowRight":
          go(1);
          break;
        case "+":
        case "=":
          zoomTo(zoom + 0.5);
          break;
        case "-":
          zoomTo(zoom - 0.5);
          break;
        case "0":
          fitZoom();
          break;
        case "i":
          setShowInfo((s) => !s);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, go, zoomTo, fitZoom, zoom]);

  // Pan handlers for zoomed images
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (zoom <= 1 || !isImg) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
    panOffset.current = { ...pan };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [zoom, isImg, pan]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return;
    setPan({
      x: panOffset.current.x + (e.clientX - panStart.current.x),
      y: panOffset.current.y + (e.clientY - panStart.current.y),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  // Double-click to toggle fit/2x
  const onDoubleClick = useCallback(() => {
    if (!isImg) return;
    if (zoom === 1) {
      zoomTo(2);
    } else {
      fitZoom();
    }
  }, [isImg, zoom, zoomTo, fitZoom]);

  // Mouse wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (!isImg) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.25 : 0.25;
      zoomTo(zoom + delta);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [isImg, zoom, zoomTo]);

  if (!file) return null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPortal>
        <DialogOverlay className="bg-black/90" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col outline-none bg-black"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <VisuallyHidden>
            <DialogTitle>{file.fileName || "File preview"}</DialogTitle>
            <DialogDescription>Viewing file {index + 1} of {files.length}</DialogDescription>
          </VisuallyHidden>
          {/* Top toolbar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-black/60 text-white z-10 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${cat.color}`}>
                {cat.label}
              </span>
              <span className="text-sm truncate max-w-[300px]">
                {file.fileName || "Untitled"}
              </span>
              <span className="text-xs text-white/60">
                {index + 1} / {files.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isImg && (
                <>
                  <ToolbarButton onClick={() => zoomTo(zoom - 0.5)} title="Zoom out (−)">
                    <ZoomOut className="h-4 w-4" />
                  </ToolbarButton>
                  <span className="text-xs w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
                  <ToolbarButton onClick={() => zoomTo(zoom + 0.5)} title="Zoom in (+)">
                    <ZoomIn className="h-4 w-4" />
                  </ToolbarButton>
                  <ToolbarButton onClick={fitZoom} title="Fit to screen (0)">
                    <Maximize className="h-4 w-4" />
                  </ToolbarButton>
                  <div className="w-px h-5 bg-white/20 mx-1" />
                </>
              )}
              <ToolbarButton onClick={() => setShowInfo((s) => !s)} title="Info (i)">
                <Info className="h-4 w-4" />
              </ToolbarButton>
              <a
                href={file.filePath}
                download={file.fileName || undefined}
                className="p-2 rounded-md hover:bg-white/10 transition-colors"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </a>
              <ToolbarButton onClick={onClose} title="Close (Esc)">
                <X className="h-4 w-4" />
              </ToolbarButton>
            </div>
          </div>

          {/* Main content area */}
          <div
            ref={containerRef}
            className="flex-1 relative flex items-center justify-center overflow-hidden select-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onDoubleClick={onDoubleClick}
            style={{ cursor: isImg && zoom > 1 ? "grab" : "default" }}
          >
            {isImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={file.filePath}
                alt={file.fileName || ""}
                className="max-h-full max-w-full transition-transform duration-150"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                }}
                draggable={false}
              />
            ) : isPdf ? (
              <iframe
                src={`${file.filePath}#toolbar=1`}
                className="w-full h-full bg-white rounded"
                style={{ maxWidth: 900 }}
                title={file.fileName || "PDF"}
              />
            ) : (
              <div className="text-white text-center">
                <p className="text-lg mb-2">Preview not available</p>
                <a
                  href={file.filePath}
                  download
                  className="text-sm text-blue-400 hover:underline"
                >
                  Download file
                </a>
              </div>
            )}

            {/* Prev/Next arrows */}
            {files.length > 1 && (
              <>
                {index > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); go(-1); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                    title="Previous"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                )}
                {index < files.length - 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); go(1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                    title="Next"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                )}
              </>
            )}

            {/* Info panel */}
            {showInfo && (
              <div className="absolute bottom-4 left-4 bg-black/70 text-white rounded-lg p-4 max-w-xs text-sm space-y-1.5">
                <p className="font-medium">{file.fileName || "Untitled"}</p>
                {file.description && <p className="text-white/70">{file.description}</p>}
                <p className="text-white/60">
                  {formatDate(file.createdAt)}
                  {file.uploadedBy && ` · Dr. ${file.uploadedBy.name}`}
                </p>
                {file.visit && (
                  <p className="text-white/60">
                    Case #{file.visit.caseNo} — {file.visit.operation?.name || "Visit"}
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

function ToolbarButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-md hover:bg-white/10 transition-colors"
      title={title}
    >
      {children}
    </button>
  );
}
