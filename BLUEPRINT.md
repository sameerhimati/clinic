# BLUEPRINT — Secunderabad Dental Hospital
## Legacy Software Reverse-Engineering & Modernization Plan

---

## 1. Executive Summary

**Secunderabad Dental Hospital — Centre for Advanced Dental Care** is a dental clinic located at 1-2-261/4-6, S.D. Road, Opp. Minerva Complex, Secunderabad 500003, Telangana, India. The clinic has been operating since at least the year 2000 and manages its patient records, billing, doctor commissions, and reporting through a custom-built desktop application.

The software was built using **Centura Team Developer 2.1** (a proprietary RAD tool by Gupta Technologies) with a **Gupta SQLBase 8.5** database backend. The application runs as a Win32 desktop program (`CLINIC.exe`) connected to a local SQLBase server over TCP/IP (port 2155 on 192.168.0.99).

**Scale of data:**
- **~30,427 patients** registered over 20+ years
- **~79,770 treatment/procedure records** (HISTORY table)
- **~85,181 payment receipts** totaling an unknown sum in INR
- **~63,002 patient file attachments** (scanned documents, X-rays, photos)
- **~5,262 clinical examination reports**
- **122 doctors/staff** tracked (many visiting consultants)
- **100+ dental procedure types** with pricing
- **28 dental laboratories** with rate cards
- Data range: **Sep 2000 — Oct 2020** (SQL dump), with the live database extending to **Sep 2023**

---

## 2. Complete Feature Map

### 2.1 Patient Management

**Form:** `frmPatient` (permission item 150)

**Fields captured:**
| Field | Column | Type | Notes |
|-------|--------|------|-------|
| Patient Code | P_CODE | INTEGER | Auto-generated sequential (MAX+1) |
| Salutation | P_SALUTATION | VARCHAR(5) | Mr, Mrs, Ms, Baby, Master, Dr |
| Name | P_NAME | VARCHAR(30) | Required field |
| Father/Husband Name | P_F_NAME | VARCHAR(30) | Indian convention |
| Address Lines 1-5 | P_ADDR1-5 | VARCHAR(30-40) | Multi-line address |
| Referring Physician | P_PHY | VARCHAR(40) | |
| Physician Phone | P_PHY_PHONE | VARCHAR(20) | |
| Age | P_AGE | NUMBER | Age at registration |
| Sex | P_SEX | CHAR(1) | M or F |
| Date of Birth | P_DOB | DATE | Added in later version |
| Occupation | P_OCCUPATION | VARCHAR(40) | |
| Blood Group | P_BLOOD_GROUP | VARCHAR(10) | |
| Phone | P_PHONE | VARCHAR(40) | |
| Mobile | P_MOBILE | VARCHAR(15) | Added v1.19; auto-populated from P_PHONE if 10 digits |
| Remarks | P_REMARKS | LONG VARCHAR | Free-text clinical notes |

**Medical History Checklist (PATIENT_DISEASE):**
Heart Disease, High Blood Pressure, Asthma, Stroke/Seizures/Convulsions, Psychiatric Treatment, Blood Disorder/Bleeding tendency, Stomach Ulcer, Diabetes, Thyroid, Kidney problem, Hepatitis, Liver disease, HIV Infection, Tuberculosis, Arthritis/Rheumatism, Allergies, Pregnant, Birth Control Pills

**Workflow:**
1. Auto-generates next patient code
2. Fills in patient demographics
3. Checks medical history diseases
4. Saves patient record
5. Patient form also hosts child tables: Treatment History, Receipts, Appointments, Diseases
6. Patient photos/scanned documents can be captured via TWAIN scanner

**Validation rules:**
- Patient name is required
- Patient code auto-incremented (no manual entry)
- Delete cascades to receipts, appointments, and history

---

### 2.2 Treatment/Procedure Records

**Table:** `HISTORY` — the core transaction record

**Fields:**
| Field | Column | Description |
|-------|--------|-------------|
| Patient Code | H_P_CODE | FK to PATIENT |
| Case Number | H_CASE_NO | Globally sequential visit ID (1-80,316+) |
| Date | H_DATE | Date of procedure |
| Operation Code | H_OP_CODE | FK to OPERATION |
| Operation Rate | H_OP_RATE | Amount charged (may differ from OPERATION.OP_MIN) |
| Doctor Code | H_D_CODE | Primary treating doctor |
| Second Doctor | H_D_CODE1 | Assisting doctor (if any) |
| Lab Code | H_L_CODE | Which lab did the prosthetic work |
| Lab Rate Code | H_LR_CODE | Which item from the lab's rate card |
| Lab Rate | H_L_RATE | Amount charged by lab |
| Lab Quantity | H_L_QTY | Number of units (e.g., 2 crowns) |
| Discount | H_DISCOUNT | Discount given to patient |
| Doctor Percent | H_D_PERCENT | Doctor's commission % for this case |
| Doctor Percent (2nd) | H_D_PERCENT1 | Second doctor's commission % |
| Doctor Charge | H_DOC_CHARGE | Calculated doctor payment |

**Procedure Categories (100+ types):**
- **Consultation:** REG/CONS (₹100), CONS.(CGHS) (₹35), CONS.(BSNL), CONS.(UNI), CHECKUP, CONS & X-RAY (₹150)
- **Periodontics:** Scaling, Curettage, Flap Surgery, Frenectomy, Gingivectomy, Crown Lengthening, Laser Flap Surgery, Laser Curettage
- **Endodontics:** RCT, Pulpotomy, Pulpectomy, Apicectomy, Post Core Build Up
- **Oral Surgery:** Extraction, Impaction, Wiring, Alveoloplasty, Biopsy, Abscess Incision, Fixation, Suturing, Incision Drainage, Surgical Excision, Neurectomy, Operculectomy
- **Restorative:** Filling, Comp Filling, Composites, Composite Repair, Temp Filling, Composite Crowns
- **Prosthodontics:** N.C. Crown/Bridge, C.D., R.P.D., F.P.D., C.P.D., S.S. Crown, Ceramic Crown/Bridge/Facing, Nickel Bridge, Acrylic Crown, All Ceramic, Gold Crown, Semi Precious Crown, Laminates, RPD Valplast, B.P.S. Denture, CD Repair, Denture Correction, Crown Cementing/Removal
- **Orthodontics:** Beggs, St. Wire, Ortho (Fixed/Removable), Appliance, Appliance Removal/Repair/Breakage, Retainer, Space Maintainer, Night Guard, Model Analysis, Mini Screws
- **Cosmetic:** Bleaching, Skyce (tooth gem), Polishing, Filler, Silicon Rod, Blepharoplasty, Ptosis Correction
- **Radiology:** I.O.P.A. (₹50), I.O.P.A (BSNL ₹70), I.O.P.A (CGHS), X-Ray, OPG
- **Other:** Implant, Dressing, Fluoride Application, Splinting, Splint, Tooth Mousse, G.A. Treatment

**Special pricing tiers:**
- Regular consultation: ₹100
- CGHS (Central Govt Health Scheme): ₹35
- BSNL employees: Separate rates
- University (UNI): Separate rates

---

### 2.3 Billing & Invoicing

**Receipt Table:** `RECEIPT`

| Field | Column | Description |
|-------|--------|-------------|
| Date | R_DATE | Payment date |
| Case Number | R_CASE_NO | FK to HISTORY.H_CASE_NO |
| Amount | R_AMT | Amount paid |
| Receipt Number | R_NO | Sequential receipt number (added later) |
| Payment Mode | R_MODE | Cash, CARD, Cheque, NEFT |
| Duplicate Flag | R_DUP | Marks duplicate receipts |

**Billing Logic:**
- Billing is per-procedure (each HISTORY row = one billable item)
- Multiple receipts per case supported (installment payments)
- `Billed Amount = H_OP_RATE - H_DISCOUNT`
- `Balance = Billed Amount - SUM(R_AMT for this case)`
- Receipt printing includes amount in words using Indian numbering (Crore, Lakh, Thousand)
- Receipt print format: `C_PSLIP.QRP` (payment slip), `C_REC.QRP` (receipt)

**Outstanding Calculation:**
```
For each patient/case:
  BilledAmount = OperationRate - Discount
  ReceivedAmount = SUM(all receipts for this case)
  Balance = BilledAmount - ReceivedAmount
  Show only where Balance > 0
```

**No GST/tax calculation** in the billing logic — the MISC table has GST_NO field but no tax computation exists in the code.

---

### 2.4 Doctor Commission System

This is the most complex business logic in the application.

**Commission Models:**

**A) Percentage-based (most doctors):**
```
Lab costs are deducted first, then percentage applied to remainder.

If PreviousPayments exist:
    If PreviousPayments >= LabRate:
        DoctorAmount = (ReceivedAmount × Percent) / 100
    Else:
        DoctorAmount = ((ReceivedAmount - (LabRate - PreviousPayments)) × Percent) / 100
Else:
    If (ReceivedAmount - LabRate) > 0:
        DoctorAmount = ((ReceivedAmount - LabRate) × Percent) / 100
    Else:
        DoctorAmount = 0
```

**B) Fixed-rate (some doctors):**
```
If PreviousPayments exist:
    DoctorAmount = (Rate + LabRate) - PreviousPayments
Else:
    If ReceivedAmount > (LabRate + Rate):
        DoctorAmount = Rate
    Else:
        DoctorAmount = ReceivedAmount - LabRate
```

**TDS (Tax Deducted at Source):**
```
TDS = Round((TDS_Percent × DoctorAmount) / 100)
NetCommission = Round(DoctorAmount - TDS)
ClinicAmount = ReceivedAmount - LabRate - DoctorAmount
```

**TDS Rate Selection:**
- If report FromDate >= TDS_Date: use new TDS rate (D_TDS_NEW)
- If FromDate < TDS_Date AND ToDate >= TDS_Date: error — must take separate reports
- If ToDate < TDS_Date: use old TDS rate (D_TDS)

**Doctor percentage history** tracked in `D_DETAILS` table (D_CODE, D_FROM, D_TO, D_PERCENT, D_RATE) allowing accurate historical commission calculations.

---

### 2.5 Appointment/Scheduling

**Table:** `APPOINT`

| Field | Column | Description |
|-------|--------|-------------|
| Case Number | A_CASE_NO | FK to HISTORY |
| Date | A_DATE | Appointment date |
| Time | A_TIME | Appointment time |

**Very basic scheduling:**
- Appointments are tied to existing cases (not standalone)
- Only ~35 records in the SQL dump — likely managed informally
- Used primarily for SMS reminder sending
- No calendar view, no conflict detection, no slot management

---

### 2.6 Reporting

**Report templates (.QRP files):**

| Report | File | Description |
|--------|------|-------------|
| Patient Details | C_PATIENT.QRP | Patient demographics + diseases checklist |
| Payment Slip | C_PSLIP.QRP | Receipt with amount in words |
| Receipt | C_REC.QRP | Alternate receipt format |
| Doctor Register (Summary) | C_DOCSUM.QRP | Commission summary by doctor, date range |
| Doctor Register (Detail) | C_DOCDET.QRP | Per-receipt detail commission report |
| Client Copy (Summary) | C_CLISUM.QRP | Doctor's copy of summary |
| Client Copy (Detail) | C_CLIDET.QRP | Doctor's copy of detail |
| Outstanding Dues | C_DUES.QRP | Patients with balances |
| Outstanding by Org | C_DUES_ORG.QRP | Dues grouped by organization |
| Operations All | C_Opall.qrp | All operations report |
| Operations Detail | C_Opdet.qrp | Detailed operations |
| Lab All | C_LABALL.QRP | All lab work |
| Lab Detail | C_LABDET.QRP | Detailed lab work |
| Discount | C_DISC.QRP | Discount report by date range |
| Doctor-Patient | c_docpat.qrp | Patients seen by specific doctor |
| Mailing Labels | C_MAIL*.QRP | Patient mailing labels (3 variants) |
| Phone List | C_PHONE.QRP | Patient phone directory |

**Report output modes:** Print (direct to printer with compressed mode), View (preview), File (save to file), Excel Export

---

### 2.7 User Authentication & Permissions

**Two-stage login:**
1. **Database login** (`dlgLogin`): Database name, DB username, DB password → establishes SQLBase connection
2. **Application login** (`dlgUserLogin`): Doctor/staff name + password → loads role permissions

**Permission system:**
- Users are stored in the `DOCTOR` table (D_NAME, D_PWD, D_DESIG, D_LEVEL)
- Designations: 1=DOCTOR, 2=RECEPTION, 3=Other
- Permission levels stored in `PERMISSIONS` table (PERM_LEVEL, PERM_ITEM, PERM_READ, PERM_WRITE, PERM_DEL)
- 31 form/screen items each with read/write/delete granularity
- SYSADM gets full access to everything

**Permission levels found:**
- Level 0 (SYSADM): Full access to all 31 forms
- Level 1 (Admin doctor): Full access
- Level 2 (Reception): Read-only access to Patient Form only
- Level 3 (Doctor limited): Read on most forms, write on reports/SMS/backup

---

### 2.8 SMS Integration

**Architecture:** SOAP web service via `comws.apl` library

**SMS types:**
1. **Appointment Reminders** (template 2): Sent to patients with appointments on selected date. Includes patient name, date, time.
2. **Doctor Notifications**: Sent to doctors about their patients' appointments.
3. **Birthday Wishes** (template 3): Matches patients by birth day/month.
4. **Recall Reminders**: Patients whose last visit was >6 months ago.
5. **Festival Greetings** (template 4): Sent to ALL patients with mobile numbers.

**Template placeholders:** `|PATIENTNAME|`, `|DATE|`, `|TIME|`, `|AMOUNT|`

**SMS gateway:** smshub.co.in, sender ID "SECDTL"

**Mobile number handling:** If 10 digits, prefix with `91` (India country code)

---

### 2.9 Document Scanning & Image Management

**Scanner integration:** TWAIN-based via AxImage ActiveX control
**Storage:** Files saved to `E:\Clinic Scanned\PATIENT\{patient_code}\{patient_code}_{timestamp}.JPG`
**Viewing:** PDF viewer via Acrobat ActiveX control
**Tracking:** `PATIENT_FILES` table (63,002 records)

---

### 2.10 Lab Management

**28 dental labs** with rate cards (LAB + LAB_RATE tables)
**Lab work items:** CER Crown, CER Bridge, CER Facing, N.C Crown, N.C Bridge, Temporary, Bleaching Tray, Complete Dentures, RPD Denture, C.P.D., Appliance, Repair, Night Guard, Splint, All Ceramic, 3D Ceramic, Laminates, Valplast, B.P.S. Dentures, etc.
**Per-case tracking:** Which lab, which item, rate, quantity — all in HISTORY table

---

### 2.11 Database Backup

**Built-in backup utility** (`dlgBackup`):
- Uses SQLBase snapshot backup API (`SqlBackUpSnapshot`)
- Backup directory organized by day-of-week (MON, TUE, WED, THU, SAT)
- Creates `.BKP` files + `.LOG` transaction logs
- Multiple backup copies found (160MB-258MB each)

---

### 2.12 Clinical Examination (DR_REPORT)

**Doctor's report form** (`mdiPatient` → diagnostics):
- Complaint (from COMPLAINT lookup)
- Examination findings (free text)
- Diagnosis (free text)
- Treatment performed (from TREATMENT lookup + free text)
- Estimate (free text)
- Medication prescribed (free text)

**~5,262 records** from 2004-2018. Feature appears to have been intermittently used.

---

### 2.13 Prescription Module (DRUGS, DOSAGE, PERIOD)

Tables created but **essentially unused** — only 1 drug ("Imol"), 1 dosage ("ABC"), and 3 periods ("2/3/4 DAYS"). Medications were entered as free text in DR_REPORT.DR_MED instead.

---

## 3. Database Schema

### 3.1 Entity-Relationship Diagram

```
┌──────────────┐         ┌──────────────┐
│   PATIENT    │         │   DOCTOR     │
│──────────────│         │──────────────│
│ P_CODE (PK)  │◄───┐    │ D_CODE (PK)  │◄──────────────────┐
│ P_NAME       │    │    │ D_NAME       │                    │
│ P_F_NAME     │    │    │ D_PERCENT    │     ┌──────────┐   │
│ P_ADDR1-5    │    │    │ D_TDS        │     │ D_DETAILS│   │
│ P_MOBILE     │    │    │ D_PWD        │     │──────────│   │
│ P_DOB        │    │    │ D_DESIG ─────│──►  │ D_CODE   │───┘
│ P_SEX        │    │    │ D_LEVEL ─────│──┐  │ D_FROM   │
│ P_AGE        │    │    └──────────────┘  │  │ D_TO     │
│ P_REMARKS    │    │                      │  │ D_PERCENT│
└──────────────┘    │    ┌──────────────┐  │  │ D_RATE   │
       │            │    │ PERMISSIONS  │  │  └──────────┘
       │            │    │──────────────│  │
       ▼            │    │ PERM_LEVEL◄──│──┘
┌──────────────┐    │    │ PERM_ITEM────│──► FORMNAME
│PATIENT_DISEASE│   │    │ PERM_READ    │
│──────────────│    │    │ PERM_WRITE   │
│ PD_CODE ─────│────┘    │ PERM_DEL     │
│ PD_NAME      │         └──────────────┘
└──────────────┘
       │                 ┌──────────────┐
       │            ┌───►│  OPERATION   │
       │            │    │──────────────│
       ▼            │    │ OP_CODE (PK) │
┌──────────────┐    │    │ OP_NAME      │
│   HISTORY    │    │    │ OP_MIN       │
│──────────────│    │    │ OP_MAX       │
│ H_P_CODE ────│────┘    └──────────────┘
│ H_CASE_NO    │◄───┐
│ H_DATE       │    │    ┌──────────────┐
│ H_OP_CODE ───│────┘    │    LAB       │
│ H_OP_RATE    │    ┌───►│──────────────│
│ H_D_CODE ────│──┐ │    │ L_CODE (PK)  │
│ H_D_CODE1    │  │ │    │ L_NAME       │
│ H_L_CODE ────│──│─┘    └──────┬───────┘
│ H_LR_CODE    │  │             │
│ H_L_RATE     │  │    ┌────────▼───────┐
│ H_L_QTY      │  │    │   LAB_RATE     │
│ H_DISCOUNT   │  │    │───────────────│
│ H_D_PERCENT  │  │    │ LR_L_CODE     │
│ H_DOC_CHARGE │  │    │ LR_CODE       │
└──────┬───────┘  │    │ LR_NAME       │
       │          │    │ LR_RATE       │
       ▼          │    └───────────────┘
┌──────────────┐  │
│   RECEIPT    │  │    ┌──────────────┐
│──────────────│  └───►│   DESIG      │
│ R_CASE_NO    │       │──────────────│
│ R_DATE       │       │ DS_NO        │
│ R_AMT        │       │ DS_NAME      │
│ R_NO         │       └──────────────┘
│ R_MODE       │
│ R_DUP        │
└──────────────┘

┌──────────────┐       ┌──────────────┐
│   APPOINT    │       │  DR_REPORT   │
│──────────────│       │──────────────│
│ A_CASE_NO ───│──┐    │ DR_SERIAL    │
│ A_DATE       │  │    │ DR_CASE_NO ──│──► HISTORY
│ A_TIME       │  │    │ DR_DATE      │
└──────────────┘  │    │ DR_D_CODE    │
                  │    │ DR_COMPL_CODE│──► COMPLAINT
                  │    │ DR_EXAM      │
                  │    │ DR_TREAT     │──► TREATMENT
                  │    │ DR_TREATMENT │
                  │    │ DR_ESTIMATE  │
                  │    │ DR_MED       │
                  │    └──────────────┘

┌──────────────┐       ┌──────────────┐
│PATIENT_FILES │       │     MISC     │
│──────────────│       │──────────────│
│ PF_CODE ─────│──┐    │ M_NAME       │
│ PF_PATH      │  │    │ M_ADDR1-6    │
│ PF_DESC      │  │    │ M_PHONE/FAX  │
│ PF_MOD_DATE  │  │    │ M_EMAIL      │
│ PF_MOD_USER  │  │    │ M_VERSION    │
└──────────────┘  │    │ M_SMS_*      │
                  │    │ M_SCAN_FOLDER│
                  │    └──────────────┘
                  │
                  └──► PATIENT.P_CODE
```

---

### 3.2 Full Table Definitions

*(All 25 tables fully documented in the database analysis — see separate DB Schema document)*

**Key statistics per table:**

| Table | Records | Purpose |
|-------|---------|---------|
| PATIENT | ~30,427 | Patient master |
| HISTORY | ~79,770 | Treatment records |
| RECEIPT | ~85,181 | Payments |
| PATIENT_FILES | ~63,002 | Scanned docs |
| DR_REPORT | ~5,262 | Clinical notes |
| LAB_RATE | ~168 | Lab pricing |
| D_DETAILS | ~135 | Doctor employment history |
| DOCTOR | 122 | Staff/doctors |
| OPERATION | ~100 | Procedure codes |
| PATIENT_DISEASE | ~100 | Medical history |
| PERMISSIONS | ~58 | Access control |
| APPOINT | ~35 | Appointments |
| FORMNAME | 31 | Screen registry |
| LAB | 28 | Dental labs |
| DISEASE | 18 | Medical conditions |
| COMPLAINT | 16 | Presenting complaints |
| TREATMENT | 13 | Treatment categories |
| SMS_TEMPLATES | 4 | SMS templates |
| PERIOD | 3 | Rx duration |
| DEPT | 2 | Departments |
| DESIG | 2 | Designations |
| DRUGS | 1 | Medications (unused) |
| DOSAGE | 1 | Dosages (unused) |
| MISC | 1 | Clinic config |
| PLAN_TABLE | 6 | SQLBase system |

---

## 4. Data Dictionary

### Core Identifiers
| Column Pattern | Meaning | Range |
|----------------|---------|-------|
| P_CODE | Patient ID | 1 — ~40,000 |
| D_CODE | Doctor/staff ID | 0 (NONE) — 122 |
| OP_CODE | Procedure code | 1 — 118 |
| H_CASE_NO | Visit/case number (global sequential) | 1 — ~80,316 |
| L_CODE | Lab ID | 1 — 28 |
| R_NO | Receipt number | 1 — ~20,178 |

### Naming Conventions
| Prefix | Table |
|--------|-------|
| P_ | PATIENT |
| H_ | HISTORY |
| R_ | RECEIPT |
| D_ | DOCTOR |
| OP_ | OPERATION |
| L_ / LR_ | LAB / LAB_RATE |
| A_ | APPOINT |
| DR_ | DR_REPORT |
| PD_ | PATIENT_DISEASE |
| PF_ | PATIENT_FILES |
| M_ | MISC |
| ST_ | SMS_TEMPLATES |
| FN_ | FORMNAME |
| PERM_ | PERMISSIONS |

---

## 5. Business Rules & Calculations

### 5.1 Billing
- Each procedure visit creates one HISTORY record with the billed amount
- Partial payments allowed (multiple RECEIPT records per case)
- Balance = H_OP_RATE - H_DISCOUNT - SUM(R_AMT)
- No tax (GST/service tax) computation in the application
- Payment modes: Cash, CARD, Cheque, NEFT
- Receipt number auto-incremented

### 5.2 Doctor Commission
- Lab costs deducted before percentage calculation
- Commission = Percent × (Revenue - Lab Cost) / 100
- Fixed-rate alternative for some doctors
- TDS deducted from commission (rate changes tracked with dates)
- Historical percentage changes tracked in D_DETAILS
- Two doctors can share a case (H_D_CODE, H_D_CODE1)

### 5.3 Amount in Words (Indian format)
```
Number → "Rupees [Crore] [Lakh] [Thousand] [Hundred] [Tens] [Units] and [Paise] only"
Example: 5050 → "Rupees Five Thousand and Fifty Paise only"
```

### 5.4 Patient Code Generation
```sql
SELECT (0 || MAX(P_CODE)) + 1 FROM PATIENT
```
String concatenation with '0' prefix ensures numeric handling, then +1 for next code.

### 5.5 Database Version Migration
Application checks `M_VERSION` in MISC table and applies incremental schema changes (1.13 → 1.33). Each version adds columns, tables, or default data.

---

## 6. Report Specifications

| Report | Data Source | Filters | Output |
|--------|------------|---------|--------|
| Doctor Register | HISTORY + RECEIPT + PATIENT + OPERATION | Date range, Doctor | Commission calculation per case with totals |
| Outstandings | HISTORY + RECEIPT + PATIENT | Date range, Doctor, Operation | Patients with balance > 0 |
| Operations | HISTORY + OPERATION + DOCTOR | Date range, Doctor, Operation | All procedures performed |
| Lab Details | HISTORY + LAB + LAB_RATE | Date range | Lab work usage and costs |
| Discount | HISTORY + PATIENT | Date range | Cases with discounts |
| Receipts | RECEIPT + HISTORY + PATIENT | Date range | All payments received |
| Doctor-Patient | HISTORY + PATIENT + DOCTOR | Doctor, Date range | Patients seen by doctor |
| Patient List | PATIENT | None / Date range | Patient directory |
| Patient Details | PATIENT + PATIENT_DISEASE | Patient code | Single patient with medical history |
| Payment Slip | RECEIPT + PATIENT + HISTORY | Case number | Printable receipt with amount in words |

---

## 7. User Roles & Permissions

| Role | Level | Access |
|------|-------|--------|
| SYSADM | 0 | Full access to everything |
| Admin Doctor (KAZIM) | 1 | Full read/write/delete on all 31 forms |
| Reception | 2 | Read-only on Patient Form only |
| Doctor (limited) | 3 | Read most forms; write to Reports, SMS, Backup; no patient edit |

---

## 8. Data Summary

| Metric | Value |
|--------|-------|
| Clinic name | Secunderabad Dental Hospital |
| Location | Secunderabad, Hyderabad, Telangana, India |
| Email | secdentl@gmail.com |
| Phone | 27844043, 66339096 |
| Total patients | ~30,427 |
| Total treatments | ~79,770 |
| Total receipts | ~85,181 |
| Total scanned files | ~63,002 |
| Total clinical reports | ~5,262 |
| Total doctors | 122 |
| Total procedures | ~100+ |
| Total labs | 28 |
| SQL dump date range | Sep 2000 — Oct 2020 |
| Live DB extends to | Sep 2023 |
| Case number range | 1 — ~80,316 |
| Receipt number range | 1 — ~20,178 |
| Software version | 1.33 |

---

## 9. Recommended Modern Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | Next.js (App Router) + Tailwind CSS + shadcn/ui | Modern React framework, server components, great DX |
| **Backend/DB** | Supabase (PostgreSQL + Auth + RLS + Realtime) | Managed Postgres, built-in auth, row-level security, realtime subscriptions |
| **Hosting** | Vercel (frontend) + Supabase Cloud (backend) | Zero-ops deployment, auto-scaling |
| **Offline/PWA** | Service Workers + PowerSync (later) | Clinic may have intermittent internet; PWA for mobile access |
| **File Storage** | Supabase Storage | Patient photos, scanned documents, X-rays |
| **SMS** | Twilio / MSG91 (India-focused) | Modern SMS API with templates, DLT compliance |
| **Reports/PDF** | React-PDF or @react-pdf/renderer | Generate receipts, reports as PDFs |
| **Auth** | Supabase Auth + custom RBAC | Replace the DOCTOR table login with proper auth |

---

## 10. Migration Plan

### Phase 1: Schema Migration
1. Create new Postgres schema in Supabase (see Section 11)
2. Set up proper foreign keys, constraints, indexes
3. Add audit columns (created_at, updated_at, created_by)
4. Add UUID primary keys alongside legacy integer codes

### Phase 2: Data Migration
1. Parse `CLINIC.SQL` (14MB) — extract all INSERT statements
2. Transform data:
   - Normalize PATIENT_DISEASE (use disease codes, not names)
   - Clean phone numbers (standardize to E.164 format)
   - Parse addresses into structured fields where possible
   - Convert dates to ISO 8601
   - Handle data quality issues (null dates, date anomalies like year 1903/2033)
3. Load into Postgres via Supabase migration scripts
4. For the remaining ~3 years (Oct 2020 — Sep 2023):
   - Option A: Run SQLBase on a Windows VM, export newer SQL dump
   - Option B: Use the backup files (.BKP) with SQLBase tools
   - Option C: Accept the SQL dump as base, manually enter critical recent records

### Phase 3: File Migration
1. Upload patient photos from `ctd21/PATIENT/` to Supabase Storage
2. Upload scanned reports from `ctd21/Patients Scanned Reports/` to Supabase Storage
3. Update PATIENT_FILES records with new storage URLs

### Phase 4: Application Build
1. Build auth system (replace DOCTOR table login)
2. Build patient management CRUD
3. Build treatment/history entry
4. Build receipt/billing
5. Build doctor commission reports
6. Build remaining reports
7. Build SMS integration (new provider)
8. Build admin screens (doctors, labs, operations, permissions)

### Phase 5: Verification
1. Compare record counts old vs new
2. Verify commission calculations match
3. Test all reports
4. User acceptance testing

---

## 11. Proposed New Postgres Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- LOOKUP TABLES
-- ============================================

CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE designations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO designations (id, name) VALUES (1, 'DOCTOR'), (2, 'RECEPTION');

CREATE TABLE diseases (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE complaints (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE treatments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE operations (
    id SERIAL PRIMARY KEY,
    legacy_code INTEGER UNIQUE,          -- maps to OP_CODE
    name VARCHAR(50) NOT NULL,
    category VARCHAR(50),                -- NEW: Periodontics, Endodontics, etc.
    default_min_fee DECIMAL(10,2),
    default_max_fee DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE labs (
    id SERIAL PRIMARY KEY,
    legacy_code INTEGER UNIQUE,
    name VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(20),           -- NEW
    contact_email VARCHAR(100),          -- NEW
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lab_rates (
    id SERIAL PRIMARY KEY,
    lab_id INTEGER NOT NULL REFERENCES labs(id),
    item_name VARCHAR(50) NOT NULL,
    rate DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sms_templates (
    id SERIAL PRIMARY KEY,
    type VARCHAR(30) NOT NULL,           -- RECEIPT, APPOINTMENT, BIRTHDAY, FESTIVAL
    template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CORE TABLES
-- ============================================

CREATE TABLE clinic_settings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address_line1 VARCHAR(100),
    address_line2 VARCHAR(100),
    address_line3 VARCHAR(100),
    city VARCHAR(50),
    state VARCHAR(50),
    pincode VARCHAR(10),
    phone VARCHAR(50),
    fax VARCHAR(50),
    email VARCHAR(100),
    gst_number VARCHAR(30),
    scan_folder VARCHAR(200),
    sms_provider VARCHAR(50),           -- NEW: configurable provider
    sms_api_key VARCHAR(200),           -- NEW: replaces username/password
    sms_sender_id VARCHAR(20),
    app_version DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE doctors (
    id SERIAL PRIMARY KEY,
    legacy_code INTEGER UNIQUE,          -- maps to D_CODE
    user_id UUID REFERENCES auth.users(id),  -- Supabase Auth link
    name VARCHAR(50) NOT NULL,
    mobile VARCHAR(15),
    email VARCHAR(100),                  -- NEW
    designation_id INTEGER REFERENCES designations(id),
    department_id INTEGER REFERENCES departments(id),
    commission_percent DECIMAL(5,2) DEFAULT 0,
    commission_rate DECIMAL(10,2),        -- fixed rate alternative
    tds_percent DECIMAL(5,2) DEFAULT 0,
    permission_level INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE doctor_commission_history (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES doctors(id),
    period_from DATE NOT NULL,
    period_to DATE NOT NULL,
    commission_percent DECIMAL(5,2),
    commission_rate DECIMAL(10,2),
    tds_percent DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    legacy_code INTEGER UNIQUE,          -- maps to P_CODE
    salutation VARCHAR(10),
    name VARCHAR(100) NOT NULL,
    father_husband_name VARCHAR(100),
    date_of_birth DATE,
    age_at_registration INTEGER,
    gender CHAR(1) CHECK (gender IN ('M', 'F', 'O')),
    blood_group VARCHAR(10),
    occupation VARCHAR(100),
    phone VARCHAR(40),
    mobile VARCHAR(15),
    email VARCHAR(100),                  -- NEW
    address_line1 VARCHAR(100),
    address_line2 VARCHAR(100),
    address_line3 VARCHAR(100),
    city VARCHAR(50),                    -- NEW: structured
    pincode VARCHAR(10),                 -- NEW: structured
    referring_physician VARCHAR(100),
    physician_phone VARCHAR(20),
    remarks TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE patient_diseases (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    disease_id INTEGER NOT NULL REFERENCES diseases(id),
    noted_date DATE,                     -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(patient_id, disease_id)
);

CREATE TABLE visits (
    id SERIAL PRIMARY KEY,
    legacy_case_no INTEGER UNIQUE,       -- maps to H_CASE_NO
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    visit_date DATE NOT NULL,
    operation_id INTEGER REFERENCES operations(id),
    operation_rate DECIMAL(10,2),
    discount DECIMAL(10,2) DEFAULT 0,
    doctor_id INTEGER REFERENCES doctors(id),
    assisting_doctor_id INTEGER REFERENCES doctors(id),  -- NEW name
    doctor_commission_percent DECIMAL(5,2),
    doctor_commission_amount DECIMAL(10,2),
    lab_id INTEGER REFERENCES labs(id),
    lab_rate_id INTEGER REFERENCES lab_rates(id),
    lab_rate DECIMAL(10,2) DEFAULT 0,
    lab_quantity REAL DEFAULT 1,
    notes TEXT,                           -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE receipts (
    id SERIAL PRIMARY KEY,
    legacy_receipt_no INTEGER,
    visit_id INTEGER NOT NULL REFERENCES visits(id),
    receipt_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_mode VARCHAR(20) CHECK (payment_mode IN ('Cash', 'Card', 'Cheque', 'NEFT', 'UPI', 'Other')),
    is_duplicate BOOLEAN DEFAULT FALSE,
    notes TEXT,                           -- NEW
    created_by INTEGER REFERENCES doctors(id),  -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    visit_id INTEGER REFERENCES visits(id),
    patient_id INTEGER NOT NULL REFERENCES patients(id),  -- NEW: standalone appointments
    appointment_date DATE NOT NULL,
    appointment_time TIME,
    doctor_id INTEGER REFERENCES doctors(id),   -- NEW
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),  -- NEW
    notes TEXT,                           -- NEW
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clinical_reports (
    id SERIAL PRIMARY KEY,
    visit_id INTEGER NOT NULL REFERENCES visits(id),
    report_date DATE NOT NULL,
    doctor_id INTEGER NOT NULL REFERENCES doctors(id),
    complaint_id INTEGER REFERENCES complaints(id),
    examination TEXT,
    diagnosis TEXT,
    treatment_id INTEGER REFERENCES treatments(id),
    treatment_notes TEXT,
    estimate TEXT,
    medication TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE patient_files (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,              -- Supabase Storage path
    file_name VARCHAR(200),
    description VARCHAR(250),
    file_type VARCHAR(20),               -- NEW: jpg, pdf, png
    uploaded_by INTEGER REFERENCES doctors(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUTH & PERMISSIONS
-- ============================================

CREATE TABLE permission_levels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE form_permissions (
    id SERIAL PRIMARY KEY,
    permission_level_id INTEGER NOT NULL REFERENCES permission_levels(id),
    form_name VARCHAR(100) NOT NULL,
    can_read BOOLEAN DEFAULT FALSE,
    can_write BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    UNIQUE(permission_level_id, form_name)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_patients_name ON patients(name);
CREATE INDEX idx_patients_mobile ON patients(mobile);
CREATE INDEX idx_patients_legacy ON patients(legacy_code);
CREATE INDEX idx_visits_patient ON visits(patient_id);
CREATE INDEX idx_visits_date ON visits(visit_date);
CREATE INDEX idx_visits_doctor ON visits(doctor_id);
CREATE INDEX idx_visits_legacy ON visits(legacy_case_no);
CREATE INDEX idx_receipts_visit ON receipts(visit_id);
CREATE INDEX idx_receipts_date ON receipts(receipt_date);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_clinical_reports_visit ON clinical_reports(visit_id);
CREATE INDEX idx_patient_files_patient ON patient_files(patient_id);
CREATE INDEX idx_doctor_commission_doctor ON doctor_commission_history(doctor_id);
```

---

## 12. Feature Parity Checklist

| # | Legacy Feature | New App | Priority | Notes |
|---|---------------|---------|----------|-------|
| 1 | Patient registration | patients CRUD | P0 | Add email, structured address |
| 2 | Patient search/lookup | Full-text search | P0 | Add search by mobile, name |
| 3 | Medical history checklist | patient_diseases | P0 | Normalize with disease_id FK |
| 4 | Treatment entry (HISTORY) | visits CRUD | P0 | Rename to "visits" |
| 5 | Receipt/payment entry | receipts CRUD | P0 | Add UPI payment mode |
| 6 | Receipt printing | PDF generation | P0 | Amount in words (Indian format) |
| 7 | Doctor commission report | Report page | P0 | Core business requirement |
| 8 | Outstanding dues report | Report page | P0 | |
| 9 | Doctor management | doctors CRUD | P1 | Link to Supabase Auth |
| 10 | Operation/procedure codes | operations CRUD | P1 | Add categories |
| 11 | Lab management | labs + lab_rates CRUD | P1 | |
| 12 | Lab tracking per case | Part of visits | P1 | |
| 13 | User login & permissions | Supabase Auth + RLS | P1 | Proper auth, not plain text passwords |
| 14 | Appointment scheduling | appointments CRUD | P1 | Add status, standalone appointments |
| 15 | SMS reminders | SMS API integration | P2 | Use MSG91/Twilio, DLT compliance |
| 16 | Patient photo capture | File upload | P2 | Camera/upload to Supabase Storage |
| 17 | Document scanning | File upload | P2 | Upload PDFs/images |
| 18 | Operations report | Report page | P2 | |
| 19 | Lab details report | Report page | P2 | |
| 20 | Discount report | Report page | P2 | |
| 21 | Receipts report | Report page | P2 | |
| 22 | Doctor-patient report | Report page | P2 | |
| 23 | Patient list/directory | Report page | P2 | |
| 24 | Mailing labels | Report page | P3 | May not be needed |
| 25 | Phone list | Report page | P3 | Replace with mobile search |
| 26 | Clinical examination (DR_REPORT) | clinical_reports | P2 | |
| 27 | Prescription module | Enhanced Rx | P3 | Build properly this time |
| 28 | Database backup | Supabase handles | N/A | Managed service |
| 29 | Excel export | CSV/Excel download | P2 | |
| 30 | Calculator/Notepad launch | N/A | N/A | Not needed in web app |
| 31 | Birthday SMS | SMS automation | P3 | |
| 32 | Festival SMS | SMS automation | P3 | |
| 33 | Recall reminders (6 months) | Automated reminders | P2 | |

### New Features to Add (not in legacy):
| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| N1 | Dashboard with daily summary | P0 | Today's appointments, collections, outstanding |
| N2 | Tooth chart / dental diagram | P1 | Visual tooth selection for procedures |
| N3 | Treatment plan builder | P1 | Multi-visit plans with estimates |
| N4 | WhatsApp integration | P1 | More common than SMS in India now |
| N5 | UPI/QR code payments | P1 | Standard in India |
| N6 | GST invoice generation | P1 | Tax compliance |
| N7 | Multi-branch support | P2 | If clinic expands |
| N8 | Patient portal | P3 | Patients view their history online |
| N9 | Automated backup to cloud | N/A | Supabase handles this |
| N10 | Mobile-responsive design | P0 | PWA for tablet use in clinic |

---

## 13. Key Risks & Notes

1. **3 years of missing data (Oct 2020 — Sep 2023):** The SQL dump is from Oct 2020, but the live DB extends to Sep 2023. Running SQLBase on a Windows VM to export a fresh dump is recommended.
2. **No foreign keys in legacy DB:** All referential integrity was enforced by the application. The new schema adds proper FK constraints.
3. **Plain text passwords:** Legacy system stores passwords in the DOCTOR table. New system must use proper auth (Supabase Auth with bcrypt hashing).
4. **Data quality issues:** Some dates are clearly wrong (year 1903, 0200, 2033). Migration script must validate and flag these.
5. **Denormalized PATIENT_DISEASE:** Disease names stored as text, not codes. Migration must normalize.
6. **No audit trail:** Legacy system has no created_at/updated_at. New schema adds these.
7. **SMS DLT compliance:** India requires DLT registration for transactional SMS since 2021. New SMS integration must comply.
8. **Amount in words:** Must implement Indian numbering system (Crore/Lakh) for receipt printing.
9. **The `.apt` source file** is text-based but in Centura's proprietary format — it can be read and analyzed but not compiled without the Centura IDE.

---

*Generated: Feb 20, 2026*
*Source: Archive.rar (D: drive copy from Secunderabad Dental Hospital)*
