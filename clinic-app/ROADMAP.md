# Clinic App — Roadmap

## Current State
51 routes. SQLite local dev. 60 sessions of development. Core clinical workflows complete. UX audit resolved. Multi-tooth treatment chains, tariff enforcement, corporate partners, advance nudge system all implemented. ~70 files uncommitted across Sessions 52-60. Ready for commit + UAT.

---

## COMPLETED: Workflow Redesign (Sessions 37-51) [DONE]

Full spec in `/ux-fixes.md`. All P0 and P1 items resolved. 14 P2 items deferred (cosmetic or major new features).

### WR-1: Permission Model Overhaul [DONE — Session 38]
- [x] L4 permission level (Consultants — view schedule + examine only)
- [x] `isSuperUser` boolean on Doctor model
- [x] L2 super-user: change lab/tariff rates, authorize large discounts (50%)
- [x] L3 super-user: edit findings dropdown, treatment step templates
- [x] Discount limits per role (`maxDiscountPercent()`)
- [x] L4 stripped UI (schedule + examine only)

### WR-2: Audit Log & Accountability [DONE — Session 39]
- [x] `AuditLog` model with severity (INFO/FLAG), actor, reason, details
- [x] Auto-flag: discount >20%, rate changes, plan modifications, cancellations
- [x] Audit report page (`/reports/audit`) with filters, pagination, human-readable details

### WR-3: Escrow Payment Model [DONE — Sprint 5]
- [x] Patient escrow balance (replaces FIFO visit allocation)
- [x] Advance payment at checkout → escrow
- [x] Escrow visible on patient page (colored pills), checkout, dashboard
- [x] Deposit receipt print page

### WR-4: Dental Chart / Odontogram [DONE — Sessions 43-47]
- [x] Per-tooth findings (from editable `ToothFinding` reference table)
- [x] Per-tooth work done history (`ToothStatus`, `WorkDone` models)
- [x] Multi-tooth selection (drag-to-select, quadrant buttons)
- [x] Dental chart dialog on patient page
- [x] Tooth detail dialog with status, findings, notes

### WR-5: Examination & Work Done Flow [DONE — Sprint 5]
- [x] Work Done section: per-tooth, per-visit record with operation + status
- [x] Work Done triggers tooth status update
- [x] Consultant quick notes (ConsultantQuickNote component)
- [x] Prescription flow separate from exam (PrescriptionSheet + print routes)

### WR-6: Role-Based Workflow Enforcement [DONE — Sessions 38, 50]
- [x] Visit creation removed for L3/L4 (auto-created from appointments)
- [x] Sidebar sheet removed
- [x] L3/L4 view schedule only
- [x] Server action auth hardening on all mutations

### WR-7: Patient Follow-up & Reminders [PARTIAL]
- [x] Follow-up queue on dashboard (overdue highlighting, phone numbers)
- [x] Treatment step templates with day gaps
- [ ] Configurable follow-up intervals per treatment type
- [ ] Post-treatment checkup reminders (e.g. 6-month after RCT)

### WR-8: Patient Page Redesign [DONE — Sessions 44-48]
- [x] Interactive dental chart dialog
- [x] Sticky header: patient info + medical alerts + escrow balance pills
- [x] Treatment chains with progress tracking
- [x] Financial summary elevated for L1/L2
- [x] Upcoming appointments section

---

## COMPLETED: UX Audit (Sessions 49-51) [DONE]

4-persona Playwright walkthrough (Murli, Dr. Surender, Dr. Ramana, Dr. Kazim). 50 items found, 36 fixed, 14 deferred.

Key fixes: DoctorCombobox (5 locations), admin dashboard stat cards, audit flags, escrow receipt printing, duplicate visit prevention, outstanding aging analysis, audit log pagination, operations search, age→DoB auto-fill, text sizing, complaint pills title case, autosave 5s, walk-in toggle position.

---

## COMPLETED: Business Rules & Multi-Tooth Chains (Sessions 52-60) [DONE]

### BIZ-1: WorkDone/Escrow Simplification [DONE — Session 52]
- [x] Removed WorkDone + EscrowFulfillment models (replaced by progress dropdown)
- [x] Escrow = deposits only (PatientPayment sum), no fulfillment deductions
- [x] Checkout client rewrite (checkout-client.tsx)

### BIZ-2: Multi-Tooth Treatment Chains [DONE — Sessions 59-60]
- [x] Select teeth on chart → "New Chain" → pick operation → one plan per tooth auto-created
- [x] Chain title auto-annotation: "Root Canal Treatment — #36,37,38"
- [x] Inline tooth picker when no teeth pre-selected from chart
- [x] "+ Add Plan" on chain shows tooth picker from chain's teeth
- [x] Different operations per tooth within same chain (e.g. RCT + Crown on tooth 21)

### BIZ-3: Tariff Card & Min Fee Enforcement [DONE — Session 59]
- [x] `prisma/import-tariff.ts` — imports min/max fees for 60 operations from SDH tariff PDF
- [x] `canOverrideMinFee()` in permissions (L1 + L2 super only)
- [x] Visit creation blocks below-tariff rates for L3/L4, allows with FLAG audit for L1/L2 super
- [x] L2 super discount cap raised to 100% (was 50%)

### BIZ-4: Advance Nudge System [DONE — Session 59]
- [x] `ClinicSettings.defaultAdvance` field (default ₹500)
- [x] `getDefaultAdvance()` helper
- [x] Settings UI for editable advance amount (L1 + L2 super)
- [x] Reception dashboard pre-fills collect dialog with default advance after scheduling follow-ups

### BIZ-5: Corporate Patient Tagging [DONE — Sessions 59-60]
- [x] `CorporatePartner` model (name, notes, isActive, patients relation)
- [x] Settings CRUD at `/settings/corporate` (L1 + L2 access)
- [x] Patient form integration (dropdown on create + edit)
- [x] Blue corporate partner badge on patient page header

### BIZ-6: Tooth Chart Fixes [DONE — Session 59]
- [x] Status color takes priority over selection blue (selected teeth with status show status color + blue ring outline)
- [x] Chart note deduplication in `handleBatchApply`

---

## Critical Fixes

### CF-1: Patient Code as Primary Identifier [DONE]
### CF-2: Receipt Number System [DONE]
### CF-3: Patient Checkout Flow [DONE]

### CF-4: Legacy Data Import
When ready to go live with real data. **Full analysis in `clinic-legacy/data-report.md`.**

**Data explored (Session 29):**
- Oct 2020 dump fully parsed: 30,443 patients, 79,769 visits, 85,156 receipts, 5,261 clinical reports
- Fresh 2026 data imported (Session 42): 36,662 patients, 102,457 visits, 109,484 receipts (₹18.84Cr)
- Import script: `prisma/import-legacy.bun.ts`

**Remaining tasks:**
- [ ] Get final fresh SQL dump before go-live
- [ ] Copy patient photos from clinic machine (`D:\ctd21\PATIENT\`) + remap paths
- [ ] Copy scanned X-rays (16.8GB in ClinicScanned/, 2,009 patient folders)
- [ ] Final validation pass on imported data

---

## Phases 1-5: All Complete [DONE]

- Phase 1: Auth & Roles
- Phase 2: Admin Management (Doctors, Operations, Labs, Rooms)
- Phase 3: Appointment Scheduling (day view, dual-view timetable, auto-complete)
- Phase 4: Reports (7 core reports + audit log)
- Phase 5: Clinical Features (examination, treatment plans, prescriptions, file uploads)
- Consultation Flow, Treatment Plan Intelligence, Consultant Availability
- Hardening Sprints 1-3 (code quality, UI consistency, forms/validation)
- UX Overhaul (Sessions 34-36, verified with Playwright)
- Core Workflow Enhancements (Sessions 18-21)
- File Infrastructure (Session 26)

---

## Hardening Sprint 4: Performance

Prepare for production scale: 36K patients, 102K visits, 109K receipts.

### H4-1: Database Indexes (Do First)
- [ ] Add `@@index` declarations for Visit (patientId, doctorId, visitDate, parentVisitId), Receipt (visitId, receiptDate), ClinicalReport (visitId, doctorId), Patient (name, mobile)
- [ ] Run `prisma db push` and verify no regressions

### H4-2: Critical Query Fixes [PARTIAL — S50 fixed dashboard + receipts pagination]
- [x] `/dashboard` — raw SQL aggregation for outstanding total
- [x] `/receipts` — server-side pagination with take/skip
- [x] `/receipts/new` — filtered to operationRate>0 + take:500
- [ ] `/reports/outstanding` — server-side pagination (currently client-filtered)
- [ ] `/reports/commission` — move doctor filter to database `where` clause

### H4-3: N+1 Query Fixes
- [ ] `/patients/[id]` — parallelize queries, use `select` to exclude password
- [ ] `/reports/commission` — eliminate N+1 receipt sub-query
- [ ] `/my-activity` — collapse separate COUNT queries into one aggregate

### H4-4: Caching & Payload Optimization
- [ ] Remove `force-dynamic` from reference-data pages (`/settings/*`, `/doctors`)
- [ ] Use `select` instead of `include: true` on visit detail queries

### H4-5: Search Optimization
- [ ] Patient search: plan for Postgres `pg_trgm` GIN index (deferred to P6)

---

## Hardening Sprint 5: Security

Harden auth, close permission gaps, protect patient data.

### H5-1: Session & Authentication
- [ ] Replace raw doctor ID cookie with signed/encrypted session token
- [ ] Add `secure: true` flag to session cookie (production only)
- [ ] Add `isActive` check to `getCurrentDoctor()` — deactivated doctors locked out
- [ ] Session expiry window
- [ ] Hash passwords with bcrypt/argon2
- [ ] Rate limiting on login

### H5-2: Permission Gaps [PARTIAL — S50 fixed appointment status]
- [x] `updateAppointmentStatus` scoped to assigned doctor or admin
- [x] `createTreatmentPlan` checks `canCreateTreatmentPlans()`
- [ ] `canCollectPayments()` check on `createReceipt` + `recordCheckoutPayment`
- [ ] Validate `doctorId` in `saveExamination` matches authenticated user
- [ ] Prevent non-SYSADM from creating SYSADM accounts

### H5-3: Data Exposure
- [ ] `select` clauses to exclude password from all doctor includes
- [ ] Validate `patientId` in file upload route
- [ ] Validate foreign keys before creating visits

### H5-4: File Upload Security
- [ ] Server-side file content validation (magic bytes)
- [ ] Per-patient file enumeration protection

### H5-5: Data Integrity
- [ ] Wrap sequential ID generation in `$transaction` (race condition fix)
- [ ] Server-side input length limits on free-text fields

---

## Payments & Checkout Overhaul

Real-user feedback (Session 52) identified checkout as the next area needing attention.

### PAY-1: Receipt Types & Checkout UX
- [ ] Receipt types: Advance Payment / Partial Payment (with procedure) / Full Payment
- [ ] Quick-amount button highlight fix (selected state not reflecting)
- [ ] "Minimum due this visit" label replacing "doctor fee short" warning
- [ ] Medical alerts visible during checkout
- [ ] Receipt prints should show procedure name (not just "advance")

### PAY-2: Dashboard Outstanding Visibility
- [ ] Outstanding patients above-the-fold on reception dashboard
- [ ] Today's scheduled patients with balances (separate widget)

### PAY-3: Accountability Receipts
- [ ] Ambiguous/miscellaneous receipt option with audit trail
- [ ] Report for admin to review unallocated receipts

---

## Phase 5B: Doctor Settlement & Lab Workflow

### P5B-1: Settlement Tracking
- [ ] `DoctorSettlement` model vs report-only approach (design decision needed)
- [ ] Settlement UI: admin marks completed chains as "settled"
- [ ] Monthly settlement report

### P5B-2: Treatment Chain Finalization
- [ ] "Mark Treatment Complete" button (early finalization)
- [ ] Multi-doctor chain fee assignment

### P5B-3: Lab Cost Gating
- [ ] Warn at visit creation when lab-work visit has insufficient payment

---

## Phase 6: Production Readiness

### P6-1: Database Migration
- [ ] SQLite → PostgreSQL (Supabase)
- [ ] `pg_trgm` GIN indexes for patient search
- [ ] Verify all @@index declarations on Postgres
- [ ] Final data migration from legacy

### P6-2: Deployment
- [ ] Supabase project setup + file storage
- [ ] Vercel deployment + environment config
- [ ] Custom domain
- [ ] PWA setup for tablet use in clinic

---

## Phase 7: Nice-to-Haves

- [ ] SMS/WhatsApp integration (reminders, birthday wishes)
- [ ] Pediatric dental chart (FDI 51-85)
- [ ] Touch/mobile support for dental chart
- [ ] Week/month calendar view
- [ ] UPI/QR code payment integration
- [ ] GST invoice generation
- [ ] Patient portal
- [ ] Multi-branch support
- [ ] Register + schedule combined flow
