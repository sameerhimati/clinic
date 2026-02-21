import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Edit, Plus, IndianRupee } from "lucide-react";
import { DeletePatientButton } from "./delete-button";

export const dynamic = "force-dynamic";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patientId = parseInt(id);

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      diseases: {
        include: { disease: true },
      },
      visits: {
        orderBy: { visitDate: "desc" },
        include: {
          operation: { select: { name: true } },
          doctor: { select: { name: true } },
          receipts: { select: { id: true, receiptNo: true, amount: true, paymentMode: true, receiptDate: true } },
        },
      },
      files: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!patient) notFound();

  // Calculate totals
  let totalBilled = 0;
  let totalPaid = 0;
  for (const visit of patient.visits) {
    totalBilled += (visit.operationRate || 0) - visit.discount;
    totalPaid += visit.receipts.reduce((s, r) => s + r.amount, 0);
  }
  const totalBalance = totalBilled - totalPaid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-center">
            <div className="text-xs uppercase tracking-wide opacity-80">Patient</div>
            <div className="text-2xl font-bold font-mono">#{patient.code}</div>
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {patient.salutation && `${patient.salutation}. `}
              {patient.name}
            </h2>
            <p className="text-muted-foreground">
              {patient.gender && `${patient.gender === "M" ? "Male" : "Female"}`}
              {patient.ageAtRegistration && ` · ${patient.ageAtRegistration} yrs`}
              {patient.bloodGroup && ` · ${patient.bloodGroup}`}
              {patient.mobile && ` · ${patient.mobile}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {totalBalance > 0 && (
            <Button asChild>
              <Link href={`/patients/${patient.id}/checkout`}>
                <IndianRupee className="mr-2 h-4 w-4" />
                Collect Payment
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href={`/patients/${patient.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <DeletePatientButton patientId={patient.id} patientName={patient.name} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Billed</div>
            <div className="text-2xl font-bold">{"\u20B9"}{totalBilled.toLocaleString("en-IN")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Paid</div>
            <div className="text-2xl font-bold text-green-600">{"\u20B9"}{totalPaid.toLocaleString("en-IN")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Balance</div>
            <div className={`text-2xl font-bold ${totalBalance > 0 ? "text-destructive" : ""}`}>
              {"\u20B9"}{totalBalance.toLocaleString("en-IN")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="visits">
        <TabsList>
          <TabsTrigger value="visits">Visits ({patient.visits.length})</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="medical">Medical History</TabsTrigger>
        </TabsList>

        <TabsContent value="visits" className="mt-4 space-y-4">
          <Button size="sm" asChild>
            <Link href={`/visits/new?patientId=${patient.id}`}>
              <Plus className="mr-2 h-4 w-4" />
              New Visit
            </Link>
          </Button>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {patient.visits.map((visit) => {
                  const billed = (visit.operationRate || 0) - visit.discount;
                  const paid = visit.receipts.reduce((s, r) => s + r.amount, 0);
                  const balance = billed - paid;
                  return (
                    <Link
                      key={visit.id}
                      href={`/visits/${visit.id}`}
                      className="flex items-center justify-between p-4 hover:bg-accent transition-colors"
                    >
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          <span className="font-mono text-sm text-muted-foreground">
                            #{visit.caseNo}
                          </span>
                          {visit.operation?.name || "Visit"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(visit.visitDate), "MMM d, yyyy")}
                          {visit.doctor && ` · Dr. ${visit.doctor.name}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div>{"\u20B9"}{billed.toLocaleString("en-IN")}</div>
                        {balance > 0 ? (
                          <Badge variant="destructive" className="text-xs">
                            Due: {"\u20B9"}{balance.toLocaleString("en-IN")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Paid
                          </Badge>
                        )}
                      </div>
                    </Link>
                  );
                })}
                {patient.visits.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No visits recorded
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipts" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {patient.visits.flatMap((visit) =>
                  visit.receipts.map((receipt) => (
                    <div
                      key={receipt.id}
                      className="flex items-center justify-between p-4"
                    >
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
                          {format(new Date(receipt.receiptDate), "MMM d, yyyy")} ·{" "}
                          Case #{visit.caseNo} · {visit.operation?.name || "Visit"} · {receipt.paymentMode}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/receipts/${receipt.id}/print`}>Print</Link>
                      </Button>
                    </div>
                  ))
                )}
                {patient.visits.flatMap((v) => v.receipts).length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No receipts recorded
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow label="Patient Code" value={patient.code ? `#${patient.code}` : null} />
                <InfoRow label="Father/Husband" value={patient.fatherHusbandName} />
                <InfoRow label="Date of Birth" value={patient.dateOfBirth ? format(new Date(patient.dateOfBirth), "MMM d, yyyy") : null} />
                <InfoRow label="Occupation" value={patient.occupation} />
                <InfoRow label="Mobile" value={patient.mobile} />
                <InfoRow label="Phone" value={patient.phone} />
                <InfoRow label="Email" value={patient.email} />
                <Separator className="sm:col-span-2" />
                <InfoRow label="Address" value={[patient.addressLine1, patient.addressLine2, patient.addressLine3].filter(Boolean).join(", ")} />
                <InfoRow label="City" value={patient.city} />
                <InfoRow label="Pincode" value={patient.pincode} />
                <Separator className="sm:col-span-2" />
                <InfoRow label="Referring Physician" value={patient.referringPhysician} />
                <InfoRow label="Physician Phone" value={patient.physicianPhone} />
                {patient.remarks && (
                  <div className="sm:col-span-2">
                    <div className="text-sm text-muted-foreground">Remarks</div>
                    <div className="mt-0.5">{patient.remarks}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medical" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Medical History Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              {patient.diseases.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {patient.diseases.map((pd) => (
                    <Badge key={pd.id} variant="destructive">
                      {pd.disease.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No medical conditions recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
