# Clinic App — Roadmap

## Current State (MVP)
Built: Dashboard, Patient CRUD + search, Visits, Receipts, Doctor Commission Report, Outstanding Dues Report. No auth. SQLite local dev.

---

## Critical Fixes (Do First)

### CF-1: Patient Code as Primary Identifier
The clinic uses the patient code (SDH number like `10001`, `30427`) as THE identifier — it's what staff types in, prints on receipts, and references in conversation. Currently it's called `legacyCode` and treated as secondary.

- [ ] Rename `legacyCode` → `code` throughout (schema, UI, search)
- [ ] Make patient code the prominent display everywhere (list, detail, search results, receipts, visit forms)
- [ ] Search box should prioritize exact code match (typing `10045` should jump to that patient)
- [ ] Show patient code prominently in visit and receipt forms
- [ ] Patient code should be visible in print receipts as the primary ID

### CF-2: Receipt Number System
Legacy system has a separate receipt number sequence (`R_NO`, 1-20178). Currently receipts only use auto-increment ID.

- [ ] Add `receiptNo` field (auto-generated sequential)
- [ ] Display receipt number on print page and receipt lists

---

## Phase 1: Auth & Roles

### P1-1: Authentication System
- [ ] Simple session-based auth (cookie + server-side)
- [ ] Login page (`/login`) with doctor name + password
- [ ] Session middleware protecting all `(main)` routes
- [ ] "Logged in as Dr. X" in topbar with logout

### P1-2: Role-Based Access Control
Match legacy permission system:
| Level | Role | Access |
|-------|------|--------|
| 0 | SYSADM | Full access |
| 1 | Admin Doctor | Full access |
| 2 | Reception | Patient form (read/write), receipts, appointments |
| 3 | Doctor | Read patients/visits, write reports, no patient edit/delete |

- [ ] Middleware checks `permissionLevel` on protected routes
- [ ] UI hides/disables actions based on role
- [ ] Different dashboard views per role (reception sees today's appointments, doctors see their patients)
- [ ] Audit trail: `createdById` on receipts, visits

---

## Phase 2: Admin Management (P1 Features)

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

## Phase 3: Appointment Scheduling (P1)

- [ ] Appointment creation (standalone or linked to visit)
- [ ] Calendar/day view of appointments
- [ ] Doctor-specific appointment views
- [ ] Status tracking (scheduled → confirmed → completed/cancelled/no-show)
- [ ] Today's appointments on dashboard

---

## Phase 4: Remaining Reports (P2)

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

## Phase 5: Clinical Features (P2)

### P5-1: Clinical Examination (DR_REPORT)
- [ ] Clinical report form per visit (complaint, examination, diagnosis, treatment, medication)
- [ ] View clinical history per patient
- [ ] Complaint and treatment lookups

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

## Phase 7: Nice-to-Haves (P3)

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
