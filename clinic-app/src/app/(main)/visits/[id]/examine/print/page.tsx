import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { format } from "date-fns";
import { PrintReportButton } from "./print-button";

export const dynamic = "force-dynamic";

export default async function ClinicalReportPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const visitId = parseInt(id);

  const report = await prisma.clinicalReport.findFirst({
    where: { visitId },
    include: {
      doctor: { select: { name: true } },
      visit: {
        include: {
          patient: true,
          operation: { select: { name: true } },
          doctor: { select: { name: true } },
        },
      },
    },
  });

  if (!report) notFound();

  const clinic = await prisma.clinicSettings.findFirst();
  const patient = report.visit.patient;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="print:hidden">
        <Breadcrumbs items={[
          { label: patient.name, href: `/patients/${patient.id}` },
          { label: `Case #${report.visit.caseNo || visitId}`, href: `/visits/${visitId}` },
          { label: "Examination", href: `/visits/${visitId}/examine` },
          { label: "Print" },
        ]} />
      </div>
      <PrintReportButton />

      <div className="border rounded-lg p-8 bg-white print:border-none print:p-0" id="clinical-report">
        {/* Header */}
        <div className="text-center border-b pb-4 mb-4">
          <h1 className="text-xl font-bold">{clinic?.name || "Secunderabad Dental Hospital"}</h1>
          <p className="text-sm text-muted-foreground">
            {clinic?.addressLine1}
          </p>
          <p className="text-sm text-muted-foreground">
            {[clinic?.addressLine2, clinic?.addressLine3].filter(Boolean).join(", ")}
          </p>
          <p className="text-sm text-muted-foreground">
            {clinic?.city} - {clinic?.pincode} · Ph: {clinic?.phone}
          </p>
        </div>

        <h2 className="text-center text-lg font-bold mb-4">CLINICAL EXAMINATION REPORT</h2>

        {/* Patient & Visit Info */}
        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          <div>
            <span className="text-muted-foreground">Patient:</span>{" "}
            <span className="font-bold">#{patient.code}</span>{" "}
            <span className="font-medium">
              {patient.salutation && `${patient.salutation}. `}
              {patient.name}
            </span>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground">Date:</span>{" "}
            <span className="font-medium">{format(new Date(report.reportDate), "dd/MM/yyyy")}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Age/Gender:</span>{" "}
            <span className="font-medium">
              {patient.ageAtRegistration && `${patient.ageAtRegistration} yrs`}
              {patient.gender && ` / ${patient.gender === "M" ? "Male" : "Female"}`}
            </span>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground">Case No:</span>{" "}
            <span className="font-medium">{report.visit.caseNo || report.visit.id}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Treatment:</span>{" "}
            <span className="font-medium">{report.visit.operation?.name || "N/A"}</span>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground">Doctor:</span>{" "}
            <span className="font-medium">Dr. {report.doctor.name}</span>
          </div>
        </div>

        {/* Clinical Fields */}
        <div className="space-y-4 border-t pt-4 text-sm">
          {report.complaint && (
            <div>
              <div className="font-bold text-muted-foreground mb-1">CHIEF COMPLAINT</div>
              <div className="whitespace-pre-wrap">{report.complaint}</div>
            </div>
          )}
          {report.examination && (
            <div>
              <div className="font-bold text-muted-foreground mb-1">EXAMINATION FINDINGS</div>
              <div className="whitespace-pre-wrap">{report.examination}</div>
            </div>
          )}
          {report.diagnosis && (
            <div>
              <div className="font-bold text-muted-foreground mb-1">DIAGNOSIS</div>
              <div className="whitespace-pre-wrap">{report.diagnosis}</div>
            </div>
          )}
          {report.treatmentNotes && (
            <div>
              <div className="font-bold text-muted-foreground mb-1">TREATMENT PLAN</div>
              <div className="whitespace-pre-wrap">{report.treatmentNotes}</div>
            </div>
          )}
          {/* Estimate intentionally excluded from printed clinical reports — financial data is patient-facing inappropriate */}
          {report.medication && (
            <div>
              <div className="font-bold text-muted-foreground mb-1">MEDICATION PRESCRIBED</div>
              <div className="whitespace-pre-wrap">{report.medication}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between text-sm pt-12 mt-8">
          <div className="text-muted-foreground">Patient Signature</div>
          <div className="text-center">
            <div className="font-medium">Dr. {report.doctor.name}</div>
            <div className="text-muted-foreground">Doctor&apos;s Signature</div>
          </div>
        </div>
      </div>
    </div>
  );
}
