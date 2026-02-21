import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Calendar, Paperclip, GitBranch } from "lucide-react";

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
  doctor: { name: string };
};

type FileRecord = {
  id: number;
  fileName: string | null;
  uploadedBy: { name: string } | null;
};

type VisitWithRelations = {
  id: number;
  caseNo: number | null;
  visitDate: Date;
  visitType: string;
  parentVisitId: number | null;
  operationRate: number | null;
  discount: number;
  operation: { name: string } | null;
  doctor: { name: string } | null;
  clinicalReports: ClinicalReport[];
  files: FileRecord[];
  followUps: VisitWithRelations[];
  receipts: { amount: number }[];
};

function VisitClinicalNotes({ report }: { report: ClinicalReport }) {
  const isEdited = new Date(report.updatedAt).getTime() - new Date(report.createdAt).getTime() > 60000;
  return (
    <div className="bg-muted/30 rounded-md p-3 text-sm space-y-1.5">
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
        Noted by Dr. {report.doctor.name} · {format(new Date(report.reportDate), "MMM d, yyyy")}
        {isEdited && " (edited)"}
      </div>
    </div>
  );
}

function VisitEntry({
  visit,
  showPayments,
  patientId,
  isFollowUp = false,
}: {
  visit: VisitWithRelations;
  showPayments: boolean;
  patientId: number;
  isFollowUp?: boolean;
}) {
  const report = visit.clinicalReports[0] || null;
  const rate = visit.operationRate || 0;

  return (
    <div className={isFollowUp ? "ml-6 pl-4 border-l-2 border-muted-foreground/20 py-2" : "py-4"}>
      {/* Visit header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm flex-wrap">
          {isFollowUp ? (
            <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <Calendar className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium">
            {format(new Date(visit.visitDate), "MMM d, yyyy")}
          </span>
          <span className="text-muted-foreground">—</span>
          <Link href={`/visits/${visit.id}`} className="hover:underline">
            {visit.operation?.name || "Visit"}
          </Link>
          {showPayments && (
            <>
              <span className="text-muted-foreground">·</span>
              <span>{"\u20B9"}{rate.toLocaleString("en-IN")}</span>
              {visit.discount > 0 && (
                <span className="text-muted-foreground">(disc. {"\u20B9"}{visit.discount.toLocaleString("en-IN")})</span>
              )}
            </>
          )}
          {!showPayments && rate > 0 && (
            <>
              <span className="text-muted-foreground">·</span>
              <span>{"\u20B9"}{rate.toLocaleString("en-IN")}</span>
            </>
          )}
          <span className="text-muted-foreground">·</span>
          <span>Dr. {visit.doctor?.name || "N/A"}</span>
          {visit.visitType === "FOLLOWUP" && (
            <Badge variant="outline" className="text-xs">F/U</Badge>
          )}
          {visit.visitType === "REVIEW" && (
            <Badge variant="outline" className="text-xs">Review</Badge>
          )}
        </div>
        {!isFollowUp && (
          <Button size="sm" variant="ghost" className="text-xs h-7" asChild>
            <Link href={`/visits/new?followUp=${visit.id}&patientId=${patientId}`}>
              F/U ↗
            </Link>
          </Button>
        )}
      </div>

      {/* Clinical notes */}
      <div className="mt-2">
        {report ? (
          <VisitClinicalNotes report={report} />
        ) : (
          <div className="text-sm text-muted-foreground italic">(No clinical notes)</div>
        )}
      </div>

      {/* Files */}
      {visit.files.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
          <Paperclip className="h-3.5 w-3.5" />
          {visit.files.length} file{visit.files.length !== 1 ? "s" : ""}:{" "}
          {visit.files.map((f) => f.fileName || "file").join(", ")}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-2">
        <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
          <Link href={`/visits/${visit.id}/examine`}>
            {report ? "Edit Notes" : "Add Notes"}
          </Link>
        </Button>
      </div>

      {/* Follow-ups rendered nested */}
      {visit.followUps && visit.followUps.length > 0 && (
        <div className="mt-2">
          {visit.followUps.map((fu) => (
            <VisitEntry
              key={fu.id}
              visit={fu}
              showPayments={showPayments}
              patientId={patientId}
              isFollowUp
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TreatmentTimeline({
  visits,
  showPayments,
  patientId,
}: {
  visits: VisitWithRelations[];
  showPayments: boolean;
  patientId: number;
}) {
  if (visits.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No visits recorded</div>;
  }

  return (
    <div className="divide-y">
      {visits.map((visit) => (
        <VisitEntry
          key={visit.id}
          visit={visit}
          showPayments={showPayments}
          patientId={patientId}
        />
      ))}
    </div>
  );
}
