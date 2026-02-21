import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { IndianRupee } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VisitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const visit = await prisma.visit.findUnique({
    where: { id: parseInt(id) },
    include: {
      patient: true,
      operation: true,
      doctor: true,
      assistingDoctor: true,
      lab: true,
      labRate: true,
      receipts: { orderBy: { receiptDate: "desc" } },
    },
  });

  if (!visit) notFound();

  const billed = (visit.operationRate || 0) - visit.discount;
  const paid = visit.receipts.reduce((s, r) => s + r.amount, 0);
  const balance = billed - paid;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            Case #{visit.caseNo || visit.id}
          </h2>
          <p className="text-muted-foreground">
            <Link href={`/patients/${visit.patientId}`} className="hover:underline font-medium">
              #{visit.patient.code} {visit.patient.salutation && `${visit.patient.salutation}. `}{visit.patient.name}
            </Link>
            {" · "}
            {format(new Date(visit.visitDate), "MMMM d, yyyy")}
          </p>
        </div>
        {balance > 0 && (
          <Button asChild>
            <Link href={`/patients/${visit.patientId}/checkout`}>
              <IndianRupee className="mr-2 h-4 w-4" /> Collect Payment
            </Link>
          </Button>
        )}
      </div>

      {/* Billing Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Billed</div>
            <div className="text-2xl font-bold">{"\u20B9"}{billed.toLocaleString("en-IN")}</div>
            {visit.discount > 0 && (
              <div className="text-xs text-muted-foreground">
                Rate: {"\u20B9"}{(visit.operationRate || 0).toLocaleString("en-IN")} - Discount: {"\u20B9"}{visit.discount.toLocaleString("en-IN")}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Paid</div>
            <div className="text-2xl font-bold text-green-600">{"\u20B9"}{paid.toLocaleString("en-IN")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Balance</div>
            <div className={`text-2xl font-bold ${balance > 0 ? "text-destructive" : ""}`}>
              {"\u20B9"}{balance.toLocaleString("en-IN")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visit Details */}
      <Card>
        <CardHeader>
          <CardTitle>Visit Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DetailRow label="Operation" value={visit.operation?.name} />
          <DetailRow label="Doctor" value={visit.doctor?.name} />
          {visit.assistingDoctor && <DetailRow label="Assisting Doctor" value={visit.assistingDoctor.name} />}
          {visit.doctorCommissionPercent != null && (
            <DetailRow label="Commission %" value={`${visit.doctorCommissionPercent}%`} />
          )}
          <Separator />
          {visit.lab && <DetailRow label="Lab" value={visit.lab.name} />}
          {visit.labRate && <DetailRow label="Lab Item" value={visit.labRate.itemName} />}
          {visit.labRateAmount > 0 && (
            <DetailRow label="Lab Rate" value={`₹${visit.labRateAmount.toLocaleString("en-IN")} × ${visit.labQuantity}`} />
          )}
          {visit.notes && (
            <>
              <Separator />
              <div>
                <div className="text-sm text-muted-foreground">Notes</div>
                <div className="mt-1 whitespace-pre-wrap">{visit.notes}</div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Receipts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Receipts ({visit.receipts.length})</CardTitle>
          {balance > 0 && (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/patients/${visit.patientId}/checkout`}>
                <IndianRupee className="mr-2 h-4 w-4" /> Collect Payment
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {visit.receipts.map((receipt) => (
              <div key={receipt.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {receipt.receiptNo && (
                      <span className="font-mono text-sm text-muted-foreground">
                        Rcpt #{receipt.receiptNo}
                      </span>
                    )}
                    {"\u20B9"}{receipt.amount.toLocaleString("en-IN")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(receipt.receiptDate), "MMM d, yyyy")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{receipt.paymentMode}</Badge>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/receipts/${receipt.id}/print`}>Print</Link>
                  </Button>
                </div>
              </div>
            ))}
            {visit.receipts.length === 0 && (
              <div className="py-4 text-center text-muted-foreground">No payments yet</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
