# Clinic App — Roadmap

## Current State
All core clinical workflows implemented. 37 routes. SQLite local dev.

**Key capabilities**: Patient CRUD + global search, Appointment scheduling (dual-view timetable, rooms, status flow), Visit/treatment with follow-up chains (parentVisitId + stepLabel + TreatmentStep templates), Clinical examination (per-visit exam, locking, addendums, side-by-side previous notes), Consultation flow (auto-suggest linked treatments, inline scheduling, treatment plan creation), Patient checkout (multi-visit FIFO allocation), Doctor commission report (dual-view: legacy receipt-based + new treatment chain view), Per-operation doctor fees (`Operation.doctorFee`), Step tracker with chain cost summary, Doctor dashboard with 3-section queue (Now Seeing/Waiting Room/Schedule), Role-based access (Admin L1, Reception L2, Doctor L3), File uploads with categories + lightbox + bulk upload, Print infrastructure.

---

## Critical Fixes (Do First)

### CF-1: Patient Code as Primary Identifier [DONE]
- [x] `code` field, prominent display, search priority, auto-generation

### CF-2: Receipt Number System [DONE]
- [x] Auto-generated sequential `receiptNo` (MAX+1)

### CF-3: Patient Checkout Flow [DONE]
- [x] Multi-visit FIFO allocation, atomic multi-receipt creation

### CF-4: Legacy Data Import
When ready to go live with real data. **See `session-handoff.md` for detailed clinic visit guide and field mapping.**

**Data sources:**
- `CLINIC.SQL` (Oct 2020 dump) — baseline, ~3 years of data missing
- `CLINIC03.DBS` (Sep 2023 live DB) — most current binary, needs fresh SQL dump from clinic machine
- Clinic machine may have data beyond Sep 2023 — needs physical visit to extract

**Import tasks:**
- [ ] Get fresh SQL dump from clinic Windows machine (SQLTalk `UNLOAD DATABASE`)
- [ ] Import script for legacy SQL → SQLite/Postgres
- [ ] Map legacy patient codes (P_CODE 1–40427), case numbers (H_CASE_NO 1–80316), receipt numbers (R_NO 1–20178)
- [ ] Import DR_REPORT → ClinicalReport (with COMPLAINT table join for complaint text)
- [ ] Import PATIENT_FILES → PatientFile (remap paths to `uploads/patients/{code}/`)
- [ ] Copy patient photos (`D:\ctd21\PATIENT\`) + scanned reports (`D:\ctd21\Patients Scanned Reports\`)
- [ ] Ensure auto-generated sequences start AFTER legacy max values
- [ ] Validate data integrity (foreign keys, orphaned records, date issues)
- [ ] Handle edge cases: P_CODE=1/P_NAME="X" test records, NULL receipt numbers, DOUBLE PRECISION R_NO

---

## Phase 1: Auth & Roles [DONE]

### P1-1: Authentication System [DONE]
### P1-2: Role-Based Access Control [DONE]
### P1-3: Payment Gating [DONE]

---

## Phase 2: Admin Management [DONE]

### P2-1: Doctor Management [DONE]
### P2-2: Operation/Procedure Management [DONE]
### P2-3: Lab & Lab Rate Management [DONE]

---

## UX: Global Search, Dashboard, Patient Chart [DONE]

---

## Phase 3: Appointment Scheduling [DONE]

### P3-1: Appointment Model [DONE]
### P3-2: Day View [DONE]
### P3-3: Appointment Management [DONE]

### P3-4: Future Enhancements
- [ ] Drag-and-drop rescheduling
- [ ] Online booking: patients request slots, reception confirms based on availability
- [ ] SMS/WhatsApp appointment reminders
- [ ] Recurring appointment templates (e.g., weekly ortho adjustments)

---

## UX Cleanup & Doctor Activity [DONE]
## UX Audit & Tariff Integration [DONE]
## UX Audit Completion & Print Polish [DONE]

---

## Core Workflow Enhancements (Sessions 18-21) [DONE]
- [x] Doctor-only visit creation (reception schedules appointments only)
- [x] Doctor discount (10% tier for L3)
- [x] Quick doctor reassignment on appointments
- [x] Doctor dashboard 3-section queue (Now Seeing / Waiting Room / Schedule)
- [x] Per-operation doctor fees (`Operation.doctorFee`, `Operation.labCostEstimate`)
- [x] Commission report dual-view: "By Receipt" (legacy) + "By Treatment" (chain view)
- [x] Minimum collection warnings at checkout (doctorFee + labCost vs collected)
- [x] Step tracker: "Step X of Y", per-step costs, chain cost summary
- [x] Seed data: realistic patient stories with coherent treatment chains

---

## Consultation Flow Enhancements (Session 27) [DONE]

- [x] **Fix duplicate plans bug** — Idempotency guard in `createPlansFromConsultation()`: checks `TreatmentPlanItem.findFirst({ where: { visitId } })`, returns early if plans already linked. Client clears state after save.
- [x] **Fix RCT template** — Reduced from 5 steps to 3 (Initial Assessment, Access Opening, BMP / Obturation). Crown Prep/Fitting removed — those belong to Crown PFM's own template.
- [x] **Auto-suggest linked treatments** — `suggestsOperationId` self-relation on Operation. RCT → Crown PFM seeded. Blue banner: "Crown PFM is typically needed after RCT" with Dismiss/Add buttons.
- [x] **Inline scheduling** — Multi-step treatments auto-initialize scheduling row (doctor, date, time). Single-step treatments show no scheduling. `createPlansFromConsultation` extended with `schedules` param to create appointments linked to plan items.

---

## Consultant Availability & Smart Scheduling (Next Up)

### CA-1: Consultant Availability Model
- [ ] New `DoctorAvailability` table: `doctorId`, `dayOfWeek` (0=Sun–6=Sat), `startTime`, `endTime`
- [ ] Seed availability: e.g., Ramana Reddy: Wed (10–2), Sat (10–1); Anitha: Tue (10–2), Thu (10–2)
- [ ] Admin management UI: `/doctors/[id]/edit` or `/settings/availability`

### CA-2: Smart Date Picker in Exam Form
- [ ] When BDS doctor selects a consultant in scheduling row, restrict date to consultant's available days
- [ ] Time dropdown shows only that consultant's available hours
- [ ] Helper text: "Dr. Ramana Reddy available Wed, Sat"

### CA-3: Appointment Calendar Awareness
- [ ] Appointment creation form checks consultant availability
- [ ] Warning when scheduling outside consultant's available days/hours

---

## File Infrastructure (Session 26) [DONE]

- [x] File categories (XRAY/SCAN/PHOTO/DOCUMENT/OTHER), auto-detect from filename
- [x] In-app lightbox: zoom/pan images, iframe PDFs, keyboard nav, download
- [x] Bulk upload: `/settings/bulk-upload` admin page, patient search + multi-file queue
- [x] Gallery: category badges, filter pills, click opens lightbox

---

## Phase 4: Remaining Reports

### P4-1: Core Reports
- [ ] Operations Report (all procedures by date range, doctor, operation type)
- [ ] Lab Details Report (lab work usage and costs)
- [ ] Discount Report (cases with discounts by date range)
- [ ] Receipts Report (all payments by date range, with totals by payment mode)
- [ ] Doctor-Patient Report (patients seen by specific doctor)
- [ ] Patient Directory/List Report

### P4-2: Report Enhancements
- [ ] Excel export for all reports (not just CSV)
- [ ] Print-optimized layouts for all reports
- [ ] Date range presets (Today, This Week, This Month, Last Month, Custom)

---

## Phase 5: Clinical Features [DONE]

### P5-1–P5-6: All Complete [DONE]

---

## Hardening Sprint 1: Code Quality [DONE]

- [x] Extract shared utilities (billing, auth, appointment-status, file-constants, detail-row)
- [x] TypeScript fixes (removed `as any`, typed status strings, fixed useEffect deps)
- [x] Error boundaries + loading states (`error.tsx`, `loading.tsx`, user-safe action errors)
- [x] Dead code removal (removed `@react-pdf/renderer`, `next-themes`, unused vars)
- [x] Schema integrity (`@@unique` on ClinicalReport.visitId, foreign key pragmas)

---

## Hardening Sprint 2: UI/UX Consistency [DONE]

- [x] Layout standardization (form widths `max-w-3xl`, title `text-2xl`, "Filter" buttons, Clear links)
- [x] Component consistency (focus rings, shadcn Input, label associations, separator style)
- [x] Terminology fixes (role names, pluralization, "Bill Payment", "Treatment Fee", "Notes Written")
- [x] Page-specific fixes (visit detail pills, commission summary table, inline fee editing, reports hub)
- [x] Appointments page title, duplicate search removed

---

## Hardening Sprint 3: Forms [DONE]

- [x] Zod v4 validation schemas for all entities (`src/lib/validations.ts`)
- [x] All server actions wired through `parseFormData()` — no more `formData.get() as string`
- [x] UTC date bug fixed: `todayString()` / `dateToString()` locale-safe helpers replace `toISOString().split("T")[0]`
- [x] Complaint pill bug fixed (substring match → exact split/includes, toggle deselect added)
- [x] `updateAppointment` past-date validation added
- [x] Comma-safe number parsing via Zod transforms (Indian number formatting)
- [x] Phone fields `type="tel"`, visit submit disabled without patient
- [x] Exam form `beforeunload` dirty-state warning
- [x] Receipt form "Pay Full" button
- [x] Lab rate auto-fill on item selection in visit form
- [x] Print fix: sidebar/topbar hidden, clean print layout

---

## Hardening Sprint 4: Performance

Prepare for production scale: 40K patients, 80K visits, 20K receipts.

### H4-1: Database Indexes (Do First)
- [ ] Add `@@index([patientId])` to Visit
- [ ] Add `@@index([doctorId])` to Visit
- [ ] Add `@@index([visitDate])` to Visit
- [ ] Add `@@index([parentVisitId])` to Visit
- [ ] Add `@@index([visitId])` to Receipt
- [ ] Add `@@index([receiptDate])` to Receipt
- [ ] Add `@@index([visitId])` to ClinicalReport
- [ ] Add `@@index([doctorId])` to ClinicalReport
- [ ] Add `@@index([name])` to Patient
- [ ] Add `@@index([mobile])` to Patient
- [ ] Run `prisma db push` and verify no regressions

### H4-2: Critical Query Fixes
- [ ] `/receipts/new` — only fetch visits with outstanding balance (currently loads ALL visits)
- [ ] `/dashboard` — replace full visit scan for outstanding total with aggregated query
- [ ] `/reports/outstanding` — add server-side pagination + DB-level balance filter
- [ ] `/reports/commission` — move doctor filter to database `where` clause

### H4-3: N+1 Query Fixes
- [ ] `/patients/[id]` — parallelize queries with `Promise.all`
- [ ] `/patients/[id]` — remove duplicate files include, use `select` to exclude password
- [ ] `/reports/commission` — eliminate N+1 receipt sub-query
- [ ] `/my-activity` — collapse separate COUNT queries into one aggregate
- [ ] `/visits/[id]/examine` — remove redundant revalidateVisitPaths DB query

### H4-4: Caching & Payload Optimization
- [ ] Remove `force-dynamic` from reference-data pages (`/settings/*`, `/doctors`)
- [ ] Add `revalidatePath("/visits/new")` to operation/lab mutations
- [ ] Use `select` instead of `include: true` on visit detail queries
- [ ] Split TreatmentTimeline: server component + client `QuickNoteForm`

### H4-5: Search Optimization
- [ ] Patient search: plan for Postgres `pg_trgm` GIN index
- [ ] Patient list: remove redundant count query
- [ ] Appointments: replace fragile "in-house doctor" heuristic with explicit `isInHouse` flag

---

## Hardening Sprint 5: Security

Harden auth, close permission gaps, protect patient data.

### H5-1: Session & Authentication
- [ ] Replace raw doctor ID cookie with signed/encrypted session token
- [ ] Add `secure: true` flag to session cookie (production only)
- [ ] Add `isActive` check to `getCurrentDoctor()` — deactivated doctors locked out
- [ ] Add session expiry window
- [ ] Hash passwords with bcrypt/argon2
- [ ] Add rate limiting on login

### H5-2: Permission Gaps
- [ ] `canCollectPayments()` check on `createReceipt` server action
- [ ] `canCollectPayments()` check on `recordCheckoutPayment` server action
- [ ] Validate `doctorId` in `saveExamination` matches authenticated user
- [ ] Scope `updateAppointmentStatus` to assigned doctor or admin
- [ ] Prevent non-SYSADM from creating SYSADM accounts

### H5-3: Data Exposure
- [ ] `select` clause on doctor edit page — exclude password from RSC serialization
- [ ] `select` clause on commission report doctor include — exclude password
- [ ] `select` clause on all `uploadedBy: true` includes — exclude password
- [ ] Validate `patientId` in file upload route
- [ ] Validate foreign keys (operationId, doctorId, labId) before creating visits

### H5-4: File Upload Security
- [ ] Move uploads behind authenticated API route
- [ ] Server-side file content validation (magic bytes)
- [ ] Per-patient file enumeration protection

### H5-5: Data Integrity
- [ ] Wrap sequential ID generation in `$transaction` (race condition fix)
- [ ] `deletePatient` pre-check for existing visits
- [ ] Server-side input length limits on free-text fields
- [ ] Audit logging for sensitive operations

---

## Phase 5B: Doctor Settlement & Lab Workflow (Pending Design Decisions)

### P5B-1: Settlement Tracking
- [ ] Decide: `DoctorSettlement` model vs report-only approach
- [ ] Settlement UI: admin marks completed treatment chains as "settled"
- [ ] Monthly settlement report (1st of month, all completed unsettled chains)
- [ ] Settlement history per doctor

### P5B-2: Treatment Chain Finalization
- [ ] "Mark Treatment Complete" button (early finalization before all steps)
- [ ] Auto-complete already works (all steps have exams → completed)
- [ ] Multi-doctor chain fee assignment (BDS starts, consultant finishes — who gets paid?)

### P5B-3: Lab Cost Gating
- [ ] Warn at visit creation when lab-work visit has insufficient patient payment
- [ ] Lab order tracking (optional — may not be needed if labCostEstimate is informational only)

---

## Phase 6: Production Readiness

### P6-1: Database Migration
- [ ] Migrate from SQLite → PostgreSQL (Supabase)
- [ ] Data migration script from legacy CLINIC.SQL
- [ ] Verify all 40K+ patients, 80K+ visits migrate cleanly
- [ ] Add `pg_trgm` GIN indexes for patient search
- [ ] Verify all @@index declarations perform correctly on Postgres

### P6-2: Supabase Integration
- [ ] Supabase project setup
- [ ] Migrate auth to Supabase Auth
- [ ] Row-Level Security (RLS) policies
- [ ] File storage via Supabase Storage

### P6-3: Deployment
- [ ] Vercel deployment
- [ ] Environment configuration
- [ ] Custom domain setup
- [ ] PWA setup for tablet use in clinic

---

## Phase 7: Nice-to-Haves

- [ ] SMS/WhatsApp integration (reminders, birthday wishes)
- [ ] Tooth chart / dental diagram
- [ ] Treatment plan builder (multi-visit plans)
- [ ] UPI/QR code payment integration
- [ ] GST invoice generation
- [ ] Prescription module (drug/dosage/period)
- [ ] Patient portal
- [ ] Multi-branch support
