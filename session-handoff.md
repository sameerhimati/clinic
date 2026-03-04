# Session Handoff
> Last updated: 2026-03-04 (Session 28 — Data Exploration)

## Completed This Session
- [x] **Committed & pushed** all Session 27 work (consultation flow: auto-suggest, inline scheduling, duplicate fix, RCT template fix)
- [x] **Updated ROADMAP.md** — added Consultation Flow [DONE], File Infrastructure [DONE], Consultant Availability plan, expanded CF-4 data migration details
- [x] **Explored legacy SQL dump** (CLINIC.SQL, Oct 2020) — full table inventory, record counts, schemas, date ranges
- [x] **Inventoried USB data** — live CLINIC03.DBS (314MB, Mar 2026) retrieved from clinic machine
- [x] **Compared legacy vs new app** — established import strategy

## Current State
- **Branch:** main (all pushed, clean)
- **Build:** Passing (37 routes)
- **DB:** Seed data only (50 patients, 49 visits — all fake, will be replaced at import time)
- **USB:** `/Volumes/NO NAME/` — live database from clinic machine
- **Blockers:** Can't read the binary `.DBS` file yet — need SQLBase server or converter

---

## Next Session Should

### Priority 1: Crack Open the USB Database
The USB has `CLINIC03.DBS` (314MB, Mar 3 2026) — the live, current clinic database in binary SQLBase 8.5 format. We need to read it.

**Approach options (try in order):**
1. **Run SQLBase on macOS via Wine/CrossOver** — we have `dbnt5sv.exe` (server) + `sqltalk.exe` (query tool) in `Archive/SB850/`. Point at the USB's `.DBS` file, start server, connect with SQLTalk, run `UNLOAD DATABASE`.
2. **Run SQLBase in Docker (Windows container)** — if Wine doesn't work
3. **ODBC bridge** — SQLBase has ODBC drivers (`SqlBaseODBC.dll`), might work via Wine + unixODBC
4. **Research third-party converters** — any tool that reads SQLBase `.DBS` format directly
5. **Last resort** — return to clinic with SQLTalk on the actual Windows machine and run the UNLOAD command there

**Goal:** Get a readable SQL text dump from the Mar 2026 `.DBS` file. Once we have that, we can compare against the Oct 2020 dump and see 5+ years of new data.

### Priority 2: Consultant Availability & Smart Scheduling
The inline scheduling currently allows any doctor on any day. Need:

1. **Consultant availability model** — New `DoctorAvailability` table:
   - `doctorId`, `dayOfWeek` (0=Sun–6=Sat), `startTime`, `endTime`
   - E.g., Ramana Reddy: Wed (10–2), Sat (10–1); Anitha: Tue (10–2), Thu (10–2)
   - Admin manages via `/doctors/[id]/edit` or `/settings/availability`

2. **Smart date picker in exam form** — When BDS doctor selects a consultant:
   - Date input restricts to that consultant's available days
   - Time dropdown shows only that consultant's hours
   - Helper text: "Dr. Ramana Reddy available Wed, Sat"

### Priority 3: Phase 4 Reports
Operations, Lab, Discount, Receipts, Doctor-Patient, Patient Directory reports.

---

## Legacy Data Analysis (Oct 2020 SQL Dump)

### Record Counts
| Table | Legacy (Oct 2020) | New App (seed) | Notes |
|-------|-------------------|----------------|-------|
| **Patients** | 30,443 | 50 (fake) | Codes up to 371,202 (with gaps) |
| **Visits (HISTORY)** | 79,769 | 49 (fake) | Case numbers up to 80,316 |
| **Receipts** | 85,180 | 30 (fake) | Receipt numbers up to 152,641 |
| **Clinical Reports (DR_REPORT)** | 5,261 | 19 (fake) | Exam/diagnosis/treatment notes |
| **Patient Files** | 63,001 | 10 (fake) | File path references |
| **Doctors** | 122 | 20 (real + fake) | KAZIM, SURENDER, RAMANA REDDY all present |
| **Operations** | 111 | 65 (real, current fees) | Keep current, import missing as inactive |
| **Labs** | 28 | 8 (real, current) | Keep current 8, import old as inactive |
| **Lab Rates** | 168 | 71 (real, current) | Keep current rates |
| **Appointments** | 34 | 26 (fake) | New model, no legacy equivalent |
| **Treatment Plans** | — | 6 (fake) | New feature |
| **Treatment Steps** | — | 17 (real) | New feature |
| **Rooms** | — | 5 (real) | New feature |

**Date range:** 2000–2020 (~20 years). USB `.DBS` extends this to Mar 2026.

### Auto-Increment Seeds (after import)
| Field | Legacy Max | Must Start After |
|-------|-----------|-----------------|
| Patient Code | 371,202 | 371,203+ |
| Case Number | 80,316 | 80,317+ |
| Receipt Number | 152,641 | 152,642+ |
| Doctor Code | 122 | 123+ |

### Import Strategy (when ready)
1. Wipe all seed patients/visits/receipts/reports/files (all fake)
2. Import legacy doctors (122) — merge with existing real ones by code, mark retired as inactive
3. Import legacy operations (111) — merge with existing 65 by code, mark old ones inactive, **keep current fees**
4. Import legacy labs (28) — merge with existing 8, mark old ones inactive
5. Import legacy lab rates (168) — attach to labs, **keep current rates for active labs**
6. Import all patients, visits, receipts, clinical reports, patient file references
7. Set auto-increment sequences above legacy max values
8. **Don't touch:** appointments, treatment plans, steps, rooms (new features)

### Legacy Schema (key tables)

**PATIENT** (19 cols): P_CODE, P_NAME, P_F_NAME, P_ADDR1–5, P_PHY, P_PHY_PHONE, P_AGE, P_SEX, P_OCCUPATION, P_BLOOD_GROUP, P_PHONE, P_DOB, P_REMARKS (LONG VARCHAR — multi-line `$long`/`~`/`//` format), P_MOBILE, P_SALUTATION

**HISTORY** (15 cols): H_P_CODE, H_OP_CODE, H_OP_RATE, H_DATE, H_D_CODE, H_CASE_NO, H_L_CODE, H_LR_CODE, H_L_RATE, H_L_QTY, H_DISCOUNT, H_D_CODE1 (second doctor), H_D_PERCENT, H_D_PERCENT1 (second doctor %), H_DOC_CHARGE

**RECEIPT** (6 cols): R_DATE, R_DUP, R_CASE_NO, R_AMT, R_NO, R_MODE

**DR_REPORT** (11 cols): DR_SERIAL, DR_CASE_NO, DR_DATE, DR_D_CODE, DR_COMPL_CODE (FK→COMPLAINT), DR_EXAM, DR_DIAG, DR_TREAT (FK→TREATMENT), DR_TREATMENT, DR_ESTIMATE, DR_MED

**PATIENT_FILES** (5 cols): PF_CODE, PF_PATH, PF_DESC, PF_MOD_DATE, PF_MOD_USER

**Also:** COMPLAINT (16 rows), TREATMENT (13 rows), DISEASE (18 rows), PATIENT_DISEASE (100 rows)

### Data Quality Issues
- 3 garbage patient records with codes >300M (names "cc", "XYZWV") — skip
- Some dates outside sane range (year 0200, 2033) — clamp or skip
- PATIENT.P_REMARKS uses `$long`/`~`/`//` multi-line delimiters — needs special parser
- Receipt R_NO is DOUBLE PRECISION — some may be NULL on early records
- HISTORY has H_D_CODE1 + H_D_PERCENT1 for second doctor — our Visit model doesn't have this yet

### Field Mapping

| Legacy | → | New App |
|--------|---|---------|
| PATIENT.P_CODE | → | Patient.code |
| PATIENT.P_NAME | → | Patient.name |
| PATIENT.P_F_NAME | → | Patient.fatherHusbandName |
| PATIENT.P_ADDR1–3 | → | Patient.addressLine1–3 |
| PATIENT.P_ADDR4 | → | Patient.city |
| PATIENT.P_ADDR5 | → | Patient.pincode |
| PATIENT.P_AGE | → | Patient.ageAtRegistration |
| PATIENT.P_SEX | → | Patient.gender |
| PATIENT.P_PHONE | → | Patient.phone |
| PATIENT.P_MOBILE | → | Patient.mobile |
| PATIENT.P_DOB | → | Patient.dateOfBirth |
| PATIENT.P_SALUTATION | → | Patient.salutation |
| PATIENT.P_OCCUPATION | → | Patient.occupation |
| PATIENT.P_BLOOD_GROUP | → | Patient.bloodGroup |
| HISTORY.H_CASE_NO | → | Visit.caseNo |
| HISTORY.H_P_CODE | → | Visit.patientId (via code lookup) |
| HISTORY.H_OP_CODE | → | Visit.operationId (via code lookup) |
| HISTORY.H_OP_RATE | → | Visit.operationRate |
| HISTORY.H_D_CODE | → | Visit.doctorId (via code lookup) |
| HISTORY.H_DATE | → | Visit.visitDate |
| HISTORY.H_DISCOUNT | → | Visit.discount |
| HISTORY.H_D_PERCENT | → | Visit.doctorCommissionPercent |
| HISTORY.H_L_CODE | → | Visit.labId |
| HISTORY.H_LR_CODE | → | Visit.labRateId |
| HISTORY.H_L_RATE | → | Visit.labRateAmount |
| HISTORY.H_L_QTY | → | Visit.labQuantity |
| RECEIPT.R_CASE_NO | → | Receipt.visitId (via caseNo lookup) |
| RECEIPT.R_DATE | → | Receipt.receiptDate |
| RECEIPT.R_AMT | → | Receipt.amount |
| RECEIPT.R_NO | → | Receipt.receiptNo |
| RECEIPT.R_MODE | → | Receipt.paymentMode |
| DR_REPORT.DR_CASE_NO | → | ClinicalReport.visitId (via caseNo) |
| DR_REPORT.DR_EXAM | → | ClinicalReport.examination |
| DR_REPORT.DR_DIAG | → | ClinicalReport.diagnosis |
| DR_REPORT.DR_TREATMENT | → | ClinicalReport.treatmentNotes |
| DR_REPORT.DR_ESTIMATE | → | ClinicalReport.estimate |
| DR_REPORT.DR_MED | → | ClinicalReport.medication |
| DR_REPORT.DR_COMPL_CODE | → | ClinicalReport.complaint (via COMPLAINT join) |
| PATIENT_FILES.PF_CODE | → | PatientFile.patientId (via code) |
| PATIENT_FILES.PF_PATH | → | PatientFile.filePath + fileName |

### Key Gotchas
- Patient codes are stable (same P_CODE → Patient.code)
- Doctor codes are stable (same D_CODE → Doctor.code)
- Operation codes are stable (same OP_CODE → Operation.code)
- HISTORY has H_D_CODE1 for second doctor — need to decide if we add this field or ignore
- Legacy has no visitType/parentVisitId — all visits are flat (no follow-up chains)
- PATIENT_FILES paths like `"10006_30122013124032.JPG"` → remap to `uploads/patients/{code}/`

---

## Start Command
```bash
export PATH="$HOME/.bun/bin:$PATH"
cd /Users/sameer/Desktop/Code/clinic/clinic-app
bun dev
```
