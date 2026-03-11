import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { format } from "date-fns";
import { amountInWords } from "@/lib/amount-in-words";
import { PrintButton } from "./print-button";
import { requireAuth } from "@/lib/auth";
import { canCollectPayments } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { toTitleCase } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EscrowDepositPrintPage({
  params,
}: {
  params: Promise<{ id: string; paymentId: string }>;
}) {
  const currentUser = await requireAuth();
  if (!canCollectPayments(currentUser.permissionLevel)) {
    redirect("/dashboard");
  }
  const { id, paymentId } = await params;

  const payment = await prisma.patientPayment.findUnique({
    where: { id: parseInt(paymentId) },
    include: {
      patient: true,
      createdBy: { select: { name: true } },
    },
  });

  if (!payment || payment.patientId !== parseInt(id)) notFound();

  const clinic = await prisma.clinicSettings.findFirst();

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="print:hidden">
        <Breadcrumbs items={[
          { label: "Patients", href: "/patients" },
          { label: toTitleCase(payment.patient.name), href: `/patients/${payment.patientId}` },
          { label: "Checkout", href: `/patients/${payment.patientId}/checkout` },
          { label: `Advance Receipt #${payment.receiptNo || payment.id}` },
        ]} />
      </div>
      <PrintButton />

      <div className="border rounded-lg p-8 bg-white print:border-none print:p-0" id="receipt">
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

        <h2 className="text-center text-lg font-bold mb-4">ADVANCE RECEIPT</h2>

        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          <div>
            <span className="text-muted-foreground">Receipt No:</span>{" "}
            <span className="font-bold text-base">{payment.receiptNo || payment.id}</span>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground">Date:</span>{" "}
            <span className="font-medium">{format(new Date(payment.paymentDate), "dd/MM/yyyy")}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Mode:</span>{" "}
            <span className="font-medium">{payment.paymentMode}</span>
          </div>
        </div>

        <div className="border-t border-b py-3 mb-4 text-sm space-y-1">
          <div>
            <span className="text-muted-foreground">Patient:</span>{" "}
            <span className="font-bold">#{payment.patient.code}</span>{" "}
            <span className="font-medium">
              {payment.patient.salutation && `${payment.patient.salutation}. `}
              {toTitleCase(payment.patient.name)}
            </span>
          </div>
        </div>

        {/* Amount */}
        <div className="border-b pb-4 mb-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Amount Received</span>
            <span className="font-bold text-lg">{"\u20B9"}{payment.amount.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="bg-muted/50 rounded p-3 text-sm mb-6">
          <span className="text-muted-foreground">Amount in words: </span>
          <span className="font-medium italic">{amountInWords(payment.amount)}</span>
        </div>

        {/* Notes */}
        {payment.notes && (
          <div className="text-sm mb-6">
            <span className="text-muted-foreground">Notes: </span>
            <span className="font-medium">{payment.notes}</span>
          </div>
        )}

        {/* Received By */}
        <div className="text-sm text-muted-foreground mb-8">
          Received by: {toTitleCase(payment.createdBy.name)}
        </div>

        {/* Signature Area */}
        <div className="flex justify-between text-sm mt-16">
          <div className="text-center">
            <div className="border-t border-foreground w-48 mb-1"></div>
            <div className="text-muted-foreground">Patient / Guardian Signature</div>
          </div>
          <div className="text-center">
            <div className="border-t border-foreground w-48 mb-1"></div>
            <div className="text-muted-foreground">Authorized Signature</div>
          </div>
        </div>
      </div>
    </div>
  );
}
