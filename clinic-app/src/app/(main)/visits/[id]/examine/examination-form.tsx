"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { saveExamination, finalizeReport, unlockReport, addAddendum } from "./actions";
import { updateAppointmentStatus } from "@/app/(main)/appointments/actions";
import { toast } from "sonner";
import { Lock, Unlock, Clock, MessageSquarePlus } from "lucide-react";
import { format } from "date-fns";

const COMMON_COMPLAINTS = [
  "PAIN",
  "SWELLING",
  "SENSITIVITY",
  "BROKEN TOOTH",
  "BLEEDING GUMS",
  "LOOSE TOOTH",
  "BAD BREATH",
  "DISCOLORATION",
  "SPACING",
  "DIFFICULTY CHEWING",
  "JAW PAIN",
  "REGULAR CHECKUP",
  "REFERRED BY DOCTOR",
  "FOLLOW UP",
  "ORTHODONTIC CONSULTATION",
  "OTHER",
];

type ExistingReport = {
  id: number;
  doctorId: number;
  reportDate: string;
  complaint: string | null;
  examination: string | null;
  diagnosis: string | null;
  treatmentNotes: string | null;
  estimate: string | null;
  medication: string | null;
};

type Addendum = {
  id: number;
  content: string;
  createdAt: string;
  doctorName: string;
};

export function ExaminationForm({
  visitId,
  doctors,
  defaultDoctorId,
  existingReport,
  isLocked,
  canUnlock,
  hoursUntilLock,
  reportId,
  addendums,
  lockedByName,
  lockedAt,
}: {
  visitId: number;
  doctors: { id: number; name: string }[];
  defaultDoctorId: number | null;
  existingReport: ExistingReport | null;
  isLocked: boolean;
  canUnlock: boolean;
  hoursUntilLock: number;
  reportId: number | null;
  addendums: Addendum[];
  lockedByName: string | null;
  lockedAt: string | null;
}) {
  const { doctor: currentDoctor } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [doctorId, setDoctorId] = useState(
    String(existingReport?.doctorId || defaultDoctorId || currentDoctor.id)
  );
  const [reportDate, setReportDate] = useState(
    existingReport?.reportDate || new Date().toISOString().split("T")[0]
  );
  const [complaint, setComplaint] = useState(existingReport?.complaint || "");
  const [examination, setExamination] = useState(existingReport?.examination || "");
  const [diagnosis, setDiagnosis] = useState(existingReport?.diagnosis || "");
  const [treatmentNotes, setTreatmentNotes] = useState(existingReport?.treatmentNotes || "");
  const [estimate, setEstimate] = useState(existingReport?.estimate || "");
  const [medication, setMedication] = useState(existingReport?.medication || "");
  const [addendumText, setAddendumText] = useState("");

  async function handleSave(redirectTarget: "detail" | "print") {
    startTransition(async () => {
      try {
        const result = await saveExamination(visitId, {
          doctorId: parseInt(doctorId),
          reportDate,
          complaint: complaint || null,
          examination: examination || null,
          diagnosis: diagnosis || null,
          treatmentNotes: treatmentNotes || null,
          estimate: estimate || null,
          medication: medication || null,
        });
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
        } else {
          toast.success("Examination saved");
        }
        if (redirectTarget === "print") {
          router.push(`/visits/${visitId}/examine/print`);
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
        toast.success("Addendum added");
        setAddendumText("");
        router.refresh();
      } catch {
        toast.error("Failed to add addendum");
      }
    });
  }

  // Locked state: show read-only view
  if (isLocked && existingReport) {
    return (
      <div className="space-y-4">
        {/* Lock banner */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Notes locked
                {lockedAt && ` on ${format(new Date(lockedAt), "MMM d, yyyy 'at' h:mm a")}`}
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

        {/* Read-only display */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Clinical Notes (Read-only)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="text-xs text-muted-foreground">
              By Dr. {doctors.find(d => d.id === existingReport.doctorId)?.name} · {existingReport.reportDate}
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
            {existingReport.estimate && (
              <div><span className="text-muted-foreground font-medium">Estimate: </span><span className="whitespace-pre-wrap">{existingReport.estimate}</span></div>
            )}
            {existingReport.medication && (
              <div><span className="text-muted-foreground font-medium">Medication: </span><span className="whitespace-pre-wrap">{existingReport.medication}</span></div>
            )}
          </CardContent>
        </Card>

        {/* Existing addendums */}
        {addendums.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Addendums ({addendums.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {addendums.map((a) => (
                <div key={a.id} className="rounded-md border p-3 text-sm">
                  <div className="whitespace-pre-wrap">{a.content}</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Dr. {a.doctorName} · {format(new Date(a.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Add addendum form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquarePlus className="h-4 w-4" />
              Add Addendum
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
                {isPending ? "Adding..." : "Add Addendum"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Editable form (no report or unlocked)
  return (
    <div className="space-y-4">
      {/* Auto-lock warning */}
      {existingReport && hoursUntilLock > 0 && hoursUntilLock < 24 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-3">
          <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
            <Clock className="h-4 w-4" />
            <span>
              Locks automatically in {hoursUntilLock < 1
                ? `${Math.round(hoursUntilLock * 60)} minutes`
                : `${Math.round(hoursUntilLock)} hours`
              }
            </span>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Doctor</Label>
          <Select value={doctorId} onValueChange={setDoctorId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {doctors.map((doc) => (
                <SelectItem key={doc.id} value={String(doc.id)}>
                  {doc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Report Date</Label>
          <Input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Chief Complaint</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {COMMON_COMPLAINTS.map((c) => (
              <button
                key={c}
                type="button"
                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                  complaint.toUpperCase().includes(c)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-accent"
                }`}
                onClick={() => {
                  if (!complaint) {
                    setComplaint(c);
                  } else if (!complaint.toUpperCase().includes(c)) {
                    setComplaint(complaint + ", " + c);
                  }
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Describe the chief complaint..."
            value={complaint}
            onChange={(e) => setComplaint(e.target.value)}
            rows={2}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Examination Findings</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Record examination findings..."
            value={examination}
            onChange={(e) => setExamination(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Diagnosis</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Enter diagnosis..."
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            rows={2}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Treatment Plan / Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Enter treatment plan..."
            value={treatmentNotes}
            onChange={(e) => setTreatmentNotes(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Estimate</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Enter cost estimate..."
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
            rows={2}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Medication Prescribed</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Enter prescribed medication..."
            value={medication}
            onChange={(e) => setMedication(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Existing addendums */}
      {addendums.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Addendums ({addendums.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {addendums.map((a) => (
              <div key={a.id} className="rounded-md border p-3 text-sm">
                <div className="whitespace-pre-wrap">{a.content}</div>
                <div className="text-xs text-muted-foreground mt-2">
                  Dr. {a.doctorName} · {format(new Date(a.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 justify-between pt-2">
        <div>
          {existingReport && (
            <Button
              variant="outline"
              onClick={handleFinalize}
              disabled={isPending}
              className="text-amber-700 border-amber-300 hover:bg-amber-50"
            >
              <Lock className="mr-1 h-3.5 w-3.5" />
              Finalize Notes
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => handleSave("detail")}
            disabled={isPending}
          >
            {isPending ? "Saving..." : "Save Examination"}
          </Button>
          <Button
            onClick={() => handleSave("print")}
            disabled={isPending}
          >
            {isPending ? "Saving..." : "Save & Print"}
          </Button>
        </div>
      </div>
    </div>
  );
}
