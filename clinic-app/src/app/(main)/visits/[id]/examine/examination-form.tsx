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
import { saveExamination } from "./actions";
import { toast } from "sonner";

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
  doctorId: number;
  reportDate: string;
  complaint: string | null;
  examination: string | null;
  diagnosis: string | null;
  treatmentNotes: string | null;
  estimate: string | null;
  medication: string | null;
};

export function ExaminationForm({
  visitId,
  doctors,
  defaultDoctorId,
  existingReport,
}: {
  visitId: number;
  doctors: { id: number; name: string }[];
  defaultDoctorId: number | null;
  existingReport: ExistingReport | null;
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

  async function handleSave(redirectTarget: "detail" | "print") {
    startTransition(async () => {
      try {
        await saveExamination(visitId, {
          doctorId: parseInt(doctorId),
          reportDate,
          complaint: complaint || null,
          examination: examination || null,
          diagnosis: diagnosis || null,
          treatmentNotes: treatmentNotes || null,
          estimate: estimate || null,
          medication: medication || null,
        });
        toast.success("Examination saved");
        if (redirectTarget === "print") {
          router.push(`/visits/${visitId}/examine/print`);
        } else {
          router.push(`/visits/${visitId}`);
        }
      } catch {
        toast.error("Failed to save examination");
      }
    });
  }

  return (
    <div className="space-y-4">
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

      <div className="flex gap-3 justify-end pt-2">
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
  );
}
