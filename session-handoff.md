# Session Handoff
> Last updated: 2026-03-04 (Session 28 — Commit + Handoff)

## Completed This Session
- [x] **Committed & pushed** all Session 27 work (consultation flow: auto-suggest, inline scheduling, duplicate fix, RCT template fix)
- [x] **Updated ROADMAP.md** — added Consultation Flow [DONE], File Infrastructure [DONE], Consultant Availability plan, expanded CF-4 data migration details

## Current State
- **Branch:** main (all pushed, clean)
- **Build:** Passing (37 routes)
- **DB:** Fresh re-seed with fixed RCT (3 steps), Crown PFM (3 steps), RCT→Crown suggestion link
- **Blockers:** None

## Next Session Should

### Priority 1: Explore Legacy Data for Migration
User visited clinic machine (Mar 3) and retrieved data onto USB (`/Volumes/NO NAME/`).

**What's on the USB (NEW — from the live clinic machine):**
- `CLINIC03.DBS` (Mar 3, 2026, **314MB**) — **CURRENT live database**, up from 260MB in Sep 2023
- `CLINIC03 (2).DBS` — identical copy of above
- `PATIENT/` — 32 patient photo folders (same set as archive: 10001–10030 + 32147.jpg + 8071)
- `Patients Scanned Reports/` — 30 folders (same set as archive: 10001–10030)
- No fresh SQL text dump — only binary `.DBS` files

**What we already have in `clinic-legacy/Archive/`:**
- `CLINIC.SQL` (Oct 2020, 14MB, 326K lines) — **best readable source**, but 5+ years old
- `CLINIC03.DBS` (Sep 2023, 260MB) — older binary copy
- Day-of-week backups in `Archive/Clinic/BACKUP/clinic03/` (WED=Aug 2023 258MB, etc.)
- Config: `sql.ini` shows path changed `D:\SB850` → `E:\SB850`, server on localhost

**The picture:**
- The clinic is still running! DB grew 260MB → 314MB (Sep 2023 → Mar 2026 = 2.5 more years of data)
- Patient photos/scans haven't grown (still 32 folders) — they may have stopped scanning
- We have the CURRENT live `.DBS` but it's binary SQLBase format — need SQLBase to read it
- Our only readable SQL dump is from Oct 2020 — 5+ years behind the live DB

**First steps next session:**
1. Copy `CLINIC03.DBS` from USB into `clinic-legacy/` for safekeeping
2. Parse `CLINIC.SQL` (Oct 2020) — extract record counts, understand full structure, write import script
3. Research SQLBase `.DBS` → SQL conversion (run SQLBase 8.5 in Docker/Wine, use the `sqltalk.exe` + `dbnt5sv.exe` we have in archive, or find a converter)
4. Decide: import Oct 2020 data now (gets us 20+ years of history), then delta from binary later?

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

## Legacy Data Inventory

### SQL Dumps (readable text)
| File | Date | Size | Notes |
|------|------|------|-------|
| `CLINIC04.SQL` | Feb 2014 | 7.2MB | Oldest |
| `c.sql` | Aug 2014 | 8.6MB | |
| `CLINIC03.SQL` | Sep 2014 | 8.6MB | |
| `C1.SQL` | Feb 2016 | 10MB | |
| **`CLINIC.SQL`** | **Oct 2020** | **14MB** | **Best readable source — 326K lines** |

### Binary DB Files (need SQLBase to read)
| File | Date | Size | Notes |
|------|------|------|-------|
| `CLINIC03.BKP` (root) | Sep 2020 | 160MB | Backup |
| `CLINIC03.BKP` (SAT) | Oct 2020 | 161MB | Near SQL dump date |
| `CLINIC03.BKP` (MON) | May 2022 | 199MB | |
| `CLINIC03.BKP` (08062022) | Jun 2022 | 202MB | |
| `CLINIC03.BKP` (TUE) | Feb 2023 | 247MB | |
| `CLINIC03.BKP` (WED) | Aug 2023 | 258MB | |
| `CLINIC03.DBS` (archive) | Sep 2023 | 260MB | Previous most-current |
| **`CLINIC03.DBS` (USB)** | **Mar 2026** | **314MB** | **CURRENT live DB from clinic machine** |

**The gap**: Readable SQL is Oct 2020, but DB grew 161MB→314MB through Mar 2026 (~5.5 years of binary-only data).

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
