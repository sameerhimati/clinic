"use client";

import { useState, useTransition, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { saveExamination, finalizeReport, unlockReport, addAddendum, createPlansFromConsultation, getNextArrivedAppointment } from "./actions";
import { createVisitAndExamine } from "@/app/(main)/visits/actions";
import { updateAppointmentStatus } from "@/app/(main)/appointments/actions";
import { toast } from "sonner";
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
import { Lock, Unlock, Clock, MessageSquarePlus, Printer, ChevronDown, ChevronUp, FileText, ClipboardList, Search, Lightbulb, CalendarPlus, ToggleLeft, ToggleRight, AlertTriangle, ImageIcon, X, ZoomIn, Download, Pill } from "lucide-react";
import { PrescriptionSheet } from "@/components/prescription-sheet";
import { ToothChart, type ToothStatusData } from "@/components/tooth-chart";
import { ToothDetailPanel, type ToothUpdate, type ToothFindingOption } from "@/components/tooth-detail-panel";
import { TOOTH_STATUSES, TOOTH_STATUS_INDICATORS, getStatusColor, type ToothStatusKey } from "@/lib/dental";
import { TreatmentPlanEditor, type PlanItemDraft } from "@/components/treatment-plan-editor";
import { WorkDoneCard, type WorkDoneEntry } from "@/components/work-done-card";
import { createTreatmentPlan, completePlanItems, getOperationSteps } from "@/app/(main)/patients/[id]/plan/actions";
import { format } from "date-fns";
import { toTitleCase, formatDateTime } from "@/lib/format";
import { CheckCircle2, Circle } from "lucide-react";

type PreviousReport = {
  visitId: number;
  caseNo: number | null;
  stepLabel: string | null;
  doctorName: string;
  reportDate: string;
  complaint: string | null;
  examination: string | null;
  diagnosis: string | null;
  treatmentNotes: string | null;
  medication: string | null;
  addendums: { content: string; doctorName: string; createdAt: string }[];
};

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

const TOP_COMPLAINTS = [
  "PAIN",
  "SWELLING",
  "SENSITIVITY",
  "BROKEN TOOTH",
  "BLEEDING GUMS",
  "REGULAR CHECKUP",
];

const MORE_COMPLAINTS = [
  "LOOSE TOOTH",
  "BAD BREATH",
  "DISCOLORATION",
  "SPACING",
  "DIFFICULTY CHEWING",
  "JAW PAIN",
  "REFERRED BY DOCTOR",
  "FOLLOW UP",
  "ORTHODONTIC CONSULTATION",
  "OTHER",
];


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

function PreviousNoteCard({ report }: { report: PreviousReport }) {
  const [expanded, setExpanded] = useState(false);
  const hasContent = report.complaint || report.diagnosis || report.treatmentNotes || report.examination || report.medication;

  if (!hasContent) return null;

  return (
    <div className="rounded-md border bg-card p-3 text-xs space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-medium text-sm">
            {report.stepLabel || "Initial Assessment"}
          </span>
          <div className="text-muted-foreground">
            Dr. {report.doctorName} · {report.reportDate}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 rounded p-1 hover:bg-accent"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Collapsed: truncated fields */}
      {!expanded && (
        <div className="space-y-1 text-muted-foreground">
          {report.complaint && (
            <div className="line-clamp-2"><span className="font-medium text-foreground">C: </span>{report.complaint}</div>
          )}
          {report.diagnosis && (
            <div className="line-clamp-2"><span className="font-medium text-foreground">D: </span>{report.diagnosis}</div>
          )}
          {report.treatmentNotes && (
            <div className="line-clamp-2"><span className="font-medium text-foreground">Tx: </span>{report.treatmentNotes}</div>
          )}
        </div>
      )}

      {/* Expanded: all fields */}
      {expanded && (
        <div className="space-y-2 text-foreground">
          {report.complaint && (
            <div><span className="text-muted-foreground font-medium">Complaint: </span><span className="whitespace-pre-wrap">{report.complaint}</span></div>
          )}
          {report.examination && (
            <div><span className="text-muted-foreground font-medium">Examination: </span><span className="whitespace-pre-wrap">{report.examination}</span></div>
          )}
          {report.diagnosis && (
            <div><span className="text-muted-foreground font-medium">Diagnosis: </span><span className="whitespace-pre-wrap">{report.diagnosis}</span></div>
          )}
          {report.treatmentNotes && (
            <div><span className="text-muted-foreground font-medium">Treatment: </span><span className="whitespace-pre-wrap">{report.treatmentNotes}</span></div>
          )}
          {report.medication && (
            <div><span className="text-muted-foreground font-medium">Medication: </span><span className="whitespace-pre-wrap">{report.medication}</span></div>
          )}
          {report.addendums.length > 0 && (
            <div className="border-t pt-1.5 mt-1.5 space-y-1">
              {report.addendums.map((a, i) => (
                <div key={i} className="text-xs text-muted-foreground">
                  <span className="italic">{a.content}</span>
                  <span className="ml-1">— Dr. {a.doctorName}, {a.createdAt}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PreviousNotesPanel({
  reports,
  operationName,
  collapsed,
  onToggle,
}: {
  reports: PreviousReport[];
  operationName: string;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="space-y-3">
      <div
        className={`flex items-center justify-between ${onToggle ? "cursor-pointer" : ""}`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">{operationName} — Previous Notes</h3>
          <span className="text-xs text-muted-foreground">({reports.length} visit{reports.length !== 1 ? "s" : ""})</span>
        </div>
        {onToggle && (
          <button type="button" className="shrink-0 rounded p-1 hover:bg-accent">
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        )}
      </div>
      {!collapsed && (
        <div className="space-y-2">
          {reports.map((r) => (
            <PreviousNoteCard key={r.visitId} report={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function ComplaintPills({ complaint, setComplaint }: { complaint: string; setComplaint: (v: string) => void }) {
  const [showMore, setShowMore] = useState(false);
  const selectedParts = complaint.toUpperCase().split(",").map(s => s.trim()).filter(Boolean);
  // Auto-expand if any MORE_COMPLAINTS are already selected
  const hasMoreSelected = MORE_COMPLAINTS.some(c => selectedParts.includes(c));
  const visibleComplaints = (showMore || hasMoreSelected) ? [...TOP_COMPLAINTS, ...MORE_COMPLAINTS] : TOP_COMPLAINTS;

  const toggle = (c: string) => {
    const parts = complaint.split(",").map(s => s.trim()).filter(Boolean);
    const upperParts = parts.map(s => s.toUpperCase());
    if (upperParts.includes(c)) {
      setComplaint(parts.filter((_, i) => upperParts[i] !== c).join(", "));
    } else {
      setComplaint(complaint ? complaint + ", " + c : c);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label>Chief Complaint</Label>
      <div className="flex flex-wrap gap-1.5">
        {visibleComplaints.map((c) => (
          <button
            key={c}
            type="button"
            className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
              selectedParts.includes(c)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-input hover:bg-accent"
            }`}
            onClick={() => toggle(c)}
          >
            {c}
          </button>
        ))}
        {!showMore && !hasMoreSelected && (
          <button
            type="button"
            className="px-2 py-0.5 text-xs rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground hover:bg-accent transition-colors"
            onClick={() => setShowMore(true)}
          >
            More…
          </button>
        )}
      </div>
      <Textarea
        placeholder="Additional details..."
        value={complaint}
        onChange={(e) => setComplaint(e.target.value)}
        rows={2}
      />
    </div>
  );
}

/** Floating apply toolbar — appears when teeth are selected */
function ToothApplyBar({
  selected,
  onApply,
  onClear,
  onDetails,
}: {
  selected: number[];
  onApply: (status: string) => void;
  onClear: () => void;
  onDetails: () => void;
}) {
  if (selected.length === 0) return null;

  const statusButtons: { key: string; label: string; indicator: string; color: string }[] = [
    { key: "MISSING", label: "Missing", indicator: TOOTH_STATUS_INDICATORS.MISSING, color: getStatusColor("MISSING") },
    { key: "CARIES", label: "Caries", indicator: TOOTH_STATUS_INDICATORS.CARIES, color: getStatusColor("CARIES") },
    { key: "FILLED", label: "Filled", indicator: TOOTH_STATUS_INDICATORS.FILLED, color: getStatusColor("FILLED") },
    { key: "CROWNED", label: "Crown", indicator: TOOTH_STATUS_INDICATORS.CROWNED, color: getStatusColor("CROWNED") },
    { key: "RCT", label: "RCT", indicator: TOOTH_STATUS_INDICATORS.RCT, color: getStatusColor("RCT") },
    { key: "IMPLANT", label: "Implant", indicator: TOOTH_STATUS_INDICATORS.IMPLANT, color: getStatusColor("IMPLANT") },
    { key: "EXTRACTED", label: "Extracted", indicator: TOOTH_STATUS_INDICATORS.EXTRACTED, color: getStatusColor("EXTRACTED") },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2 p-2 rounded-lg border border-primary/20 bg-primary/5">
      <span className="text-xs font-medium text-primary mr-1">
        {selected.length} {selected.length === 1 ? "tooth" : "teeth"}:
      </span>
      {statusButtons.map(({ key, label, indicator, color }) => (
        <button
          key={key}
          type="button"
          onClick={() => onApply(key)}
          className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors border-input bg-background hover:bg-accent cursor-pointer"
        >
          <span style={{ color }} className="text-[10px]">{indicator}</span>
          {label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onApply("HEALTHY")}
        className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors border-green-300 text-green-700 bg-green-50 hover:bg-green-100 cursor-pointer"
      >
        Healthy
      </button>
      <div className="flex-1" />
      <button
        type="button"
        onClick={onDetails}
        className="text-xs text-primary hover:underline cursor-pointer"
      >
        Details...
      </button>
      <button
        type="button"
        onClick={onClear}
        className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
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
  previousReports,
  operationName,
  isFollowUp,
  treatmentSteps,
  allDoctors,
  allOperations,
  matchingPlanItem,
  existingActivePlans,
  doctorAvailability,
  patientDiseases,
  patientFiles,
  currentStepTemplate,
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
  previousReports?: PreviousReport[];
  operationName?: string;
  isFollowUp?: boolean;
  treatmentSteps?: { name: string; defaultDayGap: number; description: string | null; noteTemplate?: string | null }[];
  currentStepTemplate?: string | null;
  allDoctors?: { id: number; name: string }[];
  allOperations?: { id: number; name: string; category: string | null; stepCount?: number; suggestsOperationId?: number | null }[];
  doctorAvailability?: { doctorId: number; dayOfWeek: number; startTime: string; endTime: string }[];
  matchingPlanItem?: {
    itemId: number;
    itemLabel: string;
    planId: number;
    planTitle: string;
    allItems: { id: number; label: string; sortOrder: number; isCompleted: boolean }[];
  } | null;
  existingActivePlans?: { id: number; title: string; nextItemLabel: string | null }[];
  patientDiseases?: string[];
  patientFiles?: PatientFileRef[];
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

  const [complaint, setComplaint] = useState(existingReport?.complaint || "");
  const [examination, setExamination] = useState(existingReport?.examination || "");
  const [diagnosis, setDiagnosis] = useState(existingReport?.diagnosis || "");
  const [treatmentNotes, setTreatmentNotes] = useState(existingReport?.treatmentNotes || "");
  const [estimate, setEstimate] = useState(existingReport?.estimate || "");
  const [addendumText, setAddendumText] = useState("");
  const [teethSelected, setTeethSelected] = useState<number[]>(() => {
    try {
      return existingReport?.teethSelected ? JSON.parse(existingReport.teethSelected) : [];
    } catch { return []; }
  });

  // Work Done state
  const [workDoneEntries, setWorkDoneEntries] = useState<WorkDoneEntry[]>([]);

  // Prescription sheet state
  const [rxSheetOpen, setRxSheetOpen] = useState(false);

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

  function handleBatchApply(status: string) {
    setToothUpdates((prev) => {
      const next = new Map(prev);
      for (const tooth of teethSelected) {
        if (status === "HEALTHY") {
          next.delete(tooth);
        } else {
          const existing = next.get(tooth);
          next.set(tooth, { toothNumber: tooth, status, findingId: existing?.findingId, notes: existing?.notes });
        }
      }
      return next;
    });
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

  function handleAddWorkDone(entry: WorkDoneEntry) {
    setWorkDoneEntries((prev) => [...prev, entry]);
    // Auto-update tooth statuses for Work Done entries
    if (entry.resultingStatus && entry.toothNumbers.length > 0) {
      setToothUpdates((prev) => {
        const next = new Map(prev);
        for (const tooth of entry.toothNumbers) {
          next.set(tooth, { toothNumber: tooth, status: entry.resultingStatus! });
        }
        return next;
      });
    }
  }

  function handleRemoveWorkDone(id: string) {
    setWorkDoneEntries((prev) => prev.filter((e) => e.id !== id));
  }

  // Build plan items available for Work Done auto-matching
  const activePlanItemsForWorkDone = (() => {
    if (!matchingPlanItem) return undefined;
    return matchingPlanItem.allItems
      .filter((item) => !item.isCompleted)
      .map((item) => ({
        id: item.id,
        label: item.label,
        operationId: null as number | null, // plan items may not have operationId exposed
      }));
  })();

  // Quick mode = default for new reports. Detailed = default when existing report has examination or diagnosis.
  const hasDetailedFields = !!(existingReport?.examination || existingReport?.diagnosis);
  const [isQuickMode, setIsQuickMode] = useState(!hasDetailedFields);

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
        const hasContent = draft.complaint || draft.examination || draft.diagnosis || draft.treatmentNotes;
        const differsSaved = draft.complaint !== (existingReport?.complaint || "") ||
          draft.treatmentNotes !== (existingReport?.treatmentNotes || "") ||
          draft.diagnosis !== (existingReport?.diagnosis || "");
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
      if (draft.complaint != null) setComplaint(draft.complaint);
      if (draft.examination != null) setExamination(draft.examination);
      if (draft.diagnosis != null) setDiagnosis(draft.diagnosis);
      if (draft.treatmentNotes != null) setTreatmentNotes(draft.treatmentNotes);
      if (draft.estimate != null) setEstimate(draft.estimate);
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
    complaint: existingReport?.complaint || "",
    examination: existingReport?.examination || "",
    diagnosis: existingReport?.diagnosis || "",
    treatmentNotes: existingReport?.treatmentNotes || "",
    estimate: existingReport?.estimate || "",
    teethSelected: existingReport?.teethSelected || "[]",
  });

  const isDirty = useCallback(() => {
    const s = savedRef.current;
    return complaint !== s.complaint || examination !== s.examination ||
      diagnosis !== s.diagnosis || treatmentNotes !== s.treatmentNotes ||
      estimate !== s.estimate ||
      JSON.stringify(teethSelected) !== s.teethSelected ||
      workDoneEntries.length > 0;
  }, [complaint, examination, diagnosis, treatmentNotes, estimate, teethSelected, workDoneEntries]);

  // Debounced autosave to localStorage
  useEffect(() => {
    if (readOnly || isLocked) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      if (!isDirty()) return;
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          complaint, examination, diagnosis, treatmentNotes, estimate,
          teethSelected: JSON.stringify(teethSelected),
          savedAt: Date.now(),
        }));
      } catch { /* quota exceeded — ignore */ }
    }, 15000); // Save every 15s of idle
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [complaint, examination, diagnosis, treatmentNotes, estimate, teethSelected, readOnly, isLocked, isDirty, draftKey]);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty()) {
        e.preventDefault();
        // Save draft immediately on unload
        try {
          localStorage.setItem(draftKey, JSON.stringify({
            complaint, examination, diagnosis, treatmentNotes, estimate,
            teethSelected: JSON.stringify(teethSelected),
            savedAt: Date.now(),
          }));
        } catch { /* ignore */ }
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, draftKey, complaint, examination, diagnosis, treatmentNotes, estimate, teethSelected]);

  // Keyboard shortcuts: Cmd+S = Save, Cmd+Enter = Save & Next Patient
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  useEffect(() => {
    if (readOnly || isLocked) return;
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "s") {
        e.preventDefault();
        handleSaveRef.current("detail");
      } else if (mod && e.key === "Enter") {
        e.preventDefault();
        handleSaveRef.current("next");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [readOnly, isLocked]);

  const isDoctor = (permissionLevel ?? 0) >= 3;
  const hasPreviousNotes = previousReports && previousReports.length > 0;
  const hasFiles = patientFiles && patientFiles.length > 0;
  const [mobileNotesOpen, setMobileNotesOpen] = useState(true);
  const [filesCollapsed, setFilesCollapsed] = useState(true);

  // Treatment plan state
  const hasTemplateSteps = treatmentSteps && treatmentSteps.length > 0;
  const hasExistingPlans = existingActivePlans && existingActivePlans.length > 0;
  const [showPlanEditor, setShowPlanEditor] = useState(false);
  const [planTitle, setPlanTitle] = useState(operationName || "");
  const [planItems, setPlanItems] = useState<PlanItemDraft[]>([]);

  // Multi-treatment selection state (consultation flow — no operation yet)
  const [treatmentSearch, setTreatmentSearch] = useState("");
  const [selectedTreatments, setSelectedTreatments] = useState<
    { id: number; name: string; category: string | null; stepCount: number }[]
  >([]);

  // Auto-suggest state
  const [pendingSuggestion, setPendingSuggestion] = useState<{
    sourceOpName: string;
    suggestedOp: { id: number; name: string; category: string | null; stepCount: number };
  } | null>(null);

  // Inline scheduling state — keyed by operationId
  const [treatmentSchedules, setTreatmentSchedules] = useState<
    Record<number, { doctorId: number; date: string; timeSlot: string; stepName: string }>
  >({});

  const selectedIds = new Set(selectedTreatments.map((t) => t.id));
  const filteredOperations = allOperations?.filter((op) => {
    if (selectedIds.has(op.id)) return false;
    if (!treatmentSearch) return true;
    const q = treatmentSearch.toLowerCase();
    return op.name.toLowerCase().includes(q) || (op.category?.toLowerCase().includes(q) ?? false);
  }) ?? [];

  // Helper to add a treatment and set up scheduling + suggestions
  function addTreatment(op: { id: number; name: string; category: string | null; stepCount?: number; suggestsOperationId?: number | null }) {
    const stepCount = op.stepCount ?? 0;
    setSelectedTreatments((prev) => [
      ...prev,
      { id: op.id, name: op.name, category: op.category, stepCount },
    ]);
    setTreatmentSearch("");

    // Auto-initialize schedule for multi-step treatments
    if (stepCount > 1) {
      getOperationSteps(op.id).then((steps) => {
        if (steps.length >= 2) {
          const step2 = steps[1]; // Second step
          // Find next available date based on doctor availability + defaultDayGap
          let schedDate = new Date();
          schedDate.setDate(schedDate.getDate() + step2.defaultDayGap);
          const docSlots = doctorAvailability?.filter((a) => a.doctorId === doctorId) || [];
          if (docSlots.length > 0) {
            // Shift to next available day if needed
            for (let i = 0; i < 7; i++) {
              const testDay = new Date(schedDate);
              testDay.setDate(testDay.getDate() + i);
              if (docSlots.some((s) => s.dayOfWeek === testDay.getDay())) {
                schedDate = testDay;
                break;
              }
            }
          }
          setTreatmentSchedules((prev) => ({
            ...prev,
            [op.id]: {
              doctorId: doctorId,
              date: format(schedDate, "yyyy-MM-dd"),
              timeSlot: docSlots.find((s) => s.dayOfWeek === schedDate.getDay())?.startTime
                ? formatTime24to12Short(docSlots.find((s) => s.dayOfWeek === schedDate.getDay())!.startTime)
                : "10:00 AM",
              stepName: step2.name,
            },
          }));
        }
      });
    }

    // Check for auto-suggest
    if (op.suggestsOperationId) {
      const suggested = allOperations?.find((o) => o.id === op.suggestsOperationId);
      if (suggested && !selectedIds.has(suggested.id) && suggested.id !== op.id) {
        setPendingSuggestion({
          sourceOpName: op.name,
          suggestedOp: { id: suggested.id, name: suggested.name, category: suggested.category, stepCount: suggested.stepCount ?? 0 },
        });
      }
    }
  }

  function removeTreatment(opId: number) {
    setSelectedTreatments((prev) => prev.filter((s) => s.id !== opId));
    setTreatmentSchedules((prev) => {
      const next = { ...prev };
      delete next[opId];
      return next;
    });
  }

  // Time slot options for scheduling
  const TIME_SLOTS = [
    "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM",
    "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM",
  ];

  // Initialize plan items from template steps when opening the editor
  function initPlanFromTemplate() {
    if (!treatmentSteps || treatmentSteps.length === 0) return;
    const items: PlanItemDraft[] = treatmentSteps.map((step, index) => ({
      id: crypto.randomUUID(),
      label: step.name,
      operationId: null, // same operation for all template steps
      assignedDoctorId: doctorId,
      estimatedDayGap: step.defaultDayGap,
      notes: step.description,
      isCompleted: index === 0, // first step = this visit
    }));
    setPlanItems(items);
    setPlanTitle(operationName || "Treatment Plan");
    setShowPlanEditor(true);
  }

  async function loadTemplateSteps(operationId: number) {
    const steps = await getOperationSteps(operationId);
    return steps.map((s) => ({
      name: s.name,
      defaultDayGap: s.defaultDayGap,
      description: s.description,
    }));
  }

  async function handleSave(redirectTarget: "detail" | "print" | "next") {
    const initialSelectedCount = selectedTreatments.length;
    startTransition(async () => {
      try {
        clearDraft();
        const result = await saveExamination(visitId, {
          doctorId,
          reportDate,
          complaint: complaint || null,
          examination: examination || null,
          diagnosis: diagnosis || null,
          treatmentNotes: treatmentNotes || null,
          estimate: estimate || null,
          medication: null,
          teethSelected: teethSelected.length > 0 ? JSON.stringify(teethSelected) : null,
          toothUpdates: toothUpdates.size > 0 ? Array.from(toothUpdates.values()) : undefined,
          workDone: workDoneEntries.length > 0
            ? workDoneEntries.flatMap((entry) => {
                if (entry.toothNumbers.length === 0) {
                  return [{
                    operationId: entry.operationId,
                    resultingStatus: entry.resultingStatus || undefined,
                    planItemId: entry.planItemId || undefined,
                    notes: entry.notes || undefined,
                  }];
                }
                return entry.toothNumbers.map((tooth, idx) => ({
                  operationId: entry.operationId,
                  toothNumber: tooth,
                  resultingStatus: entry.resultingStatus || undefined,
                  planItemId: idx === 0 ? (entry.planItemId || undefined) : undefined,
                  notes: idx === 0 ? (entry.notes || undefined) : undefined,
                }));
              })
            : undefined,
        });

        // Auto-complete matching plan item for follow-up visits
        // Skip if WorkDone entries already handle plan item completion
        const workDoneHandlesPlan = workDoneEntries.some((e) => e.planItemId != null);
        if (matchingPlanItem && !workDoneHandlesPlan) {
          try {
            await completePlanItems([matchingPlanItem.itemId], visitId);
            toast.success(`Step completed: ${matchingPlanItem.itemLabel}`);
          } catch {
            toast.error("Exam saved but plan step completion failed");
          }
        }
        // Create treatment plan if editor is active with items (new visits only)
        else if (showPlanEditor && planItems.length > 0 && patientId) {
          const validItems = planItems.filter((i) => !i.isCompleted && i.label.trim());
          if (validItems.length > 0) {
            try {
              await createTreatmentPlan(
                patientId,
                planTitle || operationName || "Treatment Plan",
                validItems.map((i) => ({
                  label: i.label,
                  operationId: i.operationId,
                  assignedDoctorId: i.assignedDoctorId,
                  estimatedDayGap: i.estimatedDayGap,
                  notes: i.notes,
                })),
                null,
                visitId, // link first item to this visit
              );
              toast.success("Treatment plan created");
            } catch {
              toast.error("Exam saved but plan creation failed");
            }
          }
        }
        // Create treatment plans from multi-select consultation flow
        else if (selectedTreatments.length > 0 && patientId) {
          try {
            // Build schedules from inline scheduling state
            const schedulesToSend = Object.entries(treatmentSchedules).map(
              ([opId, sched]) => ({
                operationId: Number(opId),
                doctorId: sched.doctorId,
                date: sched.date,
                timeSlot: sched.timeSlot,
              })
            );
            const planResult = await createPlansFromConsultation(
              patientId,
              visitId,
              doctorId,
              selectedTreatments.map((t) => t.id),
              schedulesToSend.length > 0 ? schedulesToSend : undefined
            );
            if (planResult.alreadyExisted) {
              // Plans already created for this visit — skip toast
            } else {
              const parts: string[] = [];
              if (planResult.count > 0) parts.push(`${planResult.count} plan${planResult.count !== 1 ? "s" : ""} created`);
              if (planResult.scheduledCount > 0) parts.push(`${planResult.scheduledCount} appointment${planResult.scheduledCount !== 1 ? "s" : ""} scheduled`);
              if (parts.length > 0) toast.success(parts.join(", "));
            }
            setSelectedTreatments([]);
            setTreatmentSchedules({});
          } catch {
            toast.error("Exam saved but plan creation failed");
          }
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
        } else if (!showPlanEditor && !matchingPlanItem && initialSelectedCount === 0) {
          toast.success("Examination saved");
        }
        if (redirectTarget === "print") {
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

  async function handleFinalize() {
    if (!reportId) return;
    startTransition(async () => {
      try {
        await finalizeReport(reportId);
        toast.success("Notes finalized and locked");
        router.refresh();
      } catch {
        toast.error("Failed to finalize notes");
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

  // Side-by-side layout helpers (inline, not a component — avoids remount on re-render)
  const previousNotesDesktop = hasPreviousNotes ? (
    <div className="lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto lg:sticky lg:top-[72px] pr-1">
      <PreviousNotesPanel
        reports={previousReports!}
        operationName={operationName || "Treatment"}
      />
    </div>
  ) : null;

  const previousNotesMobile = hasPreviousNotes ? (
    <div className="lg:hidden mb-4">
      <Card>
        <CardContent className="p-3">
          <PreviousNotesPanel
            reports={previousReports!}
            operationName={operationName || "Treatment"}
            collapsed={!mobileNotesOpen}
            onToggle={() => setMobileNotesOpen(!mobileNotesOpen)}
          />
        </CardContent>
      </Card>
    </div>
  ) : null;

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

    if (!hasPreviousNotes) return readOnlyContent;
    return (
      <>
        {previousNotesMobile}
        <div className="hidden lg:grid lg:grid-cols-[380px_1fr] gap-6">
          {previousNotesDesktop}
          <div className="max-w-3xl">{readOnlyContent}</div>
        </div>
        <div className="lg:hidden">{readOnlyContent}</div>
      </>
    );
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

      {/* Mode toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Dr. {doctorName} {"\u00b7"} {reportDate}
        </span>
        <button
          type="button"
          onClick={() => setIsQuickMode(!isQuickMode)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {isQuickMode ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
          {isQuickMode ? "Quick Mode" : "Detailed Mode"}
        </button>
      </div>

      {isQuickMode ? (
        /* Quick Mode: Complaint pills → Tooth chart → Single notes → Medication */
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clinical Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ComplaintPills complaint={complaint} setComplaint={setComplaint} />

            <div className="space-y-1.5">
              <Label>Teeth {toothUpdates.size > 0 && <span className="text-xs text-muted-foreground ml-1">({toothUpdates.size} updated)</span>}</Label>
              <ToothChart
                selected={teethSelected}
                onChange={!readOnly && !isLocked ? setTeethSelected : undefined}
                toothStatuses={mergedToothStatuses}
                onDoubleClick={!readOnly && !isLocked ? handleToothDoubleClick : undefined}
                readOnly={readOnly || isLocked}
              />
              {!readOnly && !isLocked && <ToothApplyBar selected={teethSelected} onApply={handleBatchApply} onClear={() => setTeethSelected([])} onDetails={() => { if (teethSelected.length > 0) { setDetailTooth(teethSelected[0]); setDetailOpen(true); } }} />}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Notes</Label>
                {currentStepTemplate && !treatmentNotes && (
                  <button
                    type="button"
                    onClick={() => setTreatmentNotes(currentStepTemplate)}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <FileText className="h-3 w-3" />
                    Use Template
                  </button>
                )}
              </div>
              <Textarea
                placeholder="Treatment notes, findings, procedures performed..."
                value={treatmentNotes}
                onChange={(e) => setTreatmentNotes(e.target.value)}
                rows={6}
                autoFocus
              />
            </div>

          </CardContent>
        </Card>
      ) : (
        /* Detailed Mode: Original 2-card layout */
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clinical Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ComplaintPills complaint={complaint} setComplaint={setComplaint} />

              <div className="space-y-1.5">
                <Label>Teeth {toothUpdates.size > 0 && <span className="text-xs text-muted-foreground ml-1">({toothUpdates.size} updated)</span>}</Label>
                <ToothChart
                  selected={teethSelected}
                  onChange={!readOnly && !isLocked ? setTeethSelected : undefined}
                  toothStatuses={mergedToothStatuses}
                  onDoubleClick={!readOnly && !isLocked ? handleToothDoubleClick : undefined}
                  readOnly={readOnly || isLocked}
                />
                {!readOnly && !isLocked && <ToothApplyBar selected={teethSelected} onApply={handleBatchApply} onClear={() => setTeethSelected([])} onDetails={() => { if (teethSelected.length > 0) { setDetailTooth(teethSelected[0]); setDetailOpen(true); } }} />}
              </div>

              <div className="space-y-1.5">
                <Label>Examination Findings</Label>
                <Textarea
                  placeholder="Record examination findings..."
                  value={examination}
                  onChange={(e) => setExamination(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Diagnosis</Label>
                <Textarea
                  placeholder="Enter diagnosis..."
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Treatment & Prescription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Treatment Notes</Label>
                  {currentStepTemplate && !treatmentNotes && (
                    <button
                      type="button"
                      onClick={() => setTreatmentNotes(currentStepTemplate)}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <FileText className="h-3 w-3" />
                      Use Template
                    </button>
                  )}
                </div>
                <Textarea
                  placeholder="Treatment plan, recommendations, procedures performed..."
                  value={treatmentNotes}
                  onChange={(e) => setTreatmentNotes(e.target.value)}
                  rows={4}
                />
              </div>

              {(!permissionLevel || permissionLevel <= 2) && (
                <div className="space-y-1.5">
                  <Label>Estimate</Label>
                  <Textarea
                    placeholder="Cost estimate..."
                    value={estimate}
                    onChange={(e) => setEstimate(e.target.value)}
                    rows={2}
                  />
                </div>
              )}

            </CardContent>
          </Card>
        </>
      )}

      {/* Work Done — between notes and treatment plan */}
      {isDoctor && (
        <WorkDoneCard
          entries={workDoneEntries}
          onAdd={handleAddWorkDone}
          onRemove={handleRemoveWorkDone}
          selectedTeeth={teethSelected}
          allOperations={allOperations || []}
          activePlanItems={activePlanItemsForWorkDone}
        />
      )}

      {/* Treatment Plan — context-aware section */}
      {/* Case A: Follow-up with matching plan item → show progress card */}
      {isDoctor && matchingPlanItem && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{matchingPlanItem.planTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {matchingPlanItem.allItems.map((item) => {
                const isCurrent = item.id === matchingPlanItem.itemId;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2.5 text-sm rounded-md px-3 py-2 ${
                      isCurrent
                        ? "bg-primary/8 border border-primary/20 font-medium"
                        : item.isCompleted
                          ? "text-muted-foreground"
                          : ""
                    }`}
                  >
                    {item.isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    ) : isCurrent ? (
                      <div className="h-4 w-4 rounded-full border-2 border-primary bg-primary/20 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={item.isCompleted ? "line-through" : ""}>
                      {item.label}
                    </span>
                    {isCurrent && (
                      <span className="ml-auto text-xs text-primary font-normal">
                        Completes on save
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Case B: First visit, operation has templates, no existing plan → collapsed prompt */}
      {isDoctor && !existingReport && !isFollowUp && !matchingPlanItem && hasTemplateSteps && allDoctors && allOperations && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Treatment Plan</CardTitle>
              {hasExistingPlans && (
                <span className="text-xs text-muted-foreground">
                  {existingActivePlans!.length} active plan{existingActivePlans!.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!showPlanEditor ? (
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={initPlanFromTemplate}
                >
                  <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
                  Create {operationName} plan ({treatmentSteps!.length} steps)
                </Button>
                {hasExistingPlans && (
                  <p className="text-xs text-muted-foreground">
                    Active: {existingActivePlans!.map((p) => p.title).join(", ")}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Plan Title</Label>
                  <input
                    type="text"
                    value={planTitle}
                    onChange={(e) => setPlanTitle(e.target.value)}
                    placeholder="e.g. RCT + Crown tooth 36"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <TreatmentPlanEditor
                  items={planItems}
                  onChange={setPlanItems}
                  operations={allOperations}
                  doctors={allDoctors}
                  defaultDoctorId={doctorId}
                  onLoadTemplateSteps={loadTemplateSteps}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowPlanEditor(false);
                    setPlanItems([]);
                  }}
                  className="text-muted-foreground"
                >
                  Remove plan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {/* Case D: Consultation — no operation assigned yet → multi-treatment picker */}
      {isDoctor && !existingReport && !(hasOperation ?? false) && !matchingPlanItem && allOperations && allOperations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Treatment Plans
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Selected treatments as removable chips + inline scheduling */}
            {selectedTreatments.length > 0 ? (
              <div className="space-y-2">
                {selectedTreatments.map((t) => (
                  <div key={t.id} className="space-y-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-primary/10 text-primary border border-primary/20">
                      {t.name}
                      {t.stepCount > 1 && (
                        <span className="text-[10px] opacity-70">{t.stepCount} steps</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeTreatment(t.id)}
                        className="ml-0.5 hover:text-destructive transition-colors"
                      >
                        ×
                      </button>
                    </span>
                    {/* Inline scheduling row for multi-step treatments */}
                    {treatmentSchedules[t.id] && (
                      <div className="ml-2 pl-3 border-l-2 border-primary/20 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarPlus className="h-3 w-3" />
                          <span>Next: <span className="font-medium text-foreground">{treatmentSchedules[t.id].stepName}</span></span>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                          <select
                            value={treatmentSchedules[t.id].doctorId}
                            onChange={(e) => setTreatmentSchedules((prev) => ({
                              ...prev,
                              [t.id]: { ...prev[t.id], doctorId: Number(e.target.value) },
                            }))}
                            className="h-8 rounded-md border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            {allDoctors?.map((d) => (
                              <option key={d.id} value={d.id}>Dr. {toTitleCase(d.name)}</option>
                            ))}
                          </select>
                          <input
                            type="date"
                            value={treatmentSchedules[t.id].date}
                            min={format(new Date(), "yyyy-MM-dd")}
                            onChange={(e) => setTreatmentSchedules((prev) => ({
                              ...prev,
                              [t.id]: { ...prev[t.id], date: e.target.value },
                            }))}
                            className="h-8 rounded-md border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          />
                          <select
                            value={treatmentSchedules[t.id].timeSlot}
                            onChange={(e) => setTreatmentSchedules((prev) => ({
                              ...prev,
                              [t.id]: { ...prev[t.id], timeSlot: e.target.value },
                            }))}
                            className="h-8 rounded-md border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            {TIME_SLOTS.map((slot) => (
                              <option key={slot} value={slot}>{slot}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setTreatmentSchedules((prev) => {
                              const next = { ...prev };
                              delete next[t.id];
                              return next;
                            })}
                            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                        {/* Availability helper text */}
                        {(() => {
                          const docSlots = doctorAvailability?.filter((a) => a.doctorId === treatmentSchedules[t.id].doctorId) || [];
                          if (docSlots.length === 0) return null;
                          const schedDate = treatmentSchedules[t.id].date ? new Date(treatmentSchedules[t.id].date + "T12:00:00") : null;
                          const isUnavailable = schedDate && !docSlots.some((s) => s.dayOfWeek === schedDate.getDay());
                          return (
                            <div className="text-[11px] text-muted-foreground">
                              Available: {formatDoctorAvailability(docSlots)}
                              {isUnavailable && (
                                <span className="ml-1.5 text-amber-600 font-medium">
                                  ⚠ {DAY_NAMES_SHORT[schedDate!.getDay()]} not scheduled
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select treatments the patient needs
              </p>
            )}

            {/* Auto-suggest banner */}
            {pendingSuggestion && !selectedIds.has(pendingSuggestion.suggestedOp.id) && (
              <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm">
                <Lightbulb className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="text-blue-800 flex-1">
                  <span className="font-medium">{pendingSuggestion.suggestedOp.name}</span> is typically needed after {pendingSuggestion.sourceOpName}
                </span>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPendingSuggestion(null)}
                    className="px-2 py-0.5 text-xs rounded border border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const op = allOperations?.find((o) => o.id === pendingSuggestion.suggestedOp.id);
                      if (op) addTreatment(op);
                      setPendingSuggestion(null);
                    }}
                    className="px-2 py-0.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Add {pendingSuggestion.suggestedOp.name}
                  </button>
                </div>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={treatmentSearch}
                onChange={(e) => setTreatmentSearch(e.target.value)}
                placeholder="Search treatments..."
                className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
              {filteredOperations.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {treatmentSearch ? "No treatments found" : "All treatments selected"}
                </div>
              ) : (
                filteredOperations.slice(0, 20).map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                    onClick={() => addTreatment(op)}
                  >
                    <span className="font-medium">{op.name}</span>
                    {op.category && (
                      <span className="ml-2 text-xs text-muted-foreground">{op.category}</span>
                    )}
                    {(op.stepCount ?? 0) > 1 && (
                      <span className="ml-2 text-xs text-muted-foreground">{op.stepCount} steps</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Case C: No templates, or follow-up without plan → section hidden entirely */}

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
      <div className="sticky bottom-0 z-20 -mx-4 px-4 md:-mx-6 md:px-6 py-3 bg-background/95 backdrop-blur-sm border-t shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex gap-2 justify-between items-center">
          <div>
            {existingReport && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    className="text-amber-700 border-amber-300 hover:bg-amber-50"
                  >
                    <Lock className="mr-1 h-3.5 w-3.5" />
                    Finalize
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Lock Clinical Notes?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Only an administrator can unlock them afterwards.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleFinalize}>
                      Yes, Lock Notes
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
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
              variant={isDoctor ? "outline" : "default"}
              size="sm"
              onClick={() => handleSave("detail")}
              disabled={isPending}
            >
              {isPending ? "Saving..." : "Save"}
            </Button>
            {isDoctor && (
              <Button
                onClick={() => handleSave("next")}
                disabled={isPending}
                size="sm"
              >
                {isPending ? "Saving..." : "Save & Next Patient"}
              </Button>
            )}
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

  if (!hasPreviousNotes) return <>{editableContent}{toothPanel}{prescriptionSheet}</>;
  return (
    <>
      {previousNotesMobile}
      <div className="hidden lg:grid lg:grid-cols-[380px_1fr] gap-6">
        {previousNotesDesktop}
        <div className="max-w-3xl">{editableContent}</div>
      </div>
      <div className="lg:hidden">{editableContent}</div>
      {toothPanel}
      {prescriptionSheet}
    </>
  );
}
