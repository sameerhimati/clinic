# Clinic App — Roadmap

## Current State
Built: Dashboard (role-aware, search-centric), Patient CRUD + global search (topbar + dashboard), Visits with follow-up support (visitType + parentVisitId), Receipts (auto-numbering), Patient Checkout (FIFO allocation), Doctor Commission Report, Outstanding Dues Report, **Auth (cookie-based login, role-based sidebar/dashboard)**, **Clinical Examination (per-visit exam, printable report)**, **Payment Gating (doctors see pricing not payments)**, **File Uploads (drag-and-drop, gallery)**, **Unified Patient Chart (scrollable page, treatment timeline with nested follow-ups)**, **Admin Management (Doctor CRUD, Operation CRUD, Lab & Rate CRUD)**. 29 routes. SQLite local dev. Git repo: `github.com/sameerhimati/clinic` (private).

---

## Critical Fixes (Do First)

### CF-1: Patient Code as Primary Identifier [DONE]
- [x] `code` field, prominent display, search priority, auto-generation

### CF-2: Receipt Number System [DONE]
- [x] Auto-generated sequential `receiptNo` (MAX+1)

### CF-3: Patient Checkout Flow [DONE]
- [x] Multi-visit FIFO allocation, atomic multi-receipt creation

### CF-4: Legacy Data Import
When ready to go live with real data:
- [ ] Import script for legacy CLINIC.SQL → SQLite/Postgres
- [ ] Map legacy patient codes (P_CODE 1–40427), case numbers (H_CASE_NO 1–80316), receipt numbers (R_NO 1–20178)
- [ ] Ensure auto-generated sequences start AFTER legacy max values
- [ ] Validate data integrity (foreign keys, orphaned records, date issues)

---

## Phase 1: Auth & Roles [DONE]

### P1-1: Authentication System [DONE]
### P1-2: Role-Based Access Control [DONE]
### P1-3: Payment Gating [DONE]

---

## Phase 2: Admin Management [DONE]

### P2-1: Doctor Management [DONE]
- [x] Doctor list with CRUD (create, edit, active/inactive toggle)
- [x] Commission settings (percent, fixed rate, TDS)
- [x] Password management
- [x] Permission level management (0=SYSADM, 1=Admin, 2=Reception, 3=Doctor)

### P2-2: Operation/Procedure Management [DONE]
- [x] Operation list grouped by category
- [x] Add operations with category, min/max fee
- [x] Active/inactive toggle

### P2-3: Lab & Lab Rate Management [DONE]
- [x] Lab list with CRUD
- [x] Lab rate cards per lab (nested CRUD)
- [x] Active/inactive toggle

---

## UX: Global Search, Dashboard, Patient Chart [DONE]

- [x] Global patient search in topbar (code/name/phone, keyboard shortcuts)
- [x] Dashboard redesign: search-centric, time-aware greeting, compact stats
- [x] Login page with clinic branding
- [x] Patient detail: unified scrollable page (no tabs), treatment timeline
- [x] Visit model: follow-up visits with parentVisitId + visitType (NEW/FOLLOWUP/REVIEW)
- [x] Visit form: follow-up mode with pre-filled context, "F/U ↗" buttons

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

## Phase 5: Clinical Features [DONE]

### P5-1: Clinical Examination [DONE]
### P5-2: Document/Image Management [DONE]
### P5-3: Clinical Summary Timeline [DONE]

---

## Phase 6: Production Readiness

### P6-1: Database Migration
- [ ] Migrate from SQLite → PostgreSQL (Supabase)
- [ ] Data migration script from legacy CLINIC.SQL
- [ ] Verify all 40K+ patients, 80K+ visits migrate cleanly

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

---

## Technical Debt
- [ ] Form validation (zod schemas, client + server)
- [ ] Error boundaries and loading states
- [ ] Optimistic UI updates
- [ ] Proper TypeScript types
- [ ] Unit tests for commission calculation
- [ ] E2E tests for critical flows
- [ ] Seed script: populate all 28 labs' rate cards
