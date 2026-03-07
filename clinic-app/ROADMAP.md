# Clinic App — Roadmap

## Current State
44 routes. SQLite local dev. Core clinical workflows implemented but undergoing major redesign based on real-user testing feedback.

---

## ACTIVE: Workflow Redesign (Sessions 37+)

**All other roadmap items are paused until this is complete.**

Full spec in `/ux-fixes.md` (ground truth document). Key changes:

### WR-1: Permission Model Overhaul
- [ ] Add L4 permission level (Consultants — view schedule + examine only)
- [ ] Add `isSuperUser` boolean on Doctor model
- [ ] L2 super-user (Murli): change lab/tariff rates, authorize large discounts
- [ ] L3 super-user (Clinical Head): edit findings dropdown, treatment step templates
- [ ] Enforce discount limits per role (L3/L4: 20%, L2: 20%, L2 super: 50%+, L1: unlimited)
- [ ] Strip L4 UI to schedule + examine only

### WR-2: Audit Log & Accountability
- [ ] `AuditLog` model: who, what, when, which patient, mandatory reason for flagged actions
- [ ] Auto-flag: discount >20%, rate change, plan modification, cancelled treatment
- [ ] Monthly review report page for L1

### WR-3: Escrow Payment Model
- [ ] Patient escrow balance (replaces FIFO visit allocation)
- [ ] Advance payment at scheduling → escrow
- [ ] "Work Done" = strict completion trigger → escrow fulfillment
- [ ] Escrow visible on patient page, checkout, dashboard

### WR-4: Dental Chart / Odontogram Redesign
- [ ] Per-tooth findings (from editable dropdown — `ToothFinding` reference table)
- [ ] Per-tooth work done history (`ToothStatus`, `WorkDone` models)
- [ ] Multi-tooth selection (bridges, quadrants)
- [ ] Dental chart as primary patient page interface
- [ ] Findings → treatment plan auto-generation

### WR-5: Examination & Work Done Flow
- [ ] "Work Done" section: per-tooth, per-visit record of actual procedures performed
- [ ] Work Done triggers: tooth status update + plan advancement + escrow fulfillment
- [ ] Consultant add-on notes for existing cases (without full exam form)
- [ ] Remove medication tab → optional Prescription flow with front desk notification + print

### WR-6: Role-Based Workflow Enforcement
- [ ] Remove visit creation UI for L3/L4 (visits auto-created from appointments)
- [ ] Remove sidebar sheet visit creation
- [ ] L3/L4 view schedule only (no scheduling)
- [ ] Front desk (L2) owns all scheduling, including treatment plan follow-ups
- [ ] Treatment type → department/consultant matching

### WR-7: Patient Follow-up & Reminders
- [ ] Pending follow-up queue (treatment plan created, no appointment scheduled)
- [ ] Follow-up schedule per treatment type (configurable intervals)
- [ ] Front desk dashboard: "patients needing follow-up calls"
- [ ] Post-treatment checkup reminders (e.g. 6-month after RCT)

### WR-8: Patient Page Redesign
- [ ] Dental chart as hero (interactive odontogram with current tooth states)
- [ ] Sticky header: patient info + medical alerts + escrow balance
- [ ] Active treatment plans with per-tooth progress
- [ ] Upcoming appointments, payment summary
- [ ] Visit history/timeline as secondary (collapsible)

---

## Critical Fixes

Previously "Do First" — now secondary to Workflow Redesign.

### CF-1: Patient Code as Primary Identifier [DONE]
- [x] `code` field, prominent display, search priority, auto-generation

### CF-2: Receipt Number System [DONE]
- [x] Auto-generated sequential `receiptNo` (MAX+1)

### CF-3: Patient Checkout Flow [DONE]
- [x] Multi-visit FIFO allocation, atomic multi-receipt creation

### CF-4: Legacy Data Import
When ready to go live with real data. **Full analysis in `clinic-legacy/data-report.md`.**

**Data explored (Session 29):**
- Oct 2020 dump fully parsed: 30,443 patients, 79,769 visits, 85,156 receipts, 5,261 clinical reports
- Data quality HIGH: 99% collection rate (₹11.05cr billed / ₹10.94cr collected), clean relational integrity
- Schema maps directly — every legacy table has a new app counterpart
- ~54 junk records, ~15 bad dates — trivial to filter

**To get fresh 2026 data:** Run on clinic Windows PC: `CONNECT CLINIC03; UNLOAD DATABASE clinic_2026.sql;`

**Import tasks:**
- [ ] Get fresh SQL dump from clinic Windows machine (SQLTalk `UNLOAD DATABASE`)
- [ ] Build parser for SQLBase UNLOAD format (CSV with `$DATATYPES` + `$long`/`~`/`//` multiline)
- [ ] Import script: Doctors → Operations → Labs → Patients → Visits → Receipts → Reports
- [ ] Handle `~ANAK~` line separator in DR_REPORT text fields
- [ ] Handle `$long`/`~`/`//` multiline format for PATIENT.P_REMARKS
- [ ] Normalize duplicates: FILLING vs FILLINGS, CONS vs CONS.
- [ ] Set auto-increment seeds: Patient >371,202, CaseNo >80,316, Receipt >152,641
- [ ] Copy patient photos from clinic machine (`D:\ctd21\PATIENT\`) + remap paths
- [ ] Validate: foreign keys, orphaned records, date range sanity

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

## Treatment Plan Intelligence (Session 32) [DONE]

- [x] **planItemId wired through appointments** — validation, form, action all store planItemId
- [x] **Smart plan card** — appointment-aware display: scheduled steps show date + badge, completed steps show actual visit doctor, future steps show tentative dates anchored from appointments
- [x] **Single-sitting support** — "Done in same sitting" links multiple steps to one visit, auto-completes plan
- [x] **Doctor Activity report** — `/reports/doctor-activity` with summary/detail views, chain doctors, CSV export

---

## Consultant Availability & Smart Scheduling [DONE]

### CA-1: Consultant Availability Model [DONE]
- [x] New `DoctorAvailability` table: `doctorId`, `dayOfWeek` (0=Sun–6=Sat), `startTime`, `endTime`
- [x] Seed availability: Ramana Reddy (Wed/Sat), Anitha (Tue/Thu), Surender (Mon–Sat)
- [x] Admin management UI: `/doctors/[id]/edit` — AvailabilityEditor component

### CA-2: Smart Date Picker in Exam Form [DONE]
- [x] When BDS doctor selects a consultant in scheduling row, auto-suggests next available date
- [x] Time dropdown shows only that consultant's available hours
- [x] Helper text: "Available: Wed 10AM–2PM, Sat 10AM–1PM"

### CA-3: Appointment Calendar Awareness [DONE]
- [x] Appointment creation form checks consultant availability
- [x] Amber warning when scheduling outside consultant's available days/hours (soft — can override)

---

## File Infrastructure (Session 26) [DONE]

- [x] File categories (XRAY/SCAN/PHOTO/DOCUMENT/OTHER), auto-detect from filename
- [x] In-app lightbox: zoom/pan images, iframe PDFs, keyboard nav, download
- [x] Bulk upload: `/settings/bulk-upload` admin page, patient search + multi-file queue
- [x] Gallery: category badges, filter pills, click opens lightbox

---

## Phase 4: Reports [DONE — Core]

### P4-1: Core Reports [DONE]
- [x] Operations Report (procedures by date range, doctor + operation type filters, summary by operation)
- [x] Lab Details Report (lab work by date range, lab filter, summary by lab)
- [x] Discount Report (discounted cases by date range, summary cards)
- [x] Receipts Report (payments by date range, payment mode filter, summary by mode)
- [x] Doctor-Patient Report (patients seen by specific doctor, required doctor filter)
- [x] Patient Directory (searchable by name/code/mobile, outstanding balances, CSV export)
- [x] Doctor Activity Report (procedures & revenue by doctor per month, summary + detail views, chain doctors)

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

## UX Overhaul (Sessions 34-35) [DONE]

10-phase UX overhaul, all verified with Playwright testing (Session 36):
- [x] Sidebar font sizes, terminology ("Visits" not "Treatments"), themed toaster
- [x] Login searchable combobox, queue indicator mobile-visible
- [x] Visit form "Procedure" terminology
- [x] Medical alert banner on exam form (non-dismissible disease pills)
- [x] "Save & Next Patient" button, keyboard shortcuts (Cmd+S, Cmd+Enter)
- [x] All waiting patients get Examine button (not just first)
- [x] Teeth badges in timeline, Visit Log flat table toggle
- [x] Quick registration (collapsed form, "More Details" expands)
- [x] Appointment conflict detection (amber warning banner)
- [x] Exam form autosave (localStorage, restore/discard)
- [x] Patient files on exam form (collapsible, category badges)
- [x] Note templates in settings + "Use Template" on exam form
- [x] Treatment plan <-> timeline bidirectional links

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

## Payments, Collections & Bifurcation UX

The checkout/receipt/payment flow works but hasn't had the same UX treatment as clinical workflows. Needs real-user feedback to prioritize.

### PAY-1: Checkout UX
- [ ] Clearer payment bifurcation display — how a payment splits across multiple visits (FIFO allocation is invisible to user)
- [ ] Outstanding balance breakdown per visit on patient page (currently just a total)
- [ ] Payment history timeline — who paid what, when, for which visits
- [ ] Partial payment workflow polish — currently functional but UX is minimal

### PAY-2: Receipt UX
- [ ] Receipt creation flow simplification (currently requires knowing visit/case numbers)
- [ ] Quick collect from patient page (one-click for common amounts)
- [ ] Receipt print layout polish (amount in words, clinic header, better formatting)
- [ ] Bulk receipt printing (day-end batch)

### PAY-3: Collections Reporting
- [ ] Daily collections summary (today's receipts by payment mode, by doctor)
- [ ] Outstanding aging report (30/60/90 day buckets)
- [ ] Payment mode breakdown (Cash vs Card vs UPI trends)
- [ ] Collections vs billing gap report

### PAY-4: Financial Visibility
- [ ] Dashboard collections widget for reception (today's total, pending, collected)
- [ ] Patient balance prominently visible during appointment check-in
- [ ] Visit-level payment status in appointment day view
- [ ] End-of-day cash reconciliation helper

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
- [ ] UPI/QR code payment integration
- [ ] GST invoice generation
- [ ] Prescription module (drug/dosage/period)
- [ ] Patient portal
- [ ] Multi-branch support
