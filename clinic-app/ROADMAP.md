# Clinic App — Roadmap

## Current State
Built: Dashboard (role-aware, search-centric), Patient CRUD + global search (topbar + dashboard), Visits with follow-up support (visitType + parentVisitId), Receipts (auto-numbering), Patient Checkout (FIFO allocation), Doctor Commission Report, Outstanding Dues Report, **Auth (cookie-based login, role-based sidebar/dashboard)**, **Clinical Examination (per-visit exam, printable report, locking + addendums)**, **Granular Permissions (doctors see pricing/receipts, not reports/lab costs/commission)**, **File Uploads (drag-and-drop, gallery)**, **Unified Patient Chart (scrollable page, treatment timeline with doctor-colored chains, step labels)**, **Admin Management (Doctor CRUD, Operation CRUD, Lab & Rate CRUD)**, **Navigation back links on all detail + create pages**, **Inline medical history editing**, **Server action auth hardening**, **Appointment Scheduling (dual-view timetable, rooms, status flow, dashboard widget, patient/visit integration)**, **UI/UX Polish (form loading states, error handling, PatientSearch in visit form, AlertDialog safety, StatusBadge component, accessibility improvements)**, **UX Cleanup (receipt URL guards, role-aware appointment form, estimate hidden for doctors, server-side doctorId enforcement)**, **My Activity Report (doctor-only clinical activity page with summary, recent visits, follow-up pipeline)**, **Tariff Card Integration (65 SDH procedures with auto-fill pricing, tiered discounts, visit form overhaul, terminology consistency)**. 34 routes. SQLite local dev. Git repo: `github.com/sameerhimati/clinic` (private).

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

## Phase 3: Appointment Scheduling [DONE]

### P3-1: Appointment Model [DONE]
- [x] Schema: Appointment (date, timeSlot, doctorId, patientId, visitId, status, reason, notes, cancelReason, createdById)
- [x] Status flow: SCHEDULED → ARRIVED → IN_PROGRESS → COMPLETED / CANCELLED / NO_SHOW
- [x] Link appointments to visits (optional — appointment can exist before visit is created)

### P3-2: Day View [DONE]
- [x] Column-per-doctor layout with CSS Grid (rows per time period)
- [x] Doctor columns: in-house staff + any doctors with appointments
- [x] Receptionist view: all doctors as columns, full timetable
- [x] Doctor view: own column highlighted, mobile defaults to own appointments
- [x] Mobile: card list grouped by period with filter toggle

### P3-3: Appointment Management [DONE]
- [x] Create appointment from patient detail, visit detail, or standalone
- [x] Cancel with reason tracking (dialog with required reason)
- [x] Today's appointments widget on dashboard for all roles
- [x] Status actions via dropdown on each appointment card

### P3-4: Future Enhancements
- [ ] Drag-and-drop rescheduling
- [ ] Online booking: patients request slots, reception confirms based on availability
- [ ] SMS/WhatsApp appointment reminders
- [ ] Recurring appointment templates (e.g., weekly ortho adjustments)

---

## UX Cleanup & Doctor Activity [DONE]

- [x] Receipt URL guards: `/receipts`, `/receipts/[id]/print` redirect L3 to dashboard (server-side)
- [x] Estimate field hidden from L3 doctors in exam form (UI + server-side data stripping)
- [x] Role-aware appointment form: doctor auto-set, room hidden, patient Change hidden for L3
- [x] Server-side doctorId enforcement in `createAppointment` + `updateAppointment` for L3
- [x] Visits nav hidden from L3 sidebar + `/visits` redirects L3 to dashboard
- [x] Sidebar `exactPermission` support for doctor-only nav items
- [x] **My Activity page** (`/my-activity`): L3 doctor-only clinical activity report
  - Summary cards: total visits, new/follow-up split, exams completed/pending
  - Recent visits table (last 20, date-filtered): patient, operation, visit type, exam status
  - Follow-up pipeline: treatment chains with step count, last visit date, exam status
  - No financial data shown — purely clinical

---

## UX Audit & Tariff Integration [DONE]

- [x] **Tariff Card Integration** — 65 procedures from SDH Tariff Card (50 adult + 10 pedo + 5 utility), `defaultMinFee` = tariff rate
- [x] **Tariff Auto-Fill** — Visit form auto-fills rate on treatment selection, shows tariff reference inline
- [x] **Tiered Discount System** — Role-based tiers (10%/15%/20%) with server-side validation, admin custom amounts
- [x] **Visit Form Overhaul** — Reordered fields, collapsible lab section, removed card bloat
- [x] **Terminology Consistency** — "Operation/Procedure" → "Treatment" across all pages
- [x] **UX Cleanup** — Removed verbose descriptions, tightened table rows, simplified section headers, cleaned empty states

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
### P5-4: Clinical Notes Locking & Addendums [DONE]
- [x] Auto-lock after 24 hours, manual finalize
- [x] Admin unlock capability
- [x] Addendum system for locked reports
- [x] Lock indicators in timeline and visit detail

### P5-5: Treatment Timeline Overhaul [DONE]
- [x] Doctor-colored timeline chains (unique color per doctor)
- [x] Chain summary headers with billed/paid/due totals
- [x] Step labels for multi-step treatments
- [x] Visual containers for clinical notes
- [x] Expandable notes with normalized text

### P5-6: Granular Permission Model [DONE]
- [x] `canSeeReports()` — gates Reports pages (commission, outstanding)
- [x] `canSeeInternalCosts()` — gates lab costs, commission %, clinic margins
- [x] `canCollectPayments()` — gates checkout, receipt creation, "Collect" buttons
- [x] Doctors can see receipts, payment status, billing — just not internal costs or reports

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

## UX: Navigation & Inline Editing [DONE]

- [x] Back links on all detail/sub-pages (← pattern with ArrowLeft icon)
- [x] Inline medical history editing on patient detail (pencil → checkboxes → save)
- [x] Server action auth hardening (all patient/visit mutations now gated)
- [x] Input validation on disease update (dedup, bounds, type check)

---

## UX: Form Feedback, Safety & Consistency [DONE]

- [x] Loading states + error handling on all 8 forms (useTransition + toast)
- [x] PatientSearch in visit form (replaces unusable select dropdown for 40K patients)
- [x] AlertDialog for cascade deletes (patient delete, file delete) replaces window.confirm
- [x] Password field masked (type="password"), blank-on-edit preserves existing password
- [x] alert() replaced with toast.error() in appointment status updates
- [x] Back links on all create pages (patients/new, visits/new, receipts/new, doctors/new, reports)
- [x] Shared StatusBadge component (extracted from appointment-day-view, reused in dashboard + patient detail)
- [x] Date filter labels ("From"/"To") on visits, receipts, commission, outstanding pages
- [x] Dashboard always shows "Today's Appointments" card with empty state
- [x] Commission table tablet-friendly (TDS/Net columns hidden on mobile)
- [x] Sidebar collapsed state persists to localStorage

---

## Technical Debt
- [ ] Form validation (zod schemas, client + server)
- [x] Error boundaries and loading states (form loading states done)
- [ ] Optimistic UI updates
- [ ] Proper TypeScript types
- [ ] Unit tests for commission calculation
- [ ] E2E tests for critical flows
- [ ] Seed script: populate all 28 labs' rate cards
- [x] Back links on "new" pages (patients/new, visits/new, doctors/new, receipts/new)
- [x] Server action auth checks on all mutating actions
