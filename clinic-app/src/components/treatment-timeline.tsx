"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Calendar, AlertTriangle, ChevronDown, ChevronRight, MessageSquarePlus, Lock, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { saveQuickNote } from "@/app/(main)/visits/[id]/examine/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Doctor color palette for visual distinction
const DOCTOR_COLORS = [
  "border-blue-400",
  "border-emerald-400",
  "border-purple-400",
  "border-orange-400",
  "border-pink-400",
  "border-cyan-400",
  "border-yellow-400",
  "border-red-400",
];

const DOCTOR_DOT_COLORS = [
  "bg-blue-400",
  "bg-emerald-400",
  "bg-purple-400",
  "bg-orange-400",
  "bg-pink-400",
  "bg-cyan-400",
  "bg-yellow-400",
  "bg-red-400",
];

type Addendum = {
  id: number;
  content: string;
  createdAt: Date;
  doctor: { name: string };
};

type ClinicalReport = {
  id: number;
  complaint: string | null;
  examination: string | null;
  diagnosis: string | null;
  treatmentNotes: string | null;
  medication: string | null;
  estimate: string | null;
  reportDate: Date;
  createdAt: Date;
  updatedAt: Date;
  lockedAt: Date | null;
  doctor: { name: string };
  addendums: Addendum[];
};

type FileRecord = {
  id: number;
  fileName: string | null;
  uploadedBy: { name: string } | null;
};

export type VisitWithRelations = {
  id: number;
  caseNo: number | null;
  visitDate: Date;
  visitType: string;
  parentVisitId: number | null;
  stepLabel: string | null;
  operationRate: number | null;
  discount: number;
  operation: { name: string } | null;
  doctor: { id?: number; name: string } | null;
  lab: { name: string } | null;
  labRateAmount: number;
  clinicalReports: ClinicalReport[];
  files: FileRecord[];
  followUps: VisitWithRelations[];
  receipts: { amount: number }[];
};

export type FollowUpContext = {
  rootVisitId: number;
  operationName: string;
  doctorId: number | null;
};

function QuickNoteForm({ visitId }: { visitId: number }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
      >
        Quick Note
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <Textarea
        placeholder="Add a quick note..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        className="text-sm"
        autoFocus
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          className="h-7 text-xs"
          disabled={isPending || !note.trim()}
          onClick={() => {
            startTransition(async () => {
              try {
                await saveQuickNote(visitId, note);
                toast.success("Note saved");
                setNote("");
                setOpen(false);
                router.refresh();
              } catch {
                toast.error("Failed to save note");
              }
            });
          }}
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setOpen(false); setNote(""); }}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ExpandableNotes({ report }: { report: ClinicalReport }) {
  const [expanded, setExpanded] = useState(false);
  const isEdited = new Date(report.updatedAt).getTime() - new Date(report.createdAt).getTime() > 60000;
  const isLocked = report.lockedAt !== null || (Date.now() - new Date(report.createdAt).getTime()) >= 24 * 60 * 60 * 1000;

  // Show a compact summary when collapsed
  const summaryText = report.treatmentNotes || report.diagnosis || report.complaint || "";
  const needsExpand = !!(report.complaint && report.examination) || !!(report.diagnosis && report.treatmentNotes);

  if (!needsExpand) {
    return (
      <div className="text-sm text-muted-foreground">
        {isLocked && <Lock className="h-3 w-3 inline mr-1 text-amber-500" />}
        <span>{summaryText.replace(/\s+/g, ' ').trim()}</span>
        {isEdited && <span className="text-xs ml-1">(edited)</span>}
      </div>
    );
  }

  const collapsedText = summaryText.replace(/\s+/g, ' ').trim();
  const truncated = collapsedText.length > 80 ? collapsedText.slice(0, 80) + "..." : collapsedText;

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-full text-left"
      >
        {isLocked && <Lock className="h-3 w-3 text-amber-500 shrink-0" />}
        {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
        <span className="truncate">{expanded ? collapsedText : truncated}</span>
      </button>
      {expanded && (
        <div className="bg-muted/30 rounded-md p-3 text-sm space-y-1.5 mt-1">
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
          {report.estimate && (
            <div><span className="text-muted-foreground font-medium">Estimate: </span><span className="whitespace-pre-wrap">{report.estimate}</span></div>
          )}
          <div className="text-xs text-muted-foreground text-right pt-1">
            Dr. {report.doctor.name} · {format(new Date(report.reportDate), "MMM d, yyyy")}
            {isEdited && " (edited)"}
          </div>
        </div>
      )}
    </div>
  );
}

/** Check if a chain is "active" — has balance due or latest visit missing notes */
function isChainActive(allVisits: VisitWithRelations[]): boolean {
  const totalBilled = allVisits.reduce((sum, v) => sum + (v.operationRate || 0) - v.discount, 0);
  const totalPaid = allVisits.reduce((sum, v) => sum + v.receipts.reduce((s, r) => s + r.amount, 0), 0);
  if (totalBilled - totalPaid > 0) return true;
  const latest = allVisits[allVisits.length - 1];
  if (latest && latest.clinicalReports.length === 0) return true;
  return false;
}

/** Check if chain should auto-expand */
function shouldAutoExpand(
  allVisits: VisitWithRelations[],
  activeVisitId?: number
): boolean {
  // If chain contains the active appointment's visit
  if (activeVisitId && allVisits.some(v => v.id === activeVisitId)) return true;
  // If any visit in chain is within last 14 days
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  if (allVisits.some(v => new Date(v.visitDate).getTime() > twoWeeksAgo)) return true;
  return false;
}

function FollowUpButton({
  rootVisit,
  patientId,
  onAddFollowUp,
}: {
  rootVisit: VisitWithRelations;
  patientId: number;
  onAddFollowUp?: (ctx: FollowUpContext) => void;
}) {
  if (onAddFollowUp) {
    return (
      <Button
        size="sm"
        variant="ghost"
        className="text-xs h-7"
        onClick={() => onAddFollowUp({
          rootVisitId: rootVisit.id,
          operationName: rootVisit.operation?.name || "Visit",
          doctorId: rootVisit.doctor?.id || null,
        })}
      >
        <Plus className="h-3 w-3 mr-1" />
        Follow-up
      </Button>
    );
  }
  return (
    <Button size="sm" variant="ghost" className="text-xs h-7" asChild>
      <Link href={`/visits/new?followUp=${rootVisit.id}&patientId=${patientId}`}>
        <Plus className="h-3 w-3 mr-1" />
        Follow-up
      </Link>
    </Button>
  );
}

function StandaloneVisitEntry({
  visit,
  showInternalCosts,
  patientId,
  onAddFollowUp,
}: {
  visit: VisitWithRelations;
  showInternalCosts: boolean;
  patientId: number;
  onAddFollowUp?: (ctx: FollowUpContext) => void;
}) {
  const router = useRouter();
  const report = visit.clinicalReports[0] || null;
  const rate = visit.operationRate || 0;

  const paid = visit.receipts.reduce((s, r) => s + r.amount, 0);
  const billed = rate - visit.discount;
  const due = billed - paid;

  return (
    <div className="py-4">
      <div className="rounded-lg border bg-card overflow-hidden">
        <div
          className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => router.push(`/visits/${visit.id}`)}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium min-w-0">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">
                {visit.stepLabel || visit.operation?.name || "Visit"}
              </span>
              <span className="text-muted-foreground shrink-0">·</span>
              <span className="shrink-0">{"\u20B9"}{rate.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
              {due > 0 ? (
                <Badge variant="destructive" className="text-xs">{"\u20B9"}{due.toLocaleString("en-IN")} due</Badge>
              ) : billed > 0 ? (
                <Badge variant="secondary" className="text-xs">Paid</Badge>
              ) : null}
              <FollowUpButton rootVisit={visit} patientId={patientId} onAddFollowUp={onAddFollowUp} />
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-1 ml-6">
            {format(new Date(visit.visitDate), "MMM d, yyyy")}
            <span> · Dr. {visit.doctor?.name || "N/A"}</span>
          </div>
        </div>
        {/* Notes section */}
        {report ? (
          <div className="border-t px-3 py-2">
            <ExpandableNotes report={report} />
            {report.addendums.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <MessageSquarePlus className="h-3 w-3" />
                {report.addendums.length} addendum{report.addendums.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        ) : (
          <div className="border-t px-3 py-2 flex items-center gap-2 text-sm">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-amber-600 text-xs">Notes not recorded</span>
            <QuickNoteForm visitId={visit.id} />
            <Link href={`/visits/${visit.id}/examine`} className="text-xs text-blue-600 hover:underline">
              Full Notes
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function ChainTimeline({
  rootVisit,
  showInternalCosts,
  patientId,
  activeVisitId,
  onAddFollowUp,
}: {
  rootVisit: VisitWithRelations;
  showInternalCosts: boolean;
  patientId: number;
  activeVisitId?: number;
  onAddFollowUp?: (ctx: FollowUpContext) => void;
}) {
  const router = useRouter();

  // Collect all visits in the chain
  const allVisits = [rootVisit, ...rootVisit.followUps].sort(
    (a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime()
  );

  const autoExpand = shouldAutoExpand(allVisits, activeVisitId);
  const [expanded, setExpanded] = useState(autoExpand);
  const active = isChainActive(allVisits);

  // Build doctor color map
  const uniqueDoctors = [...new Map(allVisits.filter(v => v.doctor).map(v => [v.doctor!.name, v.doctor!])).values()];
  const doctorColorMap = new Map<string, number>();
  uniqueDoctors.forEach((d, i) => doctorColorMap.set(d.name, i % DOCTOR_COLORS.length));

  // Calculate chain totals
  const totalBilled = allVisits.reduce((sum, v) => sum + (v.operationRate || 0) - v.discount, 0);
  const totalPaid = allVisits.reduce((sum, v) => sum + v.receipts.reduce((s, r) => s + r.amount, 0), 0);
  const totalDue = totalBilled - totalPaid;

  // Date range for collapsed view
  const firstDate = format(new Date(allVisits[0].visitDate), "MMM d");
  const lastDate = format(new Date(allVisits[allVisits.length - 1].visitDate), "MMM d, yyyy");

  return (
    <div className="py-4">
      {/* Chain card — active chains get left border accent */}
      <div className={`rounded-lg border bg-card overflow-hidden ${active ? "border-l-2 border-l-primary" : ""}`}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left p-3 hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium min-w-0">
              {expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
              <span className="truncate">{rootVisit.operation?.name || "Treatment"}</span>
              <span className="text-muted-foreground shrink-0">·</span>
              <span className="text-muted-foreground shrink-0">{allVisits.length} visits</span>
            </div>
            {totalDue > 0 ? (
              <Badge variant="destructive" className="text-xs shrink-0">{"\u20B9"}{totalDue.toLocaleString("en-IN")} due</Badge>
            ) : totalBilled > 0 ? (
              <Badge variant="secondary" className="text-xs shrink-0">Paid</Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-2 mt-1 ml-6 text-xs text-muted-foreground">
            <span>{firstDate} — {lastDate}</span>
            <span>·</span>
            <span>{"\u20B9"}{totalBilled.toLocaleString("en-IN")} billed</span>
            <span>·</span>
            {uniqueDoctors.map((d) => (
              <span key={d.name} className="flex items-center gap-1">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${DOCTOR_DOT_COLORS[doctorColorMap.get(d.name) || 0]}`} />
                Dr. {d.name}
              </span>
            ))}
          </div>
        </button>

        {/* Expanded: visit timeline + follow-up button */}
        {expanded && (
          <div className="border-t">
            <div className="relative pl-8 pr-3 pt-3 pb-1">
              {allVisits.map((visit, i) => {
                const isLast = i === allVisits.length - 1;
                const report = visit.clinicalReports[0] || null;
                const rate = visit.operationRate || 0;
                const colorIdx = visit.doctor ? (doctorColorMap.get(visit.doctor.name) || 0) : 0;

                return (
                  <div key={visit.id} className="relative pb-3">
                    {/* Timeline connector line */}
                    {!isLast && (
                      <div className={`absolute left-[-17px] top-3 bottom-0 w-0.5 ${DOCTOR_COLORS[colorIdx].replace("border-", "bg-")}`} />
                    )}
                    {/* Dot */}
                    <div className={`absolute left-[-20px] top-1.5 w-2 h-2 rounded-full ${DOCTOR_DOT_COLORS[colorIdx]} ring-2 ring-background`} />

                    {/* Visit content — clickable */}
                    <div
                      className="pl-1 cursor-pointer hover:bg-accent/30 rounded-md -ml-1 px-1 transition-colors"
                      onClick={() => router.push(`/visits/${visit.id}`)}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          <span className="font-medium">{format(new Date(visit.visitDate), "MMM d")}</span>
                          <span className="text-muted-foreground">—</span>
                          <span className="font-medium">
                            {visit.stepLabel || visit.operation?.name || "Visit"}
                          </span>
                          <span className="tabular-nums">{"\u20B9"}{rate.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Dr. {visit.doctor?.name || "N/A"}
                        {showInternalCosts && visit.lab && <span> · Lab: {visit.lab.name} {"\u20B9"}{visit.labRateAmount.toLocaleString("en-IN")}</span>}
                      </div>

                      {/* Notes or missing indicator */}
                      <div className="mt-1.5">
                        {report ? (
                          <div className="bg-muted/20 rounded px-2.5 py-1.5">
                            <ExpandableNotes report={report} />
                            {report.addendums.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <MessageSquarePlus className="h-3 w-3" />
                                {report.addendums.length} addendum{report.addendums.length !== 1 ? "s" : ""}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm mt-1" onClick={(e) => e.stopPropagation()}>
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            <span className="text-amber-600 text-xs">Notes not recorded</span>
                            <QuickNoteForm visitId={visit.id} />
                            <Link href={`/visits/${visit.id}/examine`} className="text-xs text-blue-600 hover:underline">
                              Full Notes
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t px-3 py-2 flex justify-end">
              <FollowUpButton rootVisit={rootVisit} patientId={patientId} onAddFollowUp={onAddFollowUp} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function TreatmentTimeline({
  visits,
  showInternalCosts,
  patientId,
  activeVisitId,
  onAddFollowUp,
}: {
  visits: VisitWithRelations[];
  showInternalCosts: boolean;
  patientId: number;
  activeVisitId?: number;
  onAddFollowUp?: (ctx: FollowUpContext) => void;
}) {
  if (visits.length === 0) {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-muted-foreground">No visits recorded</p>
        <Button size="sm" variant="outline" asChild>
          <Link href={`/visits/new?patientId=${patientId}`}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Record First Visit
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {visits.map((visit) => {
        const hasFollowUps = visit.followUps && visit.followUps.length > 0;

        if (hasFollowUps) {
          return (
            <ChainTimeline
              key={visit.id}
              rootVisit={visit}
              showInternalCosts={showInternalCosts}
              patientId={patientId}
              activeVisitId={activeVisitId}
              onAddFollowUp={onAddFollowUp}
            />
          );
        }

        return (
          <StandaloneVisitEntry
            key={visit.id}
            visit={visit}
            showInternalCosts={showInternalCosts}
            patientId={patientId}
            onAddFollowUp={onAddFollowUp}
          />
        );
      })}
    </div>
  );
}
