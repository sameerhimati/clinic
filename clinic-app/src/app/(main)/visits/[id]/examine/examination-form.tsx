"use client";

import { useState, useTransition, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { saveExamination, finalizeReport, unlockReport, addAddendum, getNextArrivedAppointment, createFollowUpAppointment } from "./actions";
import { createVisitAndExamine } from "@/app/(main)/visits/actions";
import { updateAppointmentStatus } from "@/app/(main)/appointments/actions";
import { toast } from "sonner";
import { Lock, Unlock, Clock, MessageSquarePlus, Printer, ChevronDown, ChevronUp, FileText, AlertTriangle, ImageIcon, X, ZoomIn, Download, Pill, ClipboardList, Plus, CalendarDays, Trash2, Pencil, ChevronsUpDown, Check as CheckIcon } from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { canCreateTreatmentPlans } from "@/lib/permissions";
import { PrescriptionSheet } from "@/components/prescription-sheet";
import { ToothChart, type ToothStatusData } from "@/components/tooth-chart";
import { ToothDetailPanel, type ToothUpdate, type ToothFindingOption } from "@/components/tooth-detail-panel";
import { TOOTH_STATUSES, TOOTH_STATUS_INDICATORS, getStatusColor, type ToothStatusKey } from "@/lib/dental";
import { format } from "date-fns";
import { toTitleCase, formatDateTime } from "@/lib/format";
import { CheckCircle2, Circle, Square, SquareCheck } from "lucide-react";
import { ClinicalNotepad, type NoteEntry, type ChainOption } from "@/components/clinical-notepad";
import { InlinePlanSheet } from "@/components/inline-plan-sheet";
import { activateChain, cancelChain } from "@/app/(main)/patients/[id]/chain/actions";
import { deletePlanItem, renamePlanItem, deletePlan, cancelPlan } from "@/app/(main)/patients/[id]/plan/actions";

const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime24to12Short(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return m === 0 ? `${displayH}:00 ${period}` : `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
}

function formatDoctorAvailability(slots: { dayOfWeek: number; startTime: string; endTime: string }[]): string {
  if (slots.length === 0) return "";
  return slots
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map((s) => {
      const start = formatTime24to12Short(s.startTime).replace(/:00 /," ");
      const end = formatTime24to12Short(s.endTime).replace(/:00 /," ");
      return `${DAY_NAMES_SHORT[s.dayOfWeek]} ${start}–${end}`;
    })
    .join(", ");
}

type ExistingReport = {
  id: number;
  doctorId: number;
  doctorName: string;
  reportDate: string;
  complaint: string | null;
  examination: string | null;
  diagnosis: string | null;
  treatmentNotes: string | null;
  estimate: string | null;
  medication: string | null;
  teethSelected: string | null;
};

type Addendum = {
  id: number;
  content: string;
  createdAt: string;
  doctorName: string;
};

type PatientFileRef = {
  id: number;
  filePath: string;
  fileName: string | null;
  description: string | null;
  fileType: string | null;
  category: string | null;
  createdAt: string;
  visitCaseNo: number | null;
  visitOperation: string | null;
};

function PatientFilesPanel({
  files,
  collapsed,
  onToggle,
}: {
  files: PatientFileRef[];
  collapsed: boolean;
  onToggle: () => void;
}) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const isImage = (ft: string | null) =>
    ft && ["jpg", "jpeg", "png", "gif", "webp"].includes(ft.toLowerCase());

  const CATEGORY_LABELS: Record<string, string> = {
    XRAY: "X-Ray",
    SCAN: "Scan",
    PHOTO: "Photo",
  };

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Patient Files</span>
          <span className="text-xs text-muted-foreground">({files.length})</span>
        </div>
        {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
      </button>
      {!collapsed && (
        <CardContent className="pt-0 pb-3 px-3">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {files.map((file, idx) => (
              <button
                key={file.id}
                type="button"
                onClick={() => setLightboxIdx(idx)}
                className="group relative aspect-square rounded-md overflow-hidden border bg-muted hover:ring-2 hover:ring-primary/40 transition-all"
              >
                {isImage(file.fileType) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file.filePath}
                    alt={file.fileName || "Patient file"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                {/* Category badge */}
                <span className="absolute top-1 left-1 px-1 py-0.5 rounded text-[9px] font-medium bg-black/60 text-white">
                  {CATEGORY_LABELS[file.category || ""] || file.category}
                </span>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                </div>
              </button>
            ))}
          </div>
          {files.length > 8 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Showing {files.length} files
            </p>
          )}
        </CardContent>
      )}

      {/* Inline lightbox */}
      {lightboxIdx !== null && (
        <ExamFileLightbox
          files={files}
          initialIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </Card>
  );
}

function ExamFileLightbox({
  files,
  initialIndex,
  onClose,
}: {
  files: PatientFileRef[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const file = files[index];
  const isImg = file?.fileType && ["jpg", "jpeg", "png", "gif", "webp"].includes(file.fileType.toLowerCase());

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) setIndex(index - 1);
      if (e.key === "ArrowRight" && index < files.length - 1) setIndex(index + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, index, files.length]);

  if (!file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
        <span className="text-xs text-white/60 mr-2">{index + 1} / {files.length}</span>
        <a
          href={file.filePath}
          download={file.fileName || undefined}
          className="p-2 rounded-md hover:bg-white/10 text-white transition-colors"
          title="Download"
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="h-4 w-4" />
        </a>
        <button onClick={onClose} className="p-2 rounded-md hover:bg-white/10 text-white transition-colors" title="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      {/* File info */}
      <div className="absolute bottom-3 left-3 text-white/70 text-xs z-10" onClick={(e) => e.stopPropagation()}>
        {file.fileName && <span className="block">{file.fileName}</span>}
        {file.visitCaseNo && <span className="block">Case #{file.visitCaseNo}{file.visitOperation ? ` — ${file.visitOperation}` : ""}</span>}
      </div>
      {/* Navigation */}
      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setIndex(index - 1); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white z-10"
        >
          ‹
        </button>
      )}
      {index < files.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setIndex(index + 1); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white z-10"
        >
          ›
        </button>
      )}
      {/* Content */}
      <div onClick={(e) => e.stopPropagation()} className="max-w-[90vw] max-h-[85vh]">
        {isImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.filePath}
            alt={file.fileName || ""}
            className="max-w-full max-h-[85vh] object-contain"
          />
        ) : (
          <iframe
            src={`${file.filePath}#toolbar=1`}
            className="w-[80vw] h-[80vh] bg-white rounded"
            title={file.fileName || "PDF"}
          />
        )}
      </div>
    </div>
  );
}

/** Floating apply toolbar — appears when teeth are selected */
function ToothApplyBar({
  selected,
  onApply,
  onClear,
  onDetails,
  findings,
}: {
  selected: number[];
  onApply: (status: string, findingId?: number, findingName?: string) => void;
  onClear: () => void;
  onDetails: () => void;
  findings?: ToothFindingOption[];
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  if (selected.length === 0) return null;

  const statusOptions: { key: string; label: string; indicator: string; color: string }[] = [
    { key: "MISSING", label: "Missing", indicator: TOOTH_STATUS_INDICATORS.MISSING, color: getStatusColor("MISSING") },
    { key: "CARIES", label: "Caries", indicator: TOOTH_STATUS_INDICATORS.CARIES, color: getStatusColor("CARIES") },
    { key: "FILLED", label: "Filled", indicator: TOOTH_STATUS_INDICATORS.FILLED, color: getStatusColor("FILLED") },
    { key: "CROWNED", label: "Crown", indicator: TOOTH_STATUS_INDICATORS.CROWNED, color: getStatusColor("CROWNED") },
    { key: "RCT", label: "RCT", indicator: TOOTH_STATUS_INDICATORS.RCT, color: getStatusColor("RCT") },
    { key: "IMPLANT", label: "Implant", indicator: TOOTH_STATUS_INDICATORS.IMPLANT, color: getStatusColor("IMPLANT") },
    { key: "EXTRACTED", label: "Extracted", indicator: TOOTH_STATUS_INDICATORS.EXTRACTED, color: getStatusColor("EXTRACTED") },
    { key: "HEALTHY", label: "Healthy", indicator: "✓", color: getStatusColor("HEALTHY") },
  ];

  // Group findings by category
  const findingsByCategory = new Map<string, ToothFindingOption[]>();
  if (findings) {
    for (const f of findings) {
      const cat = f.category || "Other";
      if (!findingsByCategory.has(cat)) findingsByCategory.set(cat, []);
      findingsByCategory.get(cat)!.push(f);
    }
  }

  // Map finding names to a tooth status for auto-setting
  function inferStatusFromFinding(name: string): string {
    const n = name.toUpperCase();
    if (n.includes("CARIES")) return "CARIES";
    if (n.includes("MISSING")) return "MISSING";
    if (n.includes("FILLED") || n.includes("FILLING")) return "FILLED";
    if (n.includes("CROWN") || n.includes("VENEER") || n.includes("BRIDGE")) return "CROWNED";
    if (n.includes("RCT")) return "RCT";
    if (n.includes("IMPLANT")) return "IMPLANT";
    if (n.includes("EXTRACT") || n.includes("ROOT STUMP")) return "EXTRACTED";
    return "CARIES"; // default for clinical findings
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2 p-2.5 rounded-lg border border-primary/20 bg-primary/5">
      <span className="text-xs font-medium text-primary shrink-0">
        {selected.length} {selected.length === 1 ? "tooth" : "teeth"}:
      </span>
      <Popover open={pickerOpen} onOpenChange={setPickerOpen} modal={false}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-between gap-2 rounded-md border border-input bg-background px-3 h-8 text-sm font-medium w-[200px] hover:bg-accent cursor-pointer"
          >
            <span className="text-muted-foreground">Set status / finding...</span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start" disablePortal>
          <Command>
            <CommandInput placeholder="Search..." />
            <CommandList className="max-h-[300px] overscroll-contain">
              <CommandEmpty>No match.</CommandEmpty>
              <CommandGroup heading="Status">
                {statusOptions.map(({ key, label, indicator, color }) => (
                  <CommandItem
                    key={key}
                    value={`status ${label}`}
                    onSelect={() => {
                      onApply(key);
                      setPickerOpen(false);
                    }}
                  >
                    <span style={{ color }} className="text-sm font-bold w-5 text-center shrink-0">{indicator}</span>
                    <span className="ml-2">{label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              {Array.from(findingsByCategory.entries()).map(([cat, items]) => (
                <CommandGroup key={cat} heading={cat}>
                  {items.map((f) => (
                    <CommandItem
                      key={f.id}
                      value={`finding ${f.name} ${cat}`}
                      onSelect={() => {
                        const status = inferStatusFromFinding(f.name);
                        onApply(status, f.id, f.name);
                        setPickerOpen(false);
                      }}
                    >
                      {f.color && (
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: f.color }}
                        />
                      )}
                      <span className="ml-2">{f.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="flex-1" />
      <button
        type="button"
        onClick={onDetails}
        className="text-xs text-primary hover:underline cursor-pointer px-1"
      >
        Details...
      </button>
      <button
        type="button"
        onClick={onClear}
        className="text-xs text-muted-foreground hover:text-foreground cursor-pointer px-1"
      >
        Clear
      </button>
    </div>
  );
}

export function ExaminationForm({
  visitId,
  patientId,
  defaultDoctorId,
  defaultDoctorName,
  hasOperation,
  existingReport,
  isLocked,
  canUnlock,
  hoursUntilLock,
  reportId,
  addendums,
  lockedByName,
  lockedAt,
  permissionLevel,
  readOnly,
  operationName,
  isFollowUp,
  treatmentSteps,
  allDoctors,
  allOperations,
  activeChainsForProgress,
  existingActivePlans,
  doctorAvailability,
  patientDiseases,
  patientFiles,
  currentStepTemplate,
  clinicalNotes,
  notepadChains,
  toothStatuses: toothStatusesProp,
  toothFindings,
  toothHistory: toothHistoryProp,
}: {
  visitId: number;
  patientId?: number;
  defaultDoctorId: number | null;
  defaultDoctorName: string | null;
  hasOperation?: boolean;
  existingReport: ExistingReport | null;
  isLocked: boolean;
  canUnlock: boolean;
  hoursUntilLock: number;
  reportId: number | null;
  addendums: Addendum[];
  lockedByName: string | null;
  lockedAt: string | null;
  permissionLevel?: number;
  readOnly?: boolean;
  operationName?: string;
  isFollowUp?: boolean;
  treatmentSteps?: { name: string; defaultDayGap: number; description: string | null; noteTemplate?: string | null }[];
  currentStepTemplate?: string | null;
  allDoctors?: { id: number; name: string }[];
  allOperations?: { id: number; name: string; category: string | null; stepCount?: number; suggestsOperationId?: number | null; defaultMinFee?: number | null }[];
  doctorAvailability?: { doctorId: number; dayOfWeek: number; startTime: string; endTime: string }[];
  activeChainsForProgress?: {
    chainId: number;
    chainTitle: string;
    chainStatus: string;
    chainToothNumbers?: string | null;
    plans: {
      planId: number;
      planTitle: string;
      planStatus: string;
      items: { id: number; label: string; sortOrder: number; completedAt: string | null; visitId: number | null }[];
    }[];
  }[];
  existingActivePlans?: { id: number; title: string; nextItemLabel: string | null }[];
  patientDiseases?: string[];
  patientFiles?: PatientFileRef[];
  clinicalNotes?: NoteEntry[];
  notepadChains?: ChainOption[];
  toothStatuses?: { toothNumber: number; status: string; findingId?: number; findingName?: string; color?: string; notes?: string }[];
  toothFindings?: ToothFindingOption[];
  toothHistory?: { toothNumber: number; status: string; findingName?: string; date: string; doctorName: string; visitCaseNo?: number }[];
}) {
  const { doctor: currentDoctor } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Auto-set doctor: use existing report's doctor, then visit's doctor, then current user
  const doctorId = existingReport?.doctorId || defaultDoctorId || currentDoctor.id;
  const doctorName = existingReport?.doctorName || defaultDoctorName || toTitleCase(currentDoctor.name);

  // Auto-set report date: preserve existing, default to today for new (local time)
  const reportDate = existingReport?.reportDate || format(new Date(), "yyyy-MM-dd");

  const [examination, setExamination] = useState(existingReport?.examination || "");
  const [addendumText, setAddendumText] = useState("");
  const [teethSelected, setTeethSelected] = useState<number[]>(() => {
    try {
      return existingReport?.teethSelected ? JSON.parse(existingReport.teethSelected) : [];
    } catch { return []; }
  });

  // Treatment progress state (replaces Work Done)
  const [selectedProgressItemIds, setSelectedProgressItemIds] = useState<Set<number>>(new Set());

  // Prescription sheet state
  const [rxSheetOpen, setRxSheetOpen] = useState(false);

  // Inline plan sheet state
  const [planSheetOpen, setPlanSheetOpen] = useState(false);
  const [planSheetMode, setPlanSheetMode] = useState<"new-chain" | "add-to-chain">("new-chain");
  const [planSheetChainId, setPlanSheetChainId] = useState<number | undefined>();
  const [planSheetChainTitle, setPlanSheetChainTitle] = useState<string | undefined>();
  const [planSheetChainTeeth, setPlanSheetChainTeeth] = useState<string | null>(null);

  // Inline plan editing state
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingItemLabel, setEditingItemLabel] = useState("");

  // Follow-up scheduling state
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTimeSlot, setFollowUpTimeSlot] = useState("");
  const [followUpScheduled, setFollowUpScheduled] = useState(false);

  const [chartExpanded, setChartExpanded] = useState(false);

  // Tooth detail panel state
  const [toothUpdates, setToothUpdates] = useState<Map<number, ToothUpdate>>(new Map());
  const [detailTooth, setDetailTooth] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Build merged tooth status data: server data + local updates
  const mergedToothStatuses: ToothStatusData[] = (() => {
    const result = new Map<number, ToothStatusData>();
    // Start with server data
    if (toothStatusesProp) {
      for (const ts of toothStatusesProp) {
        result.set(ts.toothNumber, {
          toothNumber: ts.toothNumber,
          status: ts.status,
          findingName: ts.findingName,
          color: ts.color,
        });
      }
    }
    // Overlay local updates
    for (const [toothNum, update] of toothUpdates) {
      const finding = toothFindings?.find((f) => f.id === update.findingId);
      result.set(toothNum, {
        toothNumber: toothNum,
        status: update.status,
        findingName: finding?.name,
        color: finding?.color ?? undefined,
      });
    }
    return Array.from(result.values());
  })();

  function handleBatchApply(status: string, findingId?: number, findingName?: string) {
    const selectedTeeth = [...teethSelected];
    setToothUpdates((prev) => {
      const next = new Map(prev);
      for (const tooth of selectedTeeth) {
        if (status === "HEALTHY" && !findingId) {
          next.delete(tooth);
        } else {
          const existing = next.get(tooth);
          next.set(tooth, { toothNumber: tooth, status, findingId: findingId ?? existing?.findingId, notes: existing?.notes });
        }
      }
      return next;
    });
    // Auto-append tooth findings to dental chart notes (examination field), deduplicating
    if (status !== "HEALTHY" && selectedTeeth.length > 0) {
      const label = findingName || TOOTH_STATUSES[status as ToothStatusKey]?.label || status;
      setExamination((prev) => {
        const existingLines = new Set((prev || "").split("\n").map((l) => l.trim()).filter(Boolean));
        const newLines = selectedTeeth
          .map((t) => `${t} -- ${label}`)
          .filter((line) => !existingLines.has(line));
        if (newLines.length === 0) return prev;
        return prev ? `${prev}\n${newLines.join("\n")}` : newLines.join("\n");
      });
    }
    setTeethSelected([]);
  }

  function handleToothDoubleClick(tooth: number) {
    if (readOnly || isLocked) return;
    setDetailTooth(tooth);
    setDetailOpen(true);
  }

  function handleToothSave(update: ToothUpdate) {
    setToothUpdates((prev) => {
      const next = new Map(prev);
      next.set(update.toothNumber, update);
      return next;
    });
    // Also add to teethSelected for backward compat
    if (!teethSelected.includes(update.toothNumber)) {
      setTeethSelected((prev) => [...prev, update.toothNumber]);
    }
  }

  // Get current data for the detail panel
  function getToothCurrentData(tooth: number) {
    // Local update takes precedence
    const localUpdate = toothUpdates.get(tooth);
    if (localUpdate) {
      return { status: localUpdate.status, findingId: localUpdate.findingId, notes: localUpdate.notes };
    }
    // Fall back to server data
    const serverData = toothStatusesProp?.find((ts) => ts.toothNumber === tooth);
    if (serverData) {
      return { status: serverData.status, findingId: serverData.findingId, notes: serverData.notes };
    }
    return null;
  }

  function toggleProgressItem(itemId: number) {
    setSelectedProgressItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }

  function handleActivateChain(chainId: number) {
    startTransition(async () => {
      try {
        await activateChain(chainId);
        toast.success("Chain activated");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to activate chain");
      }
    });
  }

  function handleCancelChain(chainId: number) {
    startTransition(async () => {
      try {
        await cancelChain(chainId);
        toast.success("Chain cancelled");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to cancel chain");
      }
    });
  }

  function handleDeletePlanItem(itemId: number) {
    if (!confirm("Delete this step?")) return;
    startTransition(async () => {
      try {
        await deletePlanItem(itemId);
        setSelectedProgressItemIds((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
        toast.success("Step deleted");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete step");
      }
    });
  }

  function handleRenamePlanItem(itemId: number, newLabel: string) {
    if (!newLabel.trim()) return;
    startTransition(async () => {
      try {
        await renamePlanItem(itemId, newLabel);
        setEditingItemId(null);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to rename step");
      }
    });
  }

  function handleDeletePlan(planId: number) {
    if (!confirm("Delete this entire plan and all its steps?")) return;
    startTransition(async () => {
      try {
        await deletePlan(planId);
        toast.success("Plan deleted");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete plan");
      }
    });
  }

  function handleCancelPlan(planId: number) {
    const reason = prompt("Reason for cancelling this plan:");
    if (!reason) return;
    startTransition(async () => {
      try {
        await cancelPlan(planId, reason);
        toast.success("Plan cancelled");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to cancel plan");
      }
    });
  }

  function handleScheduleFollowUp() {
    if (!followUpDate) {
      toast.error("Select a date for the follow-up");
      return;
    }
    startTransition(async () => {
      try {
        await createFollowUpAppointment(visitId, {
          date: followUpDate,
          timeSlot: followUpTimeSlot || undefined,
        });
        toast.success("Follow-up scheduled");
        setFollowUpScheduled(true);
        setFollowUpDate("");
        setFollowUpTimeSlot("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to schedule follow-up");
      }
    });
  }

  // Autosave drafts to localStorage
  const draftKey = `exam-draft-${visitId}`;
  const [draftRestored, setDraftRestored] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check for existing draft on mount
  useEffect(() => {
    if (readOnly || isLocked) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw);
        // Only offer restore if draft has content and differs from saved
        const hasContent = draft.examination;
        const differsSaved = draft.examination !== (existingReport?.examination || "");
        if (hasContent && differsSaved) {
          setHasDraft(true);
        } else {
          localStorage.removeItem(draftKey);
        }
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.examination != null) setExamination(draft.examination);
      if (draft.teethSelected) {
        try { setTeethSelected(JSON.parse(draft.teethSelected)); } catch { /* ignore */ }
      }
      setDraftRestored(true);
      setHasDraft(false);
      toast.success("Draft restored");
    } catch { toast.error("Failed to restore draft"); }
  }

  function dismissDraft() {
    localStorage.removeItem(draftKey);
    setHasDraft(false);
  }

  function clearDraft() {
    localStorage.removeItem(draftKey);
  }

  // Track dirty state for beforeunload warning
  const savedRef = useRef({
    examination: existingReport?.examination || "",
    teethSelected: existingReport?.teethSelected || "[]",
  });

  const isDirty = useCallback(() => {
    const s = savedRef.current;
    return examination !== s.examination ||
      JSON.stringify(teethSelected) !== s.teethSelected ||
      selectedProgressItemIds.size > 0;
  }, [examination, teethSelected, selectedProgressItemIds]);

  // Debounced autosave to localStorage
  useEffect(() => {
    if (readOnly || isLocked) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      if (!isDirty()) return;
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          examination,
          teethSelected: JSON.stringify(teethSelected),
          savedAt: Date.now(),
        }));
      } catch { /* quota exceeded — ignore */ }
    }, 5000); // Save every 5s of idle
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [examination, teethSelected, readOnly, isLocked, isDirty, draftKey]);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty()) {
        e.preventDefault();
        // Save draft immediately on unload
        try {
          localStorage.setItem(draftKey, JSON.stringify({
            examination,
            teethSelected: JSON.stringify(teethSelected),
            savedAt: Date.now(),
          }));
        } catch { /* ignore */ }
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, draftKey, examination, teethSelected]);

  // Keyboard shortcuts: Cmd+S = Save, Cmd+Enter = Save & Next Patient
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  useEffect(() => {
    if (readOnly || isLocked) return;
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "s") {
        e.preventDefault();
        handleSaveRef.current("stay");
      } else if (mod && e.key === "Enter") {
        e.preventDefault();
        handleSaveRef.current("next");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [readOnly, isLocked]);

  const isDoctor = (permissionLevel ?? 0) >= 3;
  const hasFiles = patientFiles && patientFiles.length > 0;
  const [filesCollapsed, setFilesCollapsed] = useState(true);



  async function handleSave(redirectTarget: "detail" | "print" | "next" | "stay") {
    startTransition(async () => {
      try {
        clearDraft();
        const result = await saveExamination(visitId, {
          doctorId,
          reportDate,
          examination: examination || null,
          teethSelected: teethSelected.length > 0 ? JSON.stringify(teethSelected) : null,
          toothUpdates: toothUpdates.size > 0 ? Array.from(toothUpdates.values()) : undefined,
          progressItemIds: selectedProgressItemIds.size > 0 ? Array.from(selectedProgressItemIds) : undefined,
        });

        // Auto-finalize (lock) the report after save — only when leaving the page
        if (result?.reportId && redirectTarget !== "stay") {
          try {
            await finalizeReport(result.reportId);
          } catch {
            // Non-fatal — report saved but not locked
          }
        }

        // Progress completion toast
        if (result?.progressCompleted) {
          const { itemLabels, planCompleted, chainCompleted } = result.progressCompleted;
          const msg = chainCompleted
            ? `All treatment complete! Steps done: ${itemLabels.join(", ")}`
            : planCompleted
              ? `Plan completed! Steps done: ${itemLabels.join(", ")}`
              : `Progress updated: ${itemLabels.join(", ")}`;
          toast.success(msg, { duration: 6000 });
        }

        if (result?.appointmentAutoCompleted && result.completedAppointmentId) {
          const apptId = result.completedAppointmentId;
          toast.success("Appointment completed", {
            action: {
              label: "Undo",
              onClick: () => {
                updateAppointmentStatus(apptId, "IN_PROGRESS").catch(() => {
                  toast.error("Failed to undo");
                });
              },
            },
            duration: 8000,
          });
        } else if (!result?.progressCompleted) {
          toast.success("Examination saved");
        }
        if (redirectTarget === "stay") {
          toast.success("Saved");
          router.refresh();
          return;
        } else if (redirectTarget === "print") {
          router.push(`/visits/${visitId}/examine/print`);
        } else if (redirectTarget === "next") {
          // Find next arrived patient and go directly to their exam
          try {
            const nextAppt = await getNextArrivedAppointment(doctorId);
            if (nextAppt) {
              const result = await createVisitAndExamine(nextAppt.patientId, nextAppt.id);
              router.push(`/visits/${result.visitId}/examine`);
              return;
            } else {
              toast.info("No more patients waiting");
              router.push("/dashboard");
              return;
            }
          } catch {
            toast.error("Could not find next patient");
            router.push("/dashboard");
            return;
          }
        } else if (isDoctor && patientId) {
          router.push(`/patients/${patientId}`);
        } else {
          router.push(`/visits/${visitId}`);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save examination");
      }
    });
  }

  async function handleUnlock() {
    if (!reportId) return;
    startTransition(async () => {
      try {
        await unlockReport(reportId);
        toast.success("Notes unlocked for editing");
        router.refresh();
      } catch {
        toast.error("Failed to unlock notes");
      }
    });
  }

  async function handleAddAddendum() {
    if (!reportId || !addendumText.trim()) return;
    startTransition(async () => {
      try {
        await addAddendum(reportId, addendumText);
        toast.success("Note added");
        setAddendumText("");
        router.refresh();
      } catch {
        toast.error("Failed to add note");
      }
    });
  }

  // Read-only state for non-doctors viewing reports, or locked reports
  if ((readOnly || isLocked) && existingReport) {
    const readOnlyContent = (
      <div className="space-y-4">
        {isLocked && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                Notes locked
                {lockedAt && ` on ${formatDateTime(lockedAt)}`}
                {lockedByName && ` by Dr. ${lockedByName}`}
              </span>
            </div>
            {canUnlock && (
              <Button size="sm" variant="outline" onClick={handleUnlock} disabled={isPending}>
                <Unlock className="mr-1 h-3.5 w-3.5" />
                Unlock
              </Button>
            )}
          </div>
        </div>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Clinical Notes (Read-only)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="text-xs text-muted-foreground">
              By Dr. {existingReport.doctorName} {"\u00b7"} {existingReport.reportDate}
            </div>
            {existingReport.complaint && (
              <div><span className="text-muted-foreground font-medium">Complaint: </span><span className="whitespace-pre-wrap">{existingReport.complaint}</span></div>
            )}
            {existingReport.examination && (
              <div><span className="text-muted-foreground font-medium">Examination: </span><span className="whitespace-pre-wrap">{existingReport.examination}</span></div>
            )}
            {existingReport.diagnosis && (
              <div><span className="text-muted-foreground font-medium">Diagnosis: </span><span className="whitespace-pre-wrap">{existingReport.diagnosis}</span></div>
            )}
            {existingReport.treatmentNotes && (
              <div><span className="text-muted-foreground font-medium">Treatment: </span><span className="whitespace-pre-wrap">{existingReport.treatmentNotes}</span></div>
            )}
            {existingReport.estimate && (!permissionLevel || permissionLevel <= 2) && (
              <div><span className="text-muted-foreground font-medium">Estimate: </span><span className="whitespace-pre-wrap">{existingReport.estimate}</span></div>
            )}
            {existingReport.medication && (
              <div><span className="text-muted-foreground font-medium">Medication: </span><span className="whitespace-pre-wrap">{existingReport.medication}</span></div>
            )}
          </CardContent>
        </Card>

        {addendums.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Additional Notes ({addendums.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {addendums.map((a) => (
                <div key={a.id} className="rounded-md border p-3 text-sm">
                  <div className="whitespace-pre-wrap">{a.content}</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Dr. {a.doctorName} {"\u00b7"} {formatDateTime(a.createdAt)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {!readOnly && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquarePlus className="h-4 w-4" />
              Add Note
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Add a note to this locked report..."
              value={addendumText}
              onChange={(e) => setAddendumText(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleAddAddendum}
                disabled={isPending || !addendumText.trim()}
                size="sm"
              >
                {isPending ? "Adding..." : "Add Note"}
              </Button>
            </div>
          </CardContent>
        </Card>
        )}

        {hasFiles && (
          <PatientFilesPanel
            files={patientFiles!}
            collapsed={filesCollapsed}
            onToggle={() => setFilesCollapsed(!filesCollapsed)}
          />
        )}
      </div>
    );

    return readOnlyContent;
  }

  // Editable form — polished cards matching patient/visit form patterns
  const editableContent = (
    <div className="space-y-6 pb-24">
      {/* Medical alerts — patient safety */}
      {patientDiseases && patientDiseases.length > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <span className="text-sm font-semibold text-red-800">Medical Alert</span>
            <div className="flex flex-wrap gap-1.5 ml-1">
              {patientDiseases.map((d) => (
                <span key={d} className="inline-flex items-center rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-xs font-medium text-red-800">
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Draft restore banner */}
      {hasDraft && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <FileText className="h-4 w-4 shrink-0" />
              <span>You have an unsaved draft for this visit</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={dismissDraft}
                className="text-xs text-blue-600 hover:underline"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={restoreDraft}
                className="text-xs font-medium bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700 transition-colors"
              >
                Restore Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient files (X-rays, scans, photos) */}
      {hasFiles && (
        <PatientFilesPanel
          files={patientFiles!}
          collapsed={filesCollapsed}
          onToggle={() => setFilesCollapsed(!filesCollapsed)}
        />
      )}

      {/* Auto-lock warning */}
      {existingReport && hoursUntilLock > 0 && hoursUntilLock < 24 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              Locks automatically in {hoursUntilLock < 1
                ? `${Math.round(hoursUntilLock * 60)} minutes`
                : `${Math.round(hoursUntilLock)} ${Math.round(hoursUntilLock) === 1 ? "hour" : "hours"}`
              }
            </span>
          </div>
        </div>
      )}

      {/* Doctor / date info */}
      <span className="text-xs text-muted-foreground">
        Dr. {doctorName} {"\u00b7"} {reportDate}
      </span>

      {/* Clinical Notepad — patient-level running notes (moved up) */}
      {patientId && clinicalNotes && notepadChains && (
        <ClinicalNotepad
          patientId={patientId}
          notes={clinicalNotes}
          chains={notepadChains}
          canAddNotes={isDoctor && !readOnly && !isLocked}
          currentDoctorName={currentDoctor?.name}
          visitId={visitId}
        />
      )}

      {/* Dental Chart — collapsible, starts collapsed */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setChartExpanded((v) => !v)}>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Dental Chart {toothUpdates.size > 0 && <span className="text-xs font-normal text-muted-foreground ml-1">({toothUpdates.size} updated)</span>}</span>
            {chartExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        {chartExpanded && (
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Teeth</Label>
              <ToothChart
                selected={teethSelected}
                onChange={!readOnly && !isLocked ? setTeethSelected : undefined}
                toothStatuses={mergedToothStatuses}
                onDoubleClick={!readOnly && !isLocked ? handleToothDoubleClick : undefined}
                readOnly={readOnly || isLocked}
                size="sm"
              />
              {!readOnly && !isLocked && <ToothApplyBar selected={teethSelected} onApply={handleBatchApply} onClear={() => setTeethSelected([])} onDetails={() => { if (teethSelected.length > 0) { setDetailTooth(teethSelected[0]); setDetailOpen(true); } }} findings={toothFindings} />}
            </div>

            <div className="space-y-1.5">
              <Label>Chart Notes</Label>
              <Textarea
                placeholder="Dental chart annotations..."
                value={examination}
                onChange={(e) => setExamination(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Clinical Notes fields are now in the notepad above — complaint/diagnosis/treatment stored via clinical notepad */}

      {/* Active Treatments — merged chain progress + plan management */}
      {isDoctor && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Active Treatments
              {selectedProgressItemIds.size > 0 && (
                <span className="text-xs font-normal text-primary">
                  ({selectedProgressItemIds.size} step{selectedProgressItemIds.size !== 1 ? "s" : ""} selected)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {activeChainsForProgress && activeChainsForProgress.length > 0 ? (
              activeChainsForProgress.map((chain) => {
                const isDraft = chain.chainStatus === "DRAFT";
                const isRealChain = chain.chainId > 0;
                return (
                  <div key={chain.chainId} className={isDraft ? "rounded-lg border border-dashed border-amber-300 bg-amber-50/30 p-3" : ""}>
                    {/* Chain header */}
                    <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                      {chain.chainTitle}
                      {isDraft && (
                        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700">Draft</span>
                      )}
                      {chain.chainStatus === "COMPLETED" && (
                        <span className="text-xs font-normal text-green-600">Complete</span>
                      )}
                      {isRealChain && (chain.chainStatus === "ACTIVE" || isDraft) && canCreateTreatmentPlans(permissionLevel || 3) && (
                        <button
                          type="button"
                          onClick={() => {
                            setPlanSheetMode("add-to-chain");
                            setPlanSheetChainId(chain.chainId);
                            setPlanSheetChainTitle(chain.chainTitle);
                            setPlanSheetChainTeeth(chain.chainToothNumbers || null);
                            setPlanSheetOpen(true);
                          }}
                          className={isDraft ? "text-xs text-primary hover:underline" : "ml-auto text-xs text-primary hover:underline"}
                        >
                          + Add
                        </button>
                      )}
                      {isDraft && isRealChain && canCreateTreatmentPlans(permissionLevel || 3) && (
                        <div className="ml-auto flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleActivateChain(chain.chainId)}
                            className="text-xs text-green-700 hover:underline font-medium"
                          >
                            Activate
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelChain(chain.chainId)}
                            className="text-xs text-muted-foreground hover:text-destructive"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    {chain.plans.map((plan) => {
                      const isCompleted = plan.planStatus === "COMPLETED";
                      const isActive = plan.planStatus === "ACTIVE" && plan.items.some((i) => !i.completedAt);
                      const isEditing = editingPlanId === plan.planId;
                      const hasCompletedItems = plan.items.some((i) => !!i.completedAt);
                      const canEdit = canCreateTreatmentPlans(permissionLevel || 3) && !readOnly && !isLocked;

                      return (
                        <div key={plan.planId} className={`${chain.plans.length > 1 ? "ml-3 border-l-2 pl-3 pb-2" : ""} ${
                          isCompleted ? "border-l-green-300" : isActive ? "border-l-primary" : "border-l-muted"
                        }`}>
                          <div className="text-sm font-medium mb-1 flex items-center gap-2">
                            {plan.planTitle}
                            {isCompleted && (
                              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700">Done</span>
                            )}
                            {plan.planId > 0 && canEdit && !isCompleted && (
                              <div className="ml-auto flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingPlanId(isEditing ? null : plan.planId)}
                                  className={`text-xs hover:underline ${isEditing ? "text-primary font-medium" : "text-muted-foreground hover:text-primary"}`}
                                >
                                  {isEditing ? "Done" : "Edit"}
                                </button>
                                {!hasCompletedItems ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePlan(plan.planId)}
                                    className="text-muted-foreground hover:text-destructive p-0.5"
                                    title="Delete plan"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleCancelPlan(plan.planId)}
                                    className="text-xs text-muted-foreground hover:text-destructive"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="space-y-0.5">
                            {plan.items.map((item) => {
                              const itemCompleted = !!item.completedAt;
                              const isSelected = selectedProgressItemIds.has(item.id);
                              const isClickable = !itemCompleted && !readOnly && !isLocked;
                              const isRenamingThis = editingItemId === item.id;

                              // Inline rename mode
                              if (isRenamingThis && !itemCompleted) {
                                return (
                                  <div key={item.id} className="flex items-center gap-2 px-3 py-1">
                                    <Input
                                      value={editingItemLabel}
                                      onChange={(e) => setEditingItemLabel(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleRenamePlanItem(item.id, editingItemLabel);
                                        if (e.key === "Escape") setEditingItemId(null);
                                      }}
                                      className="h-7 text-sm flex-1"
                                      autoFocus
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => handleRenamePlanItem(item.id, editingItemLabel)}
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => setEditingItemId(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={item.id}
                                  className={`w-full flex items-center gap-2.5 text-sm rounded-md px-3 py-1.5 text-left transition-colors ${
                                    isSelected
                                      ? "bg-primary/10 border border-primary/30 font-medium"
                                      : itemCompleted
                                        ? "text-muted-foreground"
                                        : "hover:bg-accent"
                                  }`}
                                >
                                  <button
                                    type="button"
                                    disabled={itemCompleted}
                                    onClick={() => isClickable && toggleProgressItem(item.id)}
                                    className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer disabled:cursor-default"
                                  >
                                    {itemCompleted ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                    ) : isSelected ? (
                                      <SquareCheck className="h-4 w-4 text-primary shrink-0" />
                                    ) : (
                                      <Square className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                                    )}
                                    <span className={`truncate ${itemCompleted ? "line-through" : ""}`}>
                                      {item.label}
                                    </span>
                                  </button>
                                  {itemCompleted && item.completedAt && (
                                    <span className="text-xs text-muted-foreground shrink-0">
                                      {formatDateTime(item.completedAt)}
                                    </span>
                                  )}
                                  {isSelected && (
                                    <span className="text-xs text-primary font-normal shrink-0">
                                      Completes on save
                                    </span>
                                  )}
                                  {/* Edit mode actions */}
                                  {isEditing && !itemCompleted && (
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingItemId(item.id);
                                          setEditingItemLabel(item.label);
                                        }}
                                        className="p-1 text-muted-foreground hover:text-primary rounded"
                                        title="Rename"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeletePlanItem(item.id);
                                        }}
                                        className="p-1 text-muted-foreground hover:text-destructive rounded"
                                        title="Delete step"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">No active treatments</p>
            )}

            {canCreateTreatmentPlans(permissionLevel || 3) && patientId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPlanSheetMode("new-chain");
                  setPlanSheetChainId(undefined);
                  setPlanSheetChainTitle(undefined);
                  setPlanSheetOpen(true);
                }}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                New Chain
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Schedule Follow-Up — for doctors when form is editable */}
      {isDoctor && !readOnly && !isLocked && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Schedule Follow-Up
            </CardTitle>
          </CardHeader>
          <CardContent>
            {followUpScheduled ? (
              <div className="text-sm text-green-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Follow-up scheduled
                <button
                  type="button"
                  onClick={() => setFollowUpScheduled(false)}
                  className="text-xs text-primary hover:underline ml-auto"
                >
                  Schedule another
                </button>
              </div>
            ) : (
              <div className="flex items-end gap-3">
                <div className="space-y-1.5 flex-1">
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Time</Label>
                  <Select value={followUpTimeSlot} onValueChange={setFollowUpTimeSlot}>
                    <SelectTrigger className="w-[130px] h-9 text-sm">
                      <SelectValue placeholder="Any time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="afternoon">Afternoon</SelectItem>
                      <SelectItem value="evening">Evening</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleScheduleFollowUp}
                  disabled={!followUpDate || isPending}
                  className="h-9"
                >
                  Schedule
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Existing addendums */}
      {addendums.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Additional Notes ({addendums.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {addendums.map((a) => (
              <div key={a.id} className="rounded-md border p-3 text-sm">
                <div className="whitespace-pre-wrap">{a.content}</div>
                <div className="text-xs text-muted-foreground mt-2">
                  Dr. {a.doctorName} {"\u00b7"} {formatDateTime(a.createdAt)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Sticky bottom save bar */}
      <div className="sticky bottom-0 z-20 -mx-4 px-4 md:-mx-6 md:px-6 bg-background/95 backdrop-blur-sm border-t shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        <div className="py-3 flex gap-2 justify-between items-center">
          <div className="flex gap-2">
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave("print")}
              disabled={isPending}
            >
              <Printer className="mr-1 h-3.5 w-3.5" />
              Print
            </Button>
            {isDoctor && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRxSheetOpen(true)}
                disabled={isPending}
              >
                <Pill className="mr-1 h-3.5 w-3.5" />
                Prescribe
              </Button>
            )}
            <Button
              onClick={() => handleSave("stay")}
              disabled={isPending}
              size="sm"
            >
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const toothPanel = toothFindings && toothFindings.length > 0 ? (
    <ToothDetailPanel
      toothNumber={detailTooth}
      open={detailOpen}
      onOpenChange={setDetailOpen}
      findings={toothFindings}
      currentData={detailTooth ? getToothCurrentData(detailTooth) : null}
      onSave={handleToothSave}
      history={detailTooth ? toothHistoryProp?.filter((h) => h.toothNumber === detailTooth) : undefined}
    />
  ) : null;

  const prescriptionSheet = (
    <PrescriptionSheet
      open={rxSheetOpen}
      onOpenChange={setRxSheetOpen}
      visitId={visitId}
    />
  );

  const inlinePlanSheet = patientId && allOperations && allDoctors ? (
    <InlinePlanSheet
      open={planSheetOpen}
      onOpenChange={setPlanSheetOpen}
      patientId={patientId}
      mode={planSheetMode}
      chainId={planSheetChainId}
      chainTitle={planSheetChainTitle}
      chainTeeth={planSheetChainTeeth}
      selectedTeeth={teethSelected}
      allOperations={allOperations.map((op) => ({
        id: op.id,
        name: op.name,
        category: op.category,
        stepCount: op.stepCount || 0,
        defaultMinFee: op.defaultMinFee,
      }))}
      allDoctors={allDoctors}
      defaultDoctorId={doctorId || currentDoctor.id}
      onSuccess={() => router.refresh()}
    />
  ) : null;

  return <>{editableContent}{toothPanel}{prescriptionSheet}{inlinePlanSheet}</>;
}
