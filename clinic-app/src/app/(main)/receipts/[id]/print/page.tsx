import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { amountInWords } from "@/lib/amount-in-words";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export default async function ReceiptPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const receipt = await prisma.receipt.findUnique({
    where: { id: parseInt(id) },
    include: {
      visit: {
        include: {
          patient: true,
          operation: true,
          doctor: true,
          receipts: { select: { amount: true } },
        },
      },
    },
  });

  if (!receipt) notFound();

  const clinic = await prisma.clinicSettings.findFirst();
  const billed = (receipt.visit.operationRate || 0) - receipt.visit.discount;
  const totalPaid = receipt.visit.receipts.reduce((s, r) => s + r.amount, 0);
  const balance = billed - totalPaid;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
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

        <h2 className="text-center text-lg font-bold mb-4">RECEIPT</h2>

        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          <div>
            <span className="text-muted-foreground">Receipt No:</span>{" "}
            <span className="font-medium">{receipt.id}</span>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground">Date:</span>{" "}
            <span className="font-medium">{format(new Date(receipt.receiptDate), "dd/MM/yyyy")}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Case No:</span>{" "}
            <span className="font-medium">{receipt.visit.legacyCaseNo || receipt.visit.id}</span>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground">Mode:</span>{" "}
            <span className="font-medium">{receipt.paymentMode}</span>
          </div>
        </div>

        <div className="border-t border-b py-3 mb-4 text-sm space-y-1">
          <div>
            <span className="text-muted-foreground">Patient:</span>{" "}
            <span className="font-medium">
              {receipt.visit.patient.salutation && `${receipt.visit.patient.salutation}. `}
              {receipt.visit.patient.name}
            </span>
            {receipt.visit.patient.legacyCode && (
              <span className="text-muted-foreground ml-2">#{receipt.visit.patient.legacyCode}</span>
            )}
          </div>
          <div>
            <span className="text-muted-foreground">Treatment:</span>{" "}
            <span className="font-medium">{receipt.visit.operation?.name || "N/A"}</span>
          </div>
          {receipt.visit.doctor && (
            <div>
              <span className="text-muted-foreground">Doctor:</span>{" "}
              <span className="font-medium">Dr. {receipt.visit.doctor.name}</span>
            </div>
          )}
        </div>

        {/* Amount Table */}
        <table className="w-full text-sm mb-4">
          <tbody>
            <tr>
              <td className="py-1 text-muted-foreground">Operation Rate</td>
              <td className="py-1 text-right">{"\u20B9"}{(receipt.visit.operationRate || 0).toLocaleString("en-IN")}</td>
            </tr>
            {receipt.visit.discount > 0 && (
              <tr>
                <td className="py-1 text-muted-foreground">Discount</td>
                <td className="py-1 text-right">- {"\u20B9"}{receipt.visit.discount.toLocaleString("en-IN")}</td>
              </tr>
            )}
            <tr className="border-t font-medium">
              <td className="py-1">Net Amount</td>
              <td className="py-1 text-right">{"\u20B9"}{billed.toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td className="py-1 text-muted-foreground">Amount Received</td>
              <td className="py-1 text-right font-bold text-lg">{"\u20B9"}{receipt.amount.toLocaleString("en-IN")}</td>
            </tr>
            <tr className="border-t">
              <td className="py-1 text-muted-foreground">Balance</td>
              <td className="py-1 text-right">{"\u20B9"}{balance.toLocaleString("en-IN")}</td>
            </tr>
          </tbody>
        </table>

        {/* Amount in Words */}
        <div className="bg-muted/50 rounded p-3 text-sm mb-6">
          <span className="text-muted-foreground">Amount in words: </span>
          <span className="font-medium italic">{amountInWords(receipt.amount)}</span>
        </div>

        {/* Footer */}
        <div className="flex justify-between text-sm pt-8">
          <div className="text-muted-foreground">Patient Signature</div>
          <div className="text-muted-foreground">Authorized Signature</div>
        </div>
      </div>
    </div>
  );
}
