#!/usr/bin/env bun
/**
 * Import parsed JSON data into the clinic app's Prisma/SQLite database.
 *
 * Usage:
 *   1. Run parse-sqltalk-exports.ts first to generate JSON files in parsed/
 *   2. From clinic-app/: rm prisma/dev.db && bunx prisma db push
 *   3. From clinic-legacy/: bun import-to-prisma.ts
 *
 * Import order (FK constraints):
 *   Disease → Designation → Doctor → Operation → Lab → LabRate →
 *   Patient → PatientDisease → Visit → Receipt → ClinicalReport → PatientFile
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const PARSED_DIR = join(import.meta.dir, "../../clinic-legacy/parsed");
const prisma = new PrismaClient();

function load<T>(name: string): T[] {
  return JSON.parse(readFileSync(join(PARSED_DIR, name), "utf-8"));
}

/** Insert in batches to avoid SQLite variable limits */
async function batchCreate<T extends Record<string, any>>(
  model: any,
  data: T[],
  batchSize = 200
): Promise<number> {
  let count = 0;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const result = await model.createMany({ data: batch });
    count += result.count;
    if ((i + batchSize) % 10000 < batchSize && data.length > 10000) {
      process.stdout.write(`    ${Math.min(i + batchSize, data.length).toLocaleString()}/${data.length.toLocaleString()}\r`);
    }
  }
  return count;
}

function progress(label: string, count: number, total: number) {
  console.log(`  ✓ ${label}: ${count.toLocaleString()}/${total.toLocaleString()} imported`);
}

// ─── Main ───

async function main() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║  Legacy Data Import (2026 Export)    ║");
  console.log("╚══════════════════════════════════════╝\n");

  const startTime = Date.now();

  // ─── 1. Diseases ───
  console.log("1. Diseases...");
  const diseases = load<any>("diseases.json");
  const diseaseCount = await batchCreate(prisma.disease, diseases.map((d: any) => ({
    code: String(d.code),
    name: d.name,
  })));
  progress("Disease", diseaseCount, diseases.length);

  // Build disease lookup by name for PatientDisease
  const diseaseMap = new Map<string, number>();
  const allDiseases = await prisma.disease.findMany();
  for (const d of allDiseases) diseaseMap.set(d.name, d.id);

  // ─── 2. Designations ───
  console.log("2. Designations...");
  await prisma.designation.createMany({
    data: [
      { id: 1, name: "DOCTOR" },
      { id: 2, name: "RECEPTION" },
      { id: 3, name: "HYGIENIST" },
      { id: 4, name: "SPECIALIST" },
    ],
  });
  progress("Designation", 4, 4);

  // ─── 3. Doctors ───
  console.log("3. Doctors...");
  const doctors = load<any>("doctors.json");
  // Filter out duplicates and map permission levels
  const doctorData = doctors
    .filter((d: any) => d.code !== null)
    .map((d: any) => ({
      code: d.code,
      name: d.name || `Doctor ${d.code}`,
      commissionPercent: d.commissionPercent ?? 0,
      tdsPercent: d.tdsPercent ?? 0,
      tdsNew: d.tdsNew,
      tdsDate: d.tdsDate ? new Date(d.tdsDate) : null,
      commissionRate: d.commissionRate,
      mobile: d.mobile,
      password: d.password,
      designationId: d.designationId || 1,
      permissionLevel: d.permissionLevel ?? 3,
      isActive: true,
    }));
  const docCount = await batchCreate(prisma.doctor, doctorData);
  progress("Doctor", docCount, doctorData.length);

  // Build doctor lookup: legacy code → prisma id
  const doctorCodeToId = new Map<number, number>();
  const allDoctors = await prisma.doctor.findMany();
  for (const d of allDoctors) {
    if (d.code !== null) doctorCodeToId.set(d.code, d.id);
  }

  // ─── 4. Operations ───
  console.log("4. Operations...");
  const operations = load<any>("operations.json");
  // Add missing operation codes referenced by visits
  const opCodes = new Set(operations.map((o: any) => o.code));
  const missingOpCodes = [5, 46]; // found in data integrity check
  for (const code of missingOpCodes) {
    if (!opCodes.has(code)) {
      operations.push({ code, name: `Unknown Operation ${code}`, defaultMinFee: 0, defaultMaxFee: 0 });
    }
  }
  const opData = operations
    .filter((o: any) => o.code !== null)
    .map((o: any) => ({
      code: o.code,
      name: o.name || `Operation ${o.code}`,
      defaultMinFee: o.defaultMinFee ?? 0,
      defaultMaxFee: o.defaultMaxFee ?? 0,
      isActive: true,
    }));
  const opCount = await batchCreate(prisma.operation, opData);
  progress("Operation", opCount, opData.length);

  // Build operation lookup: legacy code → prisma id
  const opCodeToId = new Map<number, number>();
  const allOps = await prisma.operation.findMany();
  for (const o of allOps) {
    if (o.code !== null) opCodeToId.set(o.code, o.id);
  }

  // ─── 5. Labs ───
  console.log("5. Labs...");
  const labs = load<any>("labs.json");
  const labData = labs
    .filter((l: any) => l.code !== null)
    .map((l: any) => ({
      code: l.code,
      name: l.name || `Lab ${l.code}`,
      isActive: true,
    }));
  const labCount = await batchCreate(prisma.lab, labData);
  progress("Lab", labCount, labData.length);

  // Build lab lookup
  const labCodeToId = new Map<number, number>();
  const allLabs = await prisma.lab.findMany();
  for (const l of allLabs) {
    if (l.code !== null) labCodeToId.set(l.code, l.id);
  }

  // ─── 6. LabRates ───
  console.log("6. Lab Rates...");
  const labRates = load<any>("labrates.json");
  const labRateData = labRates
    .filter((lr: any) => lr.labCode !== null && lr.labCode !== 0 && lr.itemCode !== null)
    .filter((lr: any) => labCodeToId.has(lr.labCode))
    .map((lr: any) => ({
      labId: labCodeToId.get(lr.labCode)!,
      itemCode: lr.itemCode,
      itemName: lr.itemName || `Item ${lr.itemCode}`,
      rate: lr.rate ?? 0,
      isActive: true,
    }));
  const lrCount = await batchCreate(prisma.labRate, labRateData);
  progress("LabRate", lrCount, labRateData.length);

  // Build labRate lookup: (labCode, itemCode) → prisma id
  const labRateToId = new Map<string, number>();
  const allLabRates = await prisma.labRate.findMany();
  for (const lr of allLabRates) {
    const lab = allLabs.find(l => l.id === lr.labId);
    if (lab?.code !== null && lab?.code !== undefined) {
      labRateToId.set(`${lab.code}_${lr.itemCode}`, lr.id);
    }
  }

  // ─── 7. Patients ───
  console.log("7. Patients...");
  const patients = load<any>("patients.json");
  const validPatients = patients.filter((p: any) => p.name && p.name.length >= 2);
  const patientData = validPatients.map((p: any) => ({
    code: p.code,
    salutation: p.salutation,
    name: p.name,
    fatherHusbandName: p.fatherHusbandName,
    dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth) : null,
    ageAtRegistration: p.ageAtRegistration,
    gender: p.gender,
    bloodGroup: p.bloodGroup,
    occupation: p.occupation,
    phone: p.phone,
    mobile: p.mobile,
    addressLine1: p.addressLine1,
    addressLine2: p.addressLine2,
    addressLine3: p.addressLine3,
    city: p.city,
    pincode: p.pincode,
    referringPhysician: p.referringPhysician,
    physicianPhone: p.physicianPhone,
    remarks: p.remarks,
    isActive: true,
  }));
  const patCount = await batchCreate(prisma.patient, patientData);
  progress("Patient", patCount, patientData.length);

  // Build patient lookup: legacy code → prisma id
  const patCodeToId = new Map<number, number>();
  console.log("  Building patient lookup...");
  const allPatientCodes = await prisma.patient.findMany({ select: { id: true, code: true } });
  for (const p of allPatientCodes) {
    if (p.code !== null) patCodeToId.set(p.code, p.id);
  }
  console.log(`  Patient lookup: ${patCodeToId.size} entries`);

  // ─── 8. PatientDiseases ───
  console.log("8. Patient Diseases...");
  const patientDiseases = load<any>("patient-diseases.json");
  const pdData = patientDiseases
    .filter((pd: any) => pd.patientCode && pd.diseaseName && patCodeToId.has(pd.patientCode) && diseaseMap.has(pd.diseaseName))
    .map((pd: any) => ({
      patientId: patCodeToId.get(pd.patientCode)!,
      diseaseId: diseaseMap.get(pd.diseaseName)!,
    }));
  const pdCount = await batchCreate(prisma.patientDisease, pdData);
  progress("PatientDisease", pdCount, pdData.length);

  // ─── 9. Visits ───
  console.log("9. Visits (this is the big one — 102k rows)...");
  const visits = load<any>("visits.json");

  // Pre-process: sort by caseNo to maintain order
  const sortedVisits = visits
    .filter((v: any) => v.caseNo && v.patientCode && patCodeToId.has(v.patientCode))
    .sort((a: any, b: any) => a.caseNo - b.caseNo);

  const visitData = sortedVisits.map((v: any) => ({
    caseNo: v.caseNo,
    patientId: patCodeToId.get(v.patientCode)!,
    visitDate: v.visitDate ? new Date(v.visitDate) : new Date("2003-01-01"),
    visitType: "NEW" as const,
    operationId: v.operationCode ? opCodeToId.get(v.operationCode) ?? null : null,
    operationRate: v.operationRate,
    discount: v.discount ?? 0,
    doctorId: v.doctorCode ? doctorCodeToId.get(v.doctorCode) ?? null : null,
    assistingDoctorId: v.assistingDoctorCode ? doctorCodeToId.get(v.assistingDoctorCode) ?? null : null,
    doctorCommissionPercent: v.doctorPercent,
    labId: v.labCode ? labCodeToId.get(v.labCode) ?? null : null,
    labRateId: v.labCode && v.labRateCode ? labRateToId.get(`${v.labCode}_${v.labRateCode}`) ?? null : null,
    labRateAmount: v.labRateAmount ?? 0,
    labQuantity: v.labQuantity ?? 1,
  }));

  const visitCount = await batchCreate(prisma.visit, visitData);
  progress("Visit", visitCount, visitData.length);

  // Build visit lookup: caseNo → prisma id
  console.log("  Building visit lookup...");
  const caseNoToVisitId = new Map<number, number>();
  const allVisitIds = await prisma.visit.findMany({ select: { id: true, caseNo: true } });
  for (const v of allVisitIds) {
    if (v.caseNo !== null) caseNoToVisitId.set(v.caseNo, v.id);
  }
  console.log(`  Visit lookup: ${caseNoToVisitId.size} entries`);

  // ─── 10. Receipts ───
  console.log("10. Receipts (110k rows)...");
  const receipts = load<any>("receipts.json");
  const receiptData = receipts
    .filter((r: any) => r.caseNo && caseNoToVisitId.has(r.caseNo))
    .map((r: any) => ({
      receiptNo: r.receiptNo,
      visitId: caseNoToVisitId.get(r.caseNo)!,
      receiptDate: r.receiptDate ? new Date(r.receiptDate) : new Date("2003-01-01"),
      amount: r.amount ?? 0,
      paymentMode: r.paymentMode || "Cash",
      isDuplicate: r.isDuplicate ?? false,
    }));
  const rcptCount = await batchCreate(prisma.receipt, receiptData);
  progress("Receipt", rcptCount, receiptData.length);

  // ─── 11. Clinical Reports ───
  console.log("11. Clinical Reports...");
  const reports = load<any>("clinical-reports.json");
  const reportData = reports
    .filter((r: any) => r.caseNo && caseNoToVisitId.has(r.caseNo) && r.doctorCode && doctorCodeToId.has(r.doctorCode))
    .map((r: any) => ({
      visitId: caseNoToVisitId.get(r.caseNo)!,
      reportDate: r.reportDate ? new Date(r.reportDate) : new Date("2003-01-01"),
      doctorId: doctorCodeToId.get(r.doctorCode)!,
      examination: r.examination,
      diagnosis: r.diagnosis,
      treatmentNotes: r.treatmentNotes,
      estimate: r.estimate,
      medication: r.medication,
    }));
  // Clinical reports have unique(visitId) constraint — deduplicate by visitId
  const seenVisitIds = new Set<number>();
  const uniqueReports = reportData.filter((r: any) => {
    if (seenVisitIds.has(r.visitId)) return false;
    seenVisitIds.add(r.visitId);
    return true;
  });
  const reportCount = await batchCreate(prisma.clinicalReport, uniqueReports);
  progress("ClinicalReport", reportCount, uniqueReports.length);

  // ─── 12. Patient Files (metadata only — actual images need separate copy) ───
  console.log("12. Patient Files (metadata)...");
  const patientFiles = load<any>("patient-files.json");
  const pfData = patientFiles
    .filter((pf: any) => pf.patientCode && pf.filePath && patCodeToId.has(pf.patientCode))
    .map((pf: any) => ({
      patientId: patCodeToId.get(pf.patientCode)!,
      filePath: `/uploads/patients/${pf.patientCode}/${pf.filePath}`,
      fileName: pf.filePath,
      description: pf.description,
      fileType: pf.filePath?.toLowerCase().endsWith(".jpg") ? "image/jpeg" : "application/octet-stream",
      category: "XRAY",
    }));
  const pfCount = await batchCreate(prisma.patientFile, pfData);
  progress("PatientFile", pfCount, pfData.length);

  // ─── 13. Clinic Settings ───
  console.log("13. Clinic Settings...");
  await prisma.clinicSettings.create({
    data: {
      name: "Secunderabad Dental Hospital",
      addressLine1: "S.D. Road, Secunderabad",
      city: "Secunderabad",
      state: "Telangana",
      pincode: "500003",
    },
  });
  progress("ClinicSettings", 1, 1);

  // ─── Summary ───
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║  Import Complete (${elapsed}s)             ║`);
  console.log(`╚══════════════════════════════════════╝`);
  console.log(`  Doctors:          ${docCount.toLocaleString()}`);
  console.log(`  Operations:       ${opCount.toLocaleString()}`);
  console.log(`  Labs:             ${labCount.toLocaleString()}`);
  console.log(`  Lab Rates:        ${lrCount.toLocaleString()}`);
  console.log(`  Patients:         ${patCount.toLocaleString()}`);
  console.log(`  Patient Diseases: ${pdCount.toLocaleString()}`);
  console.log(`  Visits:           ${visitCount.toLocaleString()}`);
  console.log(`  Receipts:         ${rcptCount.toLocaleString()}`);
  console.log(`  Clinical Reports: ${reportCount.toLocaleString()}`);
  console.log(`  Patient Files:    ${pfCount.toLocaleString()}`);
}

main()
  .catch((e) => {
    console.error("Import failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
