"use client";

import { useState, useTransition, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { saveExamination, finalizeReport, unlockReport, addAddendum } from "./actions";
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
import { Lock, Unlock, Clock, MessageSquarePlus, Printer } from "lucide-react";
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
  doctorName: string;
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
  patientId,
  defaultDoctorId,
  defaultDoctorName,
  existingReport,
  isLocked,
  canUnlock,
  hoursUntilLock,
  reportId,
  addendums,
  lockedByName,
  lockedAt,
  permissionLevel,
  nextPatientId,
  nextPatientCode,
}: {
  visitId: number;
  patientId?: number;
  defaultDoctorId: number | null;
  defaultDoctorName: string | null;
  existingReport: ExistingReport | null;
  isLocked: boolean;
  canUnlock: boolean;
  hoursUntilLock: number;
  reportId: number | null;
  addendums: Addendum[];
  lockedByName: string | null;
  lockedAt: string | null;
  permissionLevel?: number;
  nextPatientId?: number | null;
  nextPatientCode?: number | null;
}) {
  const { doctor: currentDoctor } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Auto-set doctor: use existing report's doctor, then visit's doctor, then current user
  const doctorId = existingReport?.doctorId || defaultDoctorId || currentDoctor.id;
  const doctorName = existingReport?.doctorName || defaultDoctorName || currentDoctor.name;

  // Auto-set report date: preserve existing, default to today for new (local time)
  const reportDate = existingReport?.reportDate || format(new Date(), "yyyy-MM-dd");

  const [complaint, setComplaint] = useState(existingReport?.complaint || "");
  const [examination, setExamination] = useState(existingReport?.examination || "");
  const [diagnosis, setDiagnosis] = useState(existingReport?.diagnosis || "");
  const [treatmentNotes, setTreatmentNotes] = useState(existingReport?.treatmentNotes || "");
  const [estimate, setEstimate] = useState(existingReport?.estimate || "");
  const [medication, setMedication] = useState(existingReport?.medication || "");
  const [addendumText, setAddendumText] = useState("");

  // Track dirty state for beforeunload warning
  const savedRef = useRef({
    complaint: existingReport?.complaint || "",
    examination: existingReport?.examination || "",
    diagnosis: existingReport?.diagnosis || "",
    treatmentNotes: existingReport?.treatmentNotes || "",
    estimate: existingReport?.estimate || "",
    medication: existingReport?.medication || "",
  });

  const isDirty = useCallback(() => {
    const s = savedRef.current;
    return complaint !== s.complaint || examination !== s.examination ||
      diagnosis !== s.diagnosis || treatmentNotes !== s.treatmentNotes ||
      estimate !== s.estimate || medication !== s.medication;
  }, [complaint, examination, diagnosis, treatmentNotes, estimate, medication]);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty()) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const isDoctor = permissionLevel === 3;

  async function handleSave(redirectTarget: "detail" | "print" | "next-patient") {
    startTransition(async () => {
      try {
        const result = await saveExamination(visitId, {
          doctorId,
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
        } else if (redirectTarget === "next-patient" && nextPatientId) {
          router.push(`/patients/${nextPatientId}`);
        } else if (isDoctor && patientId) {
          // Doctors go to patient page instead of visit detail
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

  // Locked state: show read-only view
  if (isLocked && existingReport) {
    return (
      <div className="space-y-4">
        {/* Lock banner */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
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

        {/* Existing addendums */}
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
                    Dr. {a.doctorName} {"\u00b7"} {format(new Date(a.createdAt), "MMM d, yyyy 'at' h:mm a")}
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
      </div>
    );
  }

  // Editable form — consolidated into 2 cards with sticky save bar
  return (
    <div className="space-y-4 pb-20">
      {/* Auto-lock warning */}
      {existingReport && hoursUntilLock > 0 && hoursUntilLock < 24 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <Clock className="h-4 w-4" />
            <span>
              Locks automatically in {hoursUntilLock < 1
                ? `${Math.round(hoursUntilLock * 60)} minutes`
                : `${Math.round(hoursUntilLock)} ${Math.round(hoursUntilLock) === 1 ? "hour" : "hours"}`
              }
            </span>
          </div>
        </div>
      )}

      {/* Doctor info (read-only) */}
      <div className="text-sm text-muted-foreground">
        Recording as <span className="font-medium text-foreground">Dr. {doctorName}</span>
        {" \u00b7 "}{reportDate}
      </div>

      {/* Card 1: Clinical Assessment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Clinical Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Chief Complaint</Label>
            <div className="flex flex-wrap gap-1">
              {COMMON_COMPLAINTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                    complaint.toUpperCase().split(",").map(s => s.trim()).includes(c)
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted hover:bg-accent"
                  }`}
                  onClick={() => {
                    const parts = complaint.split(",").map(s => s.trim()).filter(Boolean);
                    const upperParts = parts.map(s => s.toUpperCase());
                    if (upperParts.includes(c)) {
                      // Deselect: remove this complaint
                      setComplaint(parts.filter((_, i) => upperParts[i] !== c).join(", "));
                    } else {
                      setComplaint(complaint ? complaint + ", " + c : c);
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
          </div>

          <div className="space-y-2">
            <Label>Examination Findings</Label>
            <Textarea
              placeholder="Record examination findings..."
              value={examination}
              onChange={(e) => setExamination(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
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

      {/* Card 2: Treatment & Prescription */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Treatment & Prescription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Treatment Plan / Recommendations</Label>
            <Textarea
              placeholder="Enter treatment plan..."
              value={treatmentNotes}
              onChange={(e) => setTreatmentNotes(e.target.value)}
              rows={4}
            />
          </div>

          {(!permissionLevel || permissionLevel <= 2) && (
            <div className="space-y-2">
              <Label>Estimate</Label>
              <Textarea
                placeholder="Enter cost estimate..."
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                rows={2}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Medication Prescribed</Label>
            <Textarea
              placeholder="Enter prescribed medication..."
              value={medication}
              onChange={(e) => setMedication(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Existing addendums */}
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
                  Dr. {a.doctorName} {"\u00b7"} {format(new Date(a.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Sticky save bar */}
      <div className="sticky bottom-0 bg-card/95 backdrop-blur-sm border-t -mx-4 px-4 md:-mx-6 md:px-6 py-3 flex gap-3 justify-between items-center z-20">
        <div>
          {existingReport && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
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
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => handleSave("print")}
            disabled={isPending}
          >
            <Printer className="mr-1 h-3.5 w-3.5" />
            Print
          </Button>
          <Button
            onClick={() => handleSave("detail")}
            disabled={isPending}
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
          {nextPatientId && (
            <Button
              onClick={() => handleSave("next-patient")}
              disabled={isPending}
              variant="default"
            >
              {isPending ? "Saving..." : `Save & Next → #${nextPatientCode || ""}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
