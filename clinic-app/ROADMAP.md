# Clinic App — Roadmap

## Current State
Built: Dashboard (role-aware), Patient CRUD + search, Visits, Receipts (with auto-numbering), Patient Checkout (multi-visit allocation), Doctor Commission Report, Outstanding Dues Report, **Auth (cookie-based login, role-based sidebar/dashboard)**, **Clinical Examination (per-visit exam form, printable report, patient clinical history tab)**. Patient code is the primary identifier everywhere. SQLite local dev. Git repo: `github.com/sameerhimati/clinic` (private).

---

## Critical Fixes (Do First)

### CF-1: Patient Code as Primary Identifier [DONE]
- [x] Rename `legacyCode` → `code` throughout (schema, UI, search)
- [x] Make patient code the prominent display everywhere (list, detail, search results, receipts, visit forms)
- [x] Search box prioritizes exact code match
- [x] Patient code visible in print receipts as the primary ID
- [x] Auto-generate patient code on new patient registration (MAX+1)

### CF-2: Receipt Number System [DONE]
- [x] Auto-generated sequential `receiptNo` (MAX+1)
- [x] Display receipt number on print page, receipt lists, visit detail, patient detail

### CF-3: Patient Checkout Flow [DONE]
- [x] Multi-visit payment allocation page (`/patients/[id]/checkout`)
- [x] Auto-allocate (FIFO oldest-first) + manual override
- [x] Atomic multi-receipt creation via transaction
- [x] "Collect Payment" wired into patient detail, visit detail, dashboard, outstanding report

### CF-4: Legacy Data Import
When ready to go live with real data:
- [ ] Import script for legacy CLINIC.SQL → SQLite/Postgres
- [ ] Map legacy patient codes (P_CODE 1–40427), case numbers (H_CASE_NO 1–80316), receipt numbers (R_NO 1–20178)
- [ ] Ensure auto-generated sequences start AFTER legacy max values
- [ ] Validate data integrity (foreign keys, orphaned records, date issues)
- [ ] Handle 3-year data gap (Oct 2020 — Sep 2023) — decide how to backfill or flag

---

## Phase 1: Auth & Roles

### P1-1: Authentication System [DONE]
- [x] Simple session-based auth (cookie + server-side)
- [x] Login page (`/login`) with doctor name + password
- [x] Session middleware protecting all `(main)` routes
- [x] "Logged in as Dr. X" in topbar with logout

### P1-2: Role-Based Access Control [DONE]
Match legacy permission system:
| Level | Role | Access |
|-------|------|--------|
| 0 | SYSADM | Full access |
| 1 | Admin Doctor | Full access |
| 2 | Reception | Patient form (read/write), receipts, appointments |
| 3 | Doctor | Read patients/visits, write reports, no patient edit/delete |

- [x] Sidebar filters nav items based on `permissionLevel`
- [x] UI hides/disables actions based on role
- [x] Different dashboard views per role (doctors see their patients, admin/reception see collections)
- [x] Audit trail: `createdById` on receipts

---

## Phase 2: Admin Management

### P2-1: Doctor Management
- [ ] Doctor list with CRUD
- [ ] Commission settings (percent, fixed rate, TDS)
- [ ] Commission history (D_DETAILS) — date-ranged percentage changes
- [ ] Active/inactive toggle
- [ ] Password management

### P2-2: Operation/Procedure Management
- [ ] Operation list grouped by category
- [ ] Add/edit/deactivate operations
- [ ] Default fee (min/max) management
- [ ] Category management (Periodontics, Endodontics, etc.)

### P2-3: Lab & Lab Rate Management
- [ ] Lab list with CRUD
- [ ] Lab rate cards per lab (nested CRUD)
- [ ] Active/inactive toggle

---

## Phase 3: Appointment Scheduling

- [ ] Appointment creation (standalone or linked to visit)
- [ ] Calendar/day view of appointments
- [ ] Doctor-specific appointment views
- [ ] Status tracking (scheduled → confirmed → completed/cancelled/no-show)
- [ ] Today's appointments on dashboard

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

## Phase 5: Clinical Features

### P5-1: Clinical Examination (DR_REPORT) [DONE]
- [x] Clinical report form per visit (complaint, examination, diagnosis, treatment, medication, estimate)
- [x] View clinical history per patient (Clinical tab on patient detail)
- [x] Complaint suggestions (hardcoded chips, free text field)
- [x] Printable clinical report
- [x] Clinical notes shown on visit detail page

### P5-2: Document/Image Management
- [ ] File upload for patient documents (photos, X-rays, scanned reports)
- [ ] Image viewer in patient detail page
- [ ] File type filtering (images, PDFs)
- [ ] Storage: local filesystem initially, Supabase Storage later

---

## Phase 6: Production Readiness

### P6-1: Database Migration
- [ ] Migrate from SQLite → PostgreSQL (Supabase)
- [ ] Schema adjustments for Postgres (TIMESTAMPTZ, SERIAL, etc.)
- [ ] Data migration script from legacy CLINIC.SQL
- [ ] Verify all 30K+ patients, 80K+ visits, 85K+ receipts migrate cleanly

### P6-2: Supabase Integration
- [ ] Supabase project setup
- [ ] Migrate auth to Supabase Auth
- [ ] Row-Level Security (RLS) policies
- [ ] File storage via Supabase Storage
- [ ] Realtime subscriptions for multi-user updates

### P6-3: Deployment
- [ ] Vercel deployment
- [ ] Environment configuration (prod DB, etc.)
- [ ] Custom domain setup
- [ ] PWA setup for tablet use in clinic

---

## Phase 7: Nice-to-Haves

- [ ] SMS/WhatsApp integration (appointment reminders, birthday wishes)
- [ ] Tooth chart / dental diagram (visual tooth selection)
- [ ] Treatment plan builder (multi-visit plans with estimates)
- [ ] UPI/QR code payment integration
- [ ] GST invoice generation
- [ ] Prescription module (proper drug/dosage/period system)
- [ ] Patient portal (patients view their own history)
- [ ] Multi-branch support

---

## Technical Debt
- [ ] Add proper form validation (zod schemas, client + server)
- [ ] Error boundaries and loading states
- [ ] Optimistic UI updates
- [ ] Proper TypeScript types (no `Record<string, unknown>`)
- [ ] Unit tests for commission calculation
- [ ] E2E tests for critical flows (patient registration, visit + receipt, commission report)
- [ ] Seed script: populate all 28 labs' rate cards (currently only 5 labs have rates)
