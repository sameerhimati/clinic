# Session Handoff
> Last updated: 2026-03-03 (Session 27 — Consultation Flow)

## Completed This Session
- [x] **Fix duplicate plans bug** — Idempotency guard in `createPlansFromConsultation()`: checks `TreatmentPlanItem.findFirst({ where: { visitId } })`, returns early if plans already linked. Client clears `selectedTreatments` after save.
- [x] **Fix RCT template** — Reduced from 5 steps to 3 (Initial Assessment, Access Opening, BMP / Obturation). Crown Prep/Fitting removed — those belong to Crown PFM's own template. Patient 3 seed plan split into separate RCT + Crown plans.
- [x] **Auto-suggest linked treatments** — `suggestsOperationId` self-relation on Operation. RCT → Crown PFM seeded. Blue banner: "Ceramic Crown - PFM is typically needed after Root Canal Treatment" with Dismiss/Add buttons.
- [x] **Inline scheduling** — Multi-step treatments auto-initialize scheduling row (doctor, date = today + step2.defaultDayGap, time = 10:00 AM). Single-step treatments show no scheduling. `createPlansFromConsultation` extended with `schedules` param to create appointments linked to plan items. Toast: "3 plans created, 2 appointments scheduled".
- [x] **All verified with Playwright** — Full flow tested: select RCT → suggestion → accept Crown → add Extraction → save → patient page shows 3 plans + 2 appointments. Second save → no duplicates.

## Current State
- **Branch:** main
- **Build:** Passing (37 routes)
- **Uncommitted changes:** schema.prisma, seed.ts, examine actions/page/form (all working, tested)
- **DB:** Fresh re-seed with fixed RCT (3 steps), Crown PFM (3 steps), RCT→Crown suggestion link
- **Blockers:** None

## Next Session Should

### Priority 1: Consultant Availability & Smart Scheduling
The inline scheduling currently allows any doctor on any day. Need:

1. **Consultant availability model** — New `DoctorAvailability` table:
   - `doctorId`, `dayOfWeek` (0=Sun–6=Sat), `startTime`, `endTime`
   - E.g., Ramana Reddy: Wed (10–2), Sat (10–1); Anitha: Tue (10–2), Thu (10–2)
   - Admin manages via `/doctors/[id]/edit` or `/settings/availability`

2. **Smart date picker in exam form** — When BDS doctor selects a consultant:
   - Date input restricts to that consultant's available days
   - Time dropdown shows only that consultant's hours
   - Helper text: "Dr. Ramana Reddy available Wed, Sat"

3. **Only schedule next step** — Current implementation already does this (only step 2), but the plan shows "Schedule: Access Opening" button on the patient page for manual scheduling of later steps. This is correct.

### Priority 2: Legacy Data Migration (CF-4)
User is visiting the clinic machine — see "Data Migration Guide" section below.

### Priority 3: Phase 4 Reports
Operations, Lab, Discount, Receipts, Doctor-Patient, Patient Directory reports.

---

## Data Migration Guide — What to Get from the Clinic Machine

### The Gap Problem
- **CLINIC.SQL** (in archive): Oct 2020 dump — ~3 years of data missing
- **CLINIC03.DBS** (in archive): Sep 2023 live DB — most current but binary SQLBase format
- **The clinic may have kept running** after Sep 2023 — need to check what's on the actual machine now

### What to Get

#### 1. Fresh SQL Dump (CRITICAL)
The most important thing. The old CLINIC.SQL is from Oct 2020. You need a fresh one from the live machine.

**On the clinic Windows machine:**
- Find `SQLTalk` (SQLBase query tool) — should be in Start Menu or `D:\SB850\`
- Connect to database `CLINIC03` as user `SYSADM`
- Run: `UNLOAD DATABASE CLINIC03 TO 'D:\CLINIC_EXPORT_2026.SQL'`
- Or use the backup: `BACKUP DATABASE CLINIC03 TO 'D:\CLINIC03_BACKUP.BKP'`
- **Copy the .SQL file to a USB drive**

If SQLTalk isn't easy to find, just **copy these files**:
- `D:\SB850\CLINIC03\CLINIC03.DBS` (the live database file, ~260MB+)
- `D:\SB850\CLINIC03\*.LOG` (transaction logs)

#### 2. Check if the System is Still Running
- Is `dbnt5sv.exe` (SQLBase server) running in Task Manager / Services?
- Is `CLINIC.exe` still being used daily? When was the last patient entry?
- Check the most recent files in `D:\ctd21\` — any `.SQL` dumps newer than Oct 2020?

#### 3. Record Counts (if you can get SQLTalk open)
```sql
SELECT COUNT(*) FROM PATIENT;        -- expected ~40,000+
SELECT COUNT(*) FROM HISTORY;        -- expected ~80,000+
SELECT COUNT(*) FROM RECEIPT;        -- expected ~20,000+
SELECT COUNT(*) FROM DR_REPORT;      -- clinical reports
SELECT COUNT(*) FROM PATIENT_FILES;  -- file records
SELECT MAX(P_CODE) FROM PATIENT;     -- highest patient code
SELECT MAX(H_CASE_NO) FROM HISTORY;  -- highest case number
SELECT MAX(R_NO) FROM RECEIPT;       -- highest receipt number
```

#### 4. Patient Photos & Scanned Reports
- `D:\ctd21\PATIENT\` — patient photo folders (by patient code)
- `D:\ctd21\Patients Scanned Reports\` — scanned documents
- Check if there are more folders/files than what's in the archive (32 patient folders in PATIENT, 30 in Scanned Reports)
- **Copy any new patient photo/scan folders** that aren't in the archive

#### 5. Check for Schema Changes
The clinic may have added fields or tables since 2020. Quick check:
```sql
SELECT * FROM SYSTABLES WHERE CREATOR = 'SYSADM';
```
Compare against the 25 tables we know about.

#### 6. Configuration
- `D:\ctd21\sql.ini` — check if server IP changed from `192.168.0.99:2155`
- `D:\ctd21\CONFIG.INI` — any new settings?
- `D:\SB850\sql.ini` — server configuration

### What We Already Have (No Need to Re-Copy)
- Application binary (`CLINIC.exe`, `Clinic1.apt`) — won't change
- Runtime DLLs, installers, SQLBase engine — not needed
- SQLBase documentation — already reviewed
- The Oct 2020 SQL dump — useful as baseline comparison

### Legacy → New App Field Mapping (Already Designed)

| Legacy Table | Legacy Field | New Model | New Field |
|---|---|---|---|
| PATIENT | P_CODE | Patient | code |
| PATIENT | P_NAME | Patient | name |
| PATIENT | P_F_NAME | Patient | fatherHusbandName |
| PATIENT | P_ADDR1–5 | Patient | addressLine1–3, city, pincode |
| PATIENT | P_AGE | Patient | ageAtRegistration |
| PATIENT | P_SEX | Patient | gender |
| HISTORY | H_CASE_NO | Visit | caseNo |
| HISTORY | H_P_CODE | Visit | patientId (via Patient.code lookup) |
| HISTORY | H_OP_CODE | Visit | operationId (via Operation.code lookup) |
| HISTORY | H_OP_RATE | Visit | operationRate |
| HISTORY | H_D_CODE | Visit | doctorId (via Doctor.code lookup) |
| HISTORY | H_DATE | Visit | visitDate |
| HISTORY | H_L_CODE | Visit | labId |
| HISTORY | H_LR_CODE | Visit | labRateId |
| HISTORY | H_L_RATE | Visit | labRateAmount |
| HISTORY | H_L_QTY | Visit | labQuantity |
| HISTORY | H_DISCOUNT | Visit | discount |
| HISTORY | H_D_PERCENT | Visit | doctorCommissionPercent |
| RECEIPT | R_CASE_NO | Receipt | visitId (via Visit.caseNo lookup) |
| RECEIPT | R_DATE | Receipt | receiptDate |
| RECEIPT | R_AMT | Receipt | amount |
| RECEIPT | R_NO | Receipt | receiptNo |
| RECEIPT | R_MODE | Receipt | paymentMode |
| DR_REPORT | DR_CASE_NO | ClinicalReport | visitId (via caseNo) |
| DR_REPORT | DR_EXAM | ClinicalReport | examination |
| DR_REPORT | DR_DIAG | ClinicalReport | diagnosis |
| DR_REPORT | DR_TREATMENT | ClinicalReport | treatmentNotes |
| DR_REPORT | DR_ESTIMATE | ClinicalReport | estimate |
| DR_REPORT | DR_MED | ClinicalReport | medication |
| PATIENT_FILES | PF_CODE | PatientFile | patientId (via code) |
| PATIENT_FILES | PF_PATH | PatientFile | filePath + fileName |

### Key Gotchas for Import
- Patient codes are stable (same P_CODE → Patient.code)
- Doctor codes are stable (same D_CODE → Doctor.code)
- Operation codes are stable (same OP_CODE → Operation.code)
- Case numbers (H_CASE_NO) may have gaps — that's fine
- Receipt numbers (R_NO) are `DOUBLE PRECISION` in legacy — some may be NULL (early records)
- HISTORY has ~80K+ rows — the biggest import
- Some PATIENT records have P_CODE=1, P_NAME="X" (test/placeholder — skip)
- PATIENT_FILES paths are like `"10006_30122013124032.JPG"` — need to map to `uploads/patients/{code}/` structure
- DR_REPORT uses DR_COMPL_CODE → COMPLAINT table for complaint text
- Legacy has no visitType/parentVisitId — all visits are flat (no follow-up chains)

## Start Command
```bash
export PATH="$HOME/.bun/bin:$PATH"
cd /Users/sameer/Desktop/Code/clinic/clinic-app
bun dev
```
