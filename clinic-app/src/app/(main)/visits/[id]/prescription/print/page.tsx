import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { formatDate, toTitleCase } from "@/lib/format";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export default async function PrescriptionPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { id } = await params;
  const { rxId } = await searchParams;
  const visitId = parseInt(id);

  // If rxId provided, print that specific prescription, otherwise the latest
  const prescription = rxId
    ? await prisma.prescription.findUnique({
        where: { id: parseInt(rxId) },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          doctor: { select: { name: true } },
          patient: true,
          visit: {
            select: { caseNo: true, operation: { select: { name: true } } },
          },
        },
      })
    : await prisma.prescription.findFirst({
        where: { visitId },
        orderBy: { createdAt: "desc" },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          doctor: { select: { name: true } },
          patient: true,
          visit: {
            select: { caseNo: true, operation: { select: { name: true } } },
          },
        },
      });

  if (!prescription) notFound();

  const clinic = await prisma.clinicSettings.findFirst();
  const patient = prescription.patient;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="print:hidden">
        <Breadcrumbs items={[
          { label: toTitleCase(patient.name), href: `/patients/${patient.id}` },
          { label: `Case #${prescription.visit.caseNo || visitId}`, href: `/visits/${visitId}` },
          { label: "Prescription", href: `/visits/${visitId}/prescription` },
          { label: "Print" },
        ]} />
      </div>
      <PrintButton />

      <div className="border rounded-lg p-8 bg-white print:border-none print:p-0" id="prescription-print">
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

        <h2 className="text-center text-lg font-bold mb-4">PRESCRIPTION</h2>

        {/* Patient & Visit Info */}
        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          <div>
            <span className="text-muted-foreground">Patient:</span>{" "}
            <span className="font-bold">#{patient.code}</span>{" "}
            <span className="font-medium">
              {patient.salutation && `${patient.salutation}. `}
              {toTitleCase(patient.name)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground">Date:</span>{" "}
            <span className="font-medium">{formatDate(prescription.createdAt)}</span>
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
            <span className="font-medium">{prescription.visit.caseNo || visitId}</span>
          </div>
          {prescription.visit.operation && (
            <div>
              <span className="text-muted-foreground">Treatment:</span>{" "}
              <span className="font-medium">{prescription.visit.operation.name}</span>
            </div>
          )}
          <div className={prescription.visit.operation ? "text-right" : ""}>
            <span className="text-muted-foreground">Doctor:</span>{" "}
            <span className="font-medium">Dr. {toTitleCase(prescription.doctor.name)}</span>
          </div>
        </div>

        {/* Rx Symbol */}
        <div className="text-3xl font-serif italic mb-3">&#8478;</div>

        {/* Medications Table */}
        <table className="w-full text-sm border-collapse mb-6">
          <thead>
            <tr className="border-b-2 border-foreground">
              <th className="text-left py-2 w-8">#</th>
              <th className="text-left py-2">Drug</th>
              <th className="text-left py-2">Dosage</th>
              <th className="text-left py-2">Frequency</th>
              <th className="text-left py-2">Duration</th>
              <th className="text-left py-2">Instructions</th>
            </tr>
          </thead>
          <tbody>
            {prescription.items.map((item, idx) => (
              <tr key={item.id} className="border-b">
                <td className="py-2 text-muted-foreground">{idx + 1}</td>
                <td className="py-2 font-medium">{item.drug}</td>
                <td className="py-2">{item.dosage || "—"}</td>
                <td className="py-2">{item.frequency || "—"}</td>
                <td className="py-2">{item.duration || "—"}</td>
                <td className="py-2 text-muted-foreground">{item.instructions || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Notes */}
        {prescription.notes && (
          <div className="text-sm mb-6">
            <span className="font-bold text-muted-foreground">Notes: </span>
            {prescription.notes}
          </div>
        )}

        {/* Signature Area */}
        <div className="flex justify-between text-sm mt-16">
          <div className="text-center">
            <div className="border-t border-foreground w-48 mb-1"></div>
            <div className="text-muted-foreground">Patient / Guardian Signature</div>
          </div>
          <div className="text-center">
            <div className="font-medium mb-1">Dr. {toTitleCase(prescription.doctor.name)}</div>
            <div className="border-t border-foreground w-48 mb-1"></div>
            <div className="text-muted-foreground">Doctor&apos;s Signature</div>
          </div>
        </div>
      </div>
    </div>
  );
}
