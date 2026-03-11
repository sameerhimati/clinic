"use client";

import { useState, useTransition, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { saveExamination, finalizeReport, unlockReport, addAddendum, getNextArrivedAppointment } from "./actions";
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
import { Lock, Unlock, Clock, MessageSquarePlus, Printer, ChevronDown, ChevronUp, FileText, ToggleLeft, ToggleRight, AlertTriangle, ImageIcon, X, ZoomIn, Download, Pill, StickyNote } from "lucide-react";
import { PrescriptionSheet } from "@/components/prescription-sheet";
import { ToothChart, type ToothStatusData } from "@/components/tooth-chart";
import { ToothDetailPanel, type ToothUpdate, type ToothFindingOption } from "@/components/tooth-detail-panel";
import { TOOTH_STATUSES, TOOTH_STATUS_INDICATORS, getStatusColor, type ToothStatusKey } from "@/lib/dental";
import { WorkDoneCard, type WorkDoneEntry } from "@/components/work-done-card";
import { completePlanItems } from "@/app/(main)/patients/[id]/plan/actions";
import { format } from "date-fns";
import { toTitleCase, formatDateTime } from "@/lib/format";
import { CheckCircle2, Circle } from "lucide-react";
import { ClinicalNotepad, type NoteEntry, type ChainOption } from "@/components/clinical-notepad";

type PreviousReport = {
  visitId: number;
  caseNo: number | null;
  stepLabel: string | null;
  operationName: string | null;
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
  "Pain",
  "Swelling",
  "Sensitivity",
  "Broken Tooth",
  "Bleeding Gums",
  "Regular Checkup",
];

const MORE_COMPLAINTS = [
  "Loose Tooth",
  "Bad Breath",
  "Discoloration",
  "Spacing",
  "Difficulty Chewing",
  "Jaw Pain",
  "Referred By Doctor",
  "Follow Up",
  "Orthodontic Consultation",
  "Other",
];

const TOP_DIAGNOSES = [
  "Dental Caries",
  "Pulpitis",
  "Periapical Abscess",
  "Gingivitis",
  "Periodontitis",
  "Fractured Tooth",
];

const MORE_DIAGNOSES = [
  "Impacted Tooth",
  "Malocclusion",
  "Temporomandibular Disorder",
  "Oral Ulcer",
  "Root Stump",
  "Attrition",
  "Dental Fluorosis",
  "Pericoronitis",
  "Calculus",
  "Tooth Erosion",
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
            {report.operationName || report.stepLabel || "Visit"}
            {report.operationName && report.stepLabel && (
              <span className="text-muted-foreground font-normal"> — {report.stepLabel}</span>
            )}
          </span>
          <div className="text-muted-foreground">
            Dr. {report.doctorName} · {report.reportDate}
            {report.caseNo && <span> · Case #{report.caseNo}</span>}
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
          <h3 className="font-semibold text-sm">Patient History</h3>
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

function QuickPills({
  label,
  value,
  onChange,
  topItems,
  moreItems,
  uppercase = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  topItems: string[];
  moreItems: string[];
  uppercase?: boolean;
}) {
  const [showMore, setShowMore] = useState(false);
  const normalize = (s: string) => uppercase ? s.toUpperCase() : s.toLowerCase();
  const selectedParts = value.split(",").map(s => s.trim()).filter(Boolean);
  const normalizedSelected = selectedParts.map(normalize);
  const hasMoreSelected = moreItems.some(c => normalizedSelected.includes(normalize(c)));
  const visibleItems = (showMore || hasMoreSelected) ? [...topItems, ...moreItems] : topItems;

  const toggle = (item: string) => {
    const parts = value.split(",").map(s => s.trim()).filter(Boolean);
    const normed = parts.map(normalize);
    if (normed.includes(normalize(item))) {
      onChange(parts.filter((_, i) => normed[i] !== normalize(item)).join(", "));
    } else {
      onChange(value ? value + ", " + item : item);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {visibleItems.map((c) => (
          <button
            key={c}
            type="button"
            className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
              normalizedSelected.includes(normalize(c))
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
            More...
          </button>
        )}
      </div>
      <Textarea
        placeholder={`Type or select ${label.toLowerCase()}...`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="text-sm"
      />
    </div>
  );
}

function ComplaintPills({ complaint, setComplaint }: { complaint: string; setComplaint: (v: string) => void }) {
  const [showMore, setShowMore] = useState(false);
  const selectedParts = complaint.toUpperCase().split(",").map(s => s.trim()).filter(Boolean);
  // Auto-expand if any MORE_COMPLAINTS are already selected
  const hasMoreSelected = MORE_COMPLAINTS.some(c => selectedParts.includes(c.toUpperCase()));
  const visibleComplaints = (showMore || hasMoreSelected) ? [...TOP_COMPLAINTS, ...MORE_COMPLAINTS] : TOP_COMPLAINTS;

  const toggle = (c: string) => {
    const parts = complaint.split(",").map(s => s.trim()).filter(Boolean);
    const upperParts = parts.map(s => s.toUpperCase());
    if (upperParts.includes(c.toUpperCase())) {
      setComplaint(parts.filter((_, i) => upperParts[i] !== c.toUpperCase()).join(", "));
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
              selectedParts.includes(c.toUpperCase())
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
  onRecordWorkDone,
}: {
  selected: number[];
  onApply: (status: string) => void;
  onClear: () => void;
  onDetails: () => void;
  onRecordWorkDone?: () => void;
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
          <span style={{ color }} className="text-xs">{indicator}</span>
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
      {onRecordWorkDone && (
        <button
          type="button"
          onClick={onRecordWorkDone}
          className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 cursor-pointer"
        >
          Record Work Done
        </button>
      )}
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
  const [workDoneNotes, setWorkDoneNotes] = useState("");
  const workDoneRef = useRef<HTMLDivElement>(null);

  // Prescription sheet state
  const [rxSheetOpen, setRxSheetOpen] = useState(false);

  // Quick note state
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const [quickNote, setQuickNote] = useState("");

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
    const selectedTeeth = [...teethSelected];
    setToothUpdates((prev) => {
      const next = new Map(prev);
      for (const tooth of selectedTeeth) {
        if (status === "HEALTHY") {
          next.delete(tooth);
        } else {
          const existing = next.get(tooth);
          next.set(tooth, { toothNumber: tooth, status, findingId: existing?.findingId, notes: existing?.notes });
        }
      }
      return next;
    });
    // Auto-append tooth findings to treatment notes
    if (status !== "HEALTHY" && selectedTeeth.length > 0) {
      const statusLabel = TOOTH_STATUSES[status as ToothStatusKey]?.label || status;
      const lines = selectedTeeth.map((t) => `${t} -- ${statusLabel}`).join("\n");
      setTreatmentNotes((prev) => prev ? `${prev}\n${lines}` : lines);
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

  // Tooth → Work Done shortcut: scroll to work done card and pre-fill teeth
  function handleToothToWorkDone() {
    if (workDoneRef.current) {
      workDoneRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
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

  // Express mode for follow-ups without existing reports, Full mode otherwise
  // Express renders: plan progress + compact chart + work done + brief note
  const isExpressCandidate = isFollowUp && !existingReport;
  const [viewMode, setViewMode] = useState<"express" | "full">(isExpressCandidate ? "express" : "full");

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
      workDoneEntries.length > 0 || workDoneNotes !== "";
  }, [complaint, examination, diagnosis, treatmentNotes, estimate, teethSelected, workDoneEntries, workDoneNotes]);

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
    }, 5000); // Save every 5s of idle
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
  const hasPreviousNotes = previousReports && previousReports.length > 0;
  const hasFiles = patientFiles && patientFiles.length > 0;
  const [mobileNotesOpen, setMobileNotesOpen] = useState(true);
  const [filesCollapsed, setFilesCollapsed] = useState(true);



  async function handleSave(redirectTarget: "detail" | "print" | "next" | "stay") {
    startTransition(async () => {
      try {
        clearDraft();
        const result = await saveExamination(visitId, {
          doctorId,
          reportDate,
          complaint: complaint || null,
          examination: examination || null,
          diagnosis: diagnosis || null,
          treatmentNotes: [treatmentNotes, workDoneNotes].filter(Boolean).join("\n\n") || null,
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

        // Escrow deficit warning
        if (result?.escrowDeficitWarning) {
          toast.warning(`Patient escrow is now -₹${Math.abs(result.escrowNewBalance).toLocaleString("en-IN")}. Inform reception to collect.`, { duration: 10000 });
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
        } else if (!matchingPlanItem) {
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

  // BDS Recommendation — most recent report for consultants
  const lastBdsReport = (permissionLevel === 4 && previousReports && previousReports.length > 0) ? previousReports[0] : null;

  // Editable form — polished cards matching patient/visit form patterns
  const editableContent = (
    <div className="space-y-6 pb-24">
      {/* BDS Recommendation Banner — for consultants */}
      {lastBdsReport && (
        <Card className="border-blue-300 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-blue-800">
              <FileText className="h-4 w-4" />
              BDS Recommendation — Dr. {lastBdsReport.doctorName}, {lastBdsReport.reportDate}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {lastBdsReport.diagnosis && (
              <div>
                <span className="text-blue-700 font-medium">Diagnosis: </span>
                <span className="whitespace-pre-wrap">{lastBdsReport.diagnosis}</span>
              </div>
            )}
            {lastBdsReport.treatmentNotes && (
              <div>
                <span className="text-blue-700 font-medium">Treatment Notes: </span>
                <span className="whitespace-pre-wrap">{lastBdsReport.treatmentNotes}</span>
              </div>
            )}
            {lastBdsReport.complaint && !lastBdsReport.diagnosis && !lastBdsReport.treatmentNotes && (
              <div>
                <span className="text-blue-700 font-medium">Complaint: </span>
                <span className="whitespace-pre-wrap">{lastBdsReport.complaint}</span>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                if (lastBdsReport.diagnosis) setDiagnosis(lastBdsReport.diagnosis);
                if (lastBdsReport.treatmentNotes) setTreatmentNotes(lastBdsReport.treatmentNotes);
                toast.success("Previous notes copied — edit as needed");
              }}
            >
              Copy to Notes
            </Button>
          </CardContent>
        </Card>
      )}

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
        <div className="inline-flex items-center rounded-md border text-xs">
          <button
            type="button"
            onClick={() => setViewMode("express")}
            className={`px-2.5 py-1 rounded-l-md transition-colors ${viewMode === "express" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
          >
            Express
          </button>
          <button
            type="button"
            onClick={() => setViewMode("full")}
            className={`px-2.5 py-1 rounded-r-md transition-colors ${viewMode === "full" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
          >
            Full
          </button>
        </div>
      </div>

      {viewMode === "express" ? (
        /* Express Mode: Compact chart + Work Done + Brief note */
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Follow-up Notes</CardTitle>
          </CardHeader>
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
              {!readOnly && !isLocked && <ToothApplyBar selected={teethSelected} onApply={handleBatchApply} onClear={() => setTeethSelected([])} onDetails={() => { if (teethSelected.length > 0) { setDetailTooth(teethSelected[0]); setDetailOpen(true); } }} onRecordWorkDone={isDoctor ? handleToothToWorkDone : undefined} />}
            </div>

            <div className="space-y-1.5">
              <Label>Brief Follow-up Note</Label>
              <Textarea
                placeholder="Quick follow-up note..."
                value={treatmentNotes}
                onChange={(e) => setTreatmentNotes(e.target.value)}
                rows={3}
                autoFocus
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Full Mode: Complaint pills → Tooth chart → Single notes */
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clinical Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ComplaintPills complaint={complaint} setComplaint={setComplaint} />

            <QuickPills
              label="Diagnosis"
              value={diagnosis}
              onChange={setDiagnosis}
              topItems={TOP_DIAGNOSES}
              moreItems={MORE_DIAGNOSES}
            />

            <div className="space-y-1.5">
              <Label>Teeth {toothUpdates.size > 0 && <span className="text-xs text-muted-foreground ml-1">({toothUpdates.size} updated)</span>}</Label>
              <ToothChart
                selected={teethSelected}
                onChange={!readOnly && !isLocked ? setTeethSelected : undefined}
                toothStatuses={mergedToothStatuses}
                onDoubleClick={!readOnly && !isLocked ? handleToothDoubleClick : undefined}
                readOnly={readOnly || isLocked}
              />
              {!readOnly && !isLocked && <ToothApplyBar selected={teethSelected} onApply={handleBatchApply} onClear={() => setTeethSelected([])} onDetails={() => { if (teethSelected.length > 0) { setDetailTooth(teethSelected[0]); setDetailOpen(true); } }} onRecordWorkDone={isDoctor ? handleToothToWorkDone : undefined} />}
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
      )}

      {/* Clinical Notepad — patient-level running notes */}
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

      {/* Work Done — between notes and treatment plan */}
      {isDoctor && (
        <div ref={workDoneRef}>
        <WorkDoneCard
          entries={workDoneEntries}
          onAdd={handleAddWorkDone}
          onRemove={handleRemoveWorkDone}
          onEditTeeth={(teeth) => setTeethSelected(teeth)}
          selectedTeeth={teethSelected}
          allOperations={allOperations || []}
          activePlanItems={activePlanItemsForWorkDone}
          freeNotes={workDoneNotes}
          onFreeNotesChange={setWorkDoneNotes}
        />
        </div>
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

      {/* Case B removed — treatment plans are created on the patient page, not during exam */}
      {/* Case D removed — consultation plans are created on the patient page */}

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
      <div className="sticky bottom-0 z-20 -mx-4 px-4 md:-mx-6 md:px-6 bg-background/95 backdrop-blur-sm border-t shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        {quickNoteOpen && (
          <div className="pt-3 pb-1 border-b">
            <div className="flex gap-2">
              <Textarea
                placeholder="Quick note... (auto-timestamped)"
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                rows={2}
                className="text-sm resize-none flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && quickNote.trim()) {
                    const time = format(new Date(), "HH:mm");
                    const stamped = `[${time}] ${quickNote.trim()}`;
                    setTreatmentNotes((prev) => prev ? `${prev}\n${stamped}` : stamped);
                    setQuickNote("");
                    setQuickNoteOpen(false);
                    toast.success("Note added");
                  }
                }}
              />
              <Button
                size="sm"
                disabled={!quickNote.trim()}
                onClick={() => {
                  const time = format(new Date(), "HH:mm");
                  const stamped = `[${time}] ${quickNote.trim()}`;
                  setTreatmentNotes((prev) => prev ? `${prev}\n${stamped}` : stamped);
                  setQuickNote("");
                  setQuickNoteOpen(false);
                  toast.success("Note added");
                }}
              >
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Press ⌘+Enter to add · Appends to treatment notes</p>
          </div>
        )}
        <div className="py-3 flex gap-2 justify-between items-center">
          <div className="flex gap-2">
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
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickNoteOpen((v) => !v)}
                className={quickNoteOpen ? "bg-accent" : ""}
              >
                <StickyNote className="mr-1 h-3.5 w-3.5" />
                Note
              </Button>
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
              variant="outline"
              size="sm"
              onClick={() => handleSave("stay")}
              disabled={isPending}
            >
              {isPending ? "Saving..." : "Save"}
            </Button>
            <Button
              variant={isDoctor ? "outline" : "default"}
              size="sm"
              onClick={() => handleSave("detail")}
              disabled={isPending}
            >
              {isPending ? "Saving..." : "Save & Close"}
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
