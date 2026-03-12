import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { format } from "date-fns";
import { ExaminationForm } from "./examination-form";
import { requireAuth } from "@/lib/auth";
import { isReportLocked, hoursUntilAutoLock, isAdmin, canExamine } from "@/lib/permissions";
import { toTitleCase, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ExaminePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const visitId = parseInt(id);
  const currentUser = await requireAuth();

  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    include: {
      patient: { select: { id: true, code: true, name: true, salutation: true, gender: true, ageAtRegistration: true, diseases: { include: { disease: true } } } },
      operation: { select: { name: true } },
      doctor: { select: { id: true, name: true } },
    },
  });

  if (!visit) notFound();

  // Non-doctors can only VIEW existing reports, not create new ones
  const userCanExamine = canExamine(currentUser.permissionLevel);
  const existingReportCheck = await prisma.clinicalReport.findFirst({
    where: { visitId },
    select: { id: true },
  });
  if (!userCanExamine && !existingReportCheck) {
    // No report exists and user can't create one — redirect to visit detail
    redirect(`/visits/${visitId}`);
  }

  // Fetch ALL previous visits for this patient (for historical notepad entries)
  const allPatientVisits = await prisma.visit.findMany({
    where: { patientId: visit.patientId, id: { not: visitId } },
    include: {
      operation: { select: { name: true } },
      clinicalReports: {
        select: {
          reportDate: true,
          doctorId: true,
          doctor: { select: { name: true } },
          complaint: true,
          examination: true,
          diagnosis: true,
          treatmentNotes: true,
          medication: true,
        },
        take: 1,
      },
    },
    orderBy: { visitDate: "asc" },
  });

  // Load existing clinical report if any
  const existingReport = await prisma.clinicalReport.findFirst({
    where: { visitId },
    include: {
      addendums: {
        include: { doctor: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      lockedBy: { select: { name: true } },
      doctor: { select: { name: true } },
    },
  });

  const locked = existingReport ? isReportLocked(existingReport) : false;
  const canUnlock = isAdmin(currentUser.permissionLevel);
  const hoursLeft = existingReport && !locked ? hoursUntilAutoLock(existingReport) : 0;

  const operationName = visit.operation?.name || "Visit";

  // Fetch tooth statuses, findings, and history for odontogram
  const [patientToothStatuses, activeFindings, toothHistory] = await Promise.all([
    prisma.toothStatus.findMany({
      where: { patientId: visit.patientId },
      include: { finding: { select: { name: true, color: true } } },
    }),
    prisma.toothFinding.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, category: true, color: true },
    }),
    prisma.toothStatusHistory.findMany({
      where: { patientId: visit.patientId },
      orderBy: { recordedAt: "asc" },
      include: {
        recordedBy: { select: { name: true } },
        finding: { select: { name: true } },
        visit: { select: { caseNo: true } },
      },
    }),
  ]);

  // Fetch data for treatment plan creation (doctors + template steps + existing plans + availability)
  const [treatmentSteps, activeDoctors, patientChains, doctorAvailability] = await Promise.all([
    visit.operationId
      ? prisma.treatmentStep.findMany({
          where: { operationId: visit.operationId },
          orderBy: { stepNumber: "asc" },
          select: { name: true, defaultDayGap: true, description: true, noteTemplate: true },
        })
      : Promise.resolve([]),
    prisma.doctor.findMany({
      where: { permissionLevel: { in: [3, 4] }, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    // Fetch all chains (non-cancelled) with ALL plans for full progress view
    prisma.treatmentChain.findMany({
      where: {
        patientId: visit.patientId,
        status: { not: "CANCELLED" },
      },
      orderBy: { createdAt: "asc" },
      include: {
        plans: {
          where: { status: { not: "CANCELLED" } },
          orderBy: { chainOrder: "asc" },
          include: {
            items: {
              orderBy: { sortOrder: "asc" },
              select: { id: true, label: true, sortOrder: true, visitId: true, completedAt: true, operationId: true },
            },
          },
        },
      },
    }),
    prisma.doctorAvailability.findMany({
      select: { doctorId: true, dayOfWeek: true, startTime: true, endTime: true },
    }),
  ]);

  // Also fetch standalone active plans (no chain)
  const standalonePlans = await prisma.treatmentPlan.findMany({
    where: {
      patientId: visit.patientId,
      chainId: null,
      status: "ACTIVE",
    },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, label: true, sortOrder: true, visitId: true, completedAt: true, operationId: true },
      },
    },
  });

  // Build chain-grouped progress data
  const activeChainsForProgress = [
    // Chains with their plans
    ...patientChains.map((chain) => ({
      chainId: chain.id,
      chainTitle: chain.title,
      chainStatus: chain.status,
      chainToothNumbers: chain.toothNumbers,
      plans: chain.plans.map((p) => ({
        planId: p.id,
        planTitle: p.title,
        planStatus: p.status,
        items: p.items.map((i) => ({
          id: i.id,
          label: i.label,
          sortOrder: i.sortOrder,
          completedAt: i.completedAt ? i.completedAt.toISOString() : null,
          visitId: i.visitId,
        })),
      })),
    })),
    // Standalone plans as pseudo-chains
    ...standalonePlans.map((p) => ({
      chainId: -p.id,
      chainTitle: p.title,
      chainStatus: "ACTIVE",
      plans: [{
        planId: p.id,
        planTitle: p.title,
        planStatus: p.status,
        items: p.items.map((i) => ({
          id: i.id,
          label: i.label,
          sortOrder: i.sortOrder,
          completedAt: i.completedAt ? i.completedAt.toISOString() : null,
          visitId: i.visitId,
        })),
      }],
    })),
  ].filter((c) => c.plans.length > 0);

  // Keep flat active plans for Treatment Plans card (edit links) — include DRAFT plans too
  const existingActivePlans = [
    ...patientChains.flatMap((c) => c.plans.filter((p) => p.status === "ACTIVE" || p.status === "DRAFT")),
    ...standalonePlans,
  ];

  // Fetch patient files (X-rays, scans, photos) for reference during exam
  const patientFiles = await prisma.patientFile.findMany({
    where: {
      patientId: visit.patientId,
      category: { in: ["XRAY", "SCAN", "PHOTO"] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      filePath: true,
      fileName: true,
      description: true,
      fileType: true,
      category: true,
      createdAt: true,
      uploadedBy: { select: { name: true } },
      visit: { select: { id: true, caseNo: true, operation: { select: { name: true } } } },
    },
  });

  // Clinical notes for notepad + active chains
  const [clinicalNotes, notepadChains] = await Promise.all([
    prisma.clinicalNote.findMany({
      where: { patientId: visit.patientId },
      orderBy: { noteDate: "asc" },
      include: {
        doctor: { select: { name: true } },
        chain: { select: { id: true, title: true } },
      },
    }),
    prisma.treatmentChain.findMany({
      where: { patientId: visit.patientId, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  // Transform past ClinicalReports into historical NoteEntry for the notepad
  const historicalNotes = allPatientVisits
    .filter((v) => v.clinicalReports.length > 0)
    .filter((v) => {
      const r = v.clinicalReports[0];
      return r.complaint || r.diagnosis || r.treatmentNotes || r.examination;
    })
    .map((v) => {
      const r = v.clinicalReports[0];
      return {
        id: -v.id, // negative to distinguish from real notes
        content: "",
        noteDate: r.reportDate.toISOString(),
        doctorName: r.doctor.name,
        chainId: null as number | null,
        chainTitle: null as string | null,
        isHistorical: true as const,
        visitCaseNo: v.caseNo,
        operationName: v.operation?.name || null,
        fields: {
          complaint: r.complaint,
          diagnosis: r.diagnosis,
          treatmentNotes: r.treatmentNotes,
          examination: r.examination,
          medication: r.medication,
        },
      };
    });

  // Merge historical + real notes, sorted by date
  const allNoteEntries = [
    ...historicalNotes,
    ...clinicalNotes.map((n) => ({
      id: n.id,
      content: n.content,
      noteDate: n.noteDate.toISOString(),
      doctorName: n.doctor.name,
      chainId: n.chainId,
      chainTitle: n.chain?.title || null,
    })),
  ].sort((a, b) => a.noteDate.localeCompare(b.noteDate));

  // Operations for the plan editor
  const allOperationsRaw = await prisma.operation.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: { id: true, name: true, category: true, suggestsOperationId: true, defaultMinFee: true, _count: { select: { treatmentSteps: true } } },
  });
  const allOperations = allOperationsRaw.map((op) => ({
    id: op.id,
    name: op.name,
    category: op.category,
    stepCount: op._count.treatmentSteps,
    suggestsOperationId: op.suggestsOperationId,
    defaultMinFee: op.defaultMinFee,
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <Breadcrumbs items={[
        { label: "Patients", href: "/patients" },
        { label: toTitleCase(visit.patient.name), href: `/patients/${visit.patient.id}` },
        { label: `Case #${visit.caseNo || visit.id}`, href: `/visits/${visitId}` },
        { label: "Examination" },
      ]} />
      <div>
        <h2 className="text-2xl font-bold">
          Clinical Examination — Case #{visit.caseNo || visit.id}
        </h2>
        <p className="text-muted-foreground">
          <span className="font-mono">#{visit.patient.code}</span>{" "}
          {visit.patient.salutation && `${visit.patient.salutation}. `}
          {toTitleCase(visit.patient.name)}
          {visit.patient.gender && ` \u00b7 ${visit.patient.gender === "M" ? "Male" : "Female"}`}
          {visit.patient.ageAtRegistration && ` \u00b7 ${visit.patient.ageAtRegistration} yrs`}
        </p>
        <p className="text-sm text-muted-foreground">
          {operationName} {"\u00b7"} {visit.doctor ? `Dr. ${toTitleCase(visit.doctor.name)}` : "No doctor"} {"\u00b7"} {formatDate(visit.visitDate)}
        </p>
      </div>

      <ExaminationForm
        visitId={visitId}
        patientId={visit.patientId}
        defaultDoctorId={visit.doctorId}
        defaultDoctorName={visit.doctor?.name ? toTitleCase(visit.doctor.name) : null}
        hasOperation={!!visit.operationId}
        existingReport={existingReport ? {
          id: existingReport.id,
          doctorId: existingReport.doctorId,
          doctorName: toTitleCase(existingReport.doctor.name),
          reportDate: format(new Date(existingReport.reportDate), "yyyy-MM-dd"),
          complaint: existingReport.complaint,
          examination: existingReport.examination,
          diagnosis: existingReport.diagnosis,
          treatmentNotes: existingReport.treatmentNotes,
          estimate: currentUser.permissionLevel <= 2 ? existingReport.estimate : null,
          medication: existingReport.medication,
          teethSelected: existingReport.teethSelected,
        } : null}
        isLocked={locked}
        canUnlock={canUnlock}
        hoursUntilLock={hoursLeft}
        reportId={existingReport?.id ?? null}
        addendums={existingReport?.addendums.map(a => ({
          id: a.id,
          content: a.content,
          createdAt: a.createdAt.toISOString(),
          doctorName: toTitleCase(a.doctor.name),
        })) ?? []}
        lockedByName={existingReport?.lockedBy?.name ?? null}
        lockedAt={existingReport?.lockedAt?.toISOString() ?? null}
        permissionLevel={currentUser.permissionLevel}
        readOnly={!userCanExamine}
        patientDiseases={visit.patient.diseases.map((pd) => pd.disease.name)}
        operationName={operationName}
        isFollowUp={!!visit.parentVisitId}
        allDoctors={activeDoctors}
        allOperations={allOperations}
        activeChainsForProgress={activeChainsForProgress}
        existingActivePlans={existingActivePlans.map((p) => ({
          id: p.id,
          title: p.title,
          nextItemLabel: p.items.find((i) => i.visitId === null)?.label || null,
        }))}
        doctorAvailability={doctorAvailability}
        patientFiles={patientFiles.map((f) => ({
          id: f.id,
          filePath: f.filePath,
          fileName: f.fileName,
          description: f.description,
          fileType: f.fileType,
          category: f.category,
          createdAt: f.createdAt.toISOString(),
          visitCaseNo: f.visit?.caseNo ?? null,
          visitOperation: f.visit?.operation?.name ?? null,
        }))}
        toothStatuses={patientToothStatuses.map((ts) => ({
          toothNumber: ts.toothNumber,
          status: ts.status,
          findingId: ts.findingId ?? undefined,
          findingName: ts.finding?.name ?? undefined,
          color: ts.finding?.color ?? undefined,
          notes: ts.notes ?? undefined,
        }))}
        toothFindings={activeFindings}
        clinicalNotes={allNoteEntries}
        notepadChains={notepadChains}
        toothHistory={toothHistory.map((h) => ({
          toothNumber: h.toothNumber,
          status: h.status,
          findingName: h.finding?.name ?? undefined,
          date: formatDate(h.recordedAt),
          doctorName: toTitleCase(h.recordedBy.name),
          visitCaseNo: h.visit?.caseNo ?? undefined,
        }))}
      />
    </div>
  );
}
