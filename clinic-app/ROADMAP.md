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

## Hardening Sprint 1: Code Quality

Eliminate duplication, fix types, add error boundaries, clean dead code. Foundation for all subsequent sprints.

### H1-1: Extract Shared Utilities
- [ ] Move `requireAdmin()` to `src/lib/auth.ts` (duplicated in 4 action files: doctors, labs, operations, rooms)
- [ ] Extract balance calculation to `src/lib/billing.ts` — `calcBilled()`, `calcPaid()`, `calcBalance()` (duplicated in 7 places)
- [ ] Extract `VALID_TRANSITIONS` to `src/lib/appointment-status.ts` (duplicated in actions.ts and appointment-day-view.tsx)
- [ ] Extract file validation constants (allowed types, max size) to `src/lib/file-constants.ts` (duplicated in upload route and FileUpload component)
- [ ] Extract `InfoRow`/`DetailRow` to `src/components/detail-row.tsx` (duplicated in patients/[id] and visits/[id])

### H1-2: TypeScript Fixes
- [ ] Remove `as any` cast on `TreatmentTimeline` props — define proper `VisitWithRelations` type matching Prisma include
- [ ] Replace `Record<string, unknown>` with `Prisma.ReceiptWhereInput` in commission report
- [ ] Add union types for status strings: `AppointmentStatus`, `VisitType`, `PaymentMode` (currently raw strings, typos are silent bugs)
- [ ] Fix `useEffect` empty dependency array in visit-form.tsx (uses `isFollowUp`, `defaultOperationId`, `operations` but declares `[]`)
- [ ] Audit all `as string` casts in server actions — replace with proper type narrowing

### H1-3: Error Boundaries & Loading States
- [ ] Add `error.tsx` to `(main)` layout — catches all server component crashes with recovery UI
- [ ] Add `loading.tsx` skeletons to: `/patients`, `/visits`, `/receipts`, `/appointments`, `/dashboard`
- [ ] Add user-safe error layer in server actions — distinguish internal errors (Prisma constraint violations) from user errors (validation), never expose schema details in toast
- [ ] Fix `FileGallery` silent error swallow — show toast on delete failure

### H1-4: Dead Code & Unused Dependencies
- [ ] Remove `isAdmin = true` hardcoded in doctors/page.tsx and settings/page.tsx (dead code, check already happens at top)
- [ ] Remove `@react-pdf/renderer` from dependencies (installed but unused — print pages use HTML/CSS print styles)
- [ ] Remove `next-themes` from dependencies (dark mode explicitly disabled, all `dark:` prefixes already removed)
- [ ] Remove redundant client-side re-sort in patients/page.tsx (server already sorts by code for numeric queries)

### H1-5: Schema Integrity
- [ ] Add `@@unique([visitId])` to `ClinicalReport` — enforce one report per visit at DB level (currently only enforced by app logic)
- [ ] Ensure SQLite foreign keys are enabled — add `PRAGMA foreign_keys = ON` via Prisma connection or middleware

---

## Hardening Sprint 2: UI/UX Consistency

Kill "AI-generated" smell. Make every page feel like the same app built by the same team.

### H2-1: Layout Standardization
- [ ] Standardize all form page widths to `max-w-3xl` (currently: receipts/new `max-w-2xl`, patients/new `max-w-4xl`, appointments/new `max-w-2xl`, visits/new `max-w-3xl`, checkout `max-w-3xl`)
- [ ] Standardize page title to `text-2xl font-bold` everywhere (dashboard currently uses `text-lg`)
- [ ] Standardize filter button text to "Filter" everywhere (currently: "Search" on patients, "Filter" on visits/receipts, "Generate" on reports)
- [ ] Add "Clear" button/link next to all date filter forms (currently no way to reset filters)

### H2-2: Component Consistency
- [ ] Replace all raw `<select>` elements with shadcn `<Select>` or a shared `FilterSelect` component (affects: visit form doctor dropdown, appointment form doctor/room, report filters, doctor form designation/permission)
- [ ] Fix broken `<Label htmlFor>` associations on all select/dropdown elements (login form, doctor form, visit form, appointment form)
- [ ] Standardize separator style: use consistent separator between page title and name (doctor edit uses `--`, patient edit uses `:`)

### H2-3: Terminology & Display Fixes
- [ ] Replace permission level numbers with role names: "Level: 0" → "SysAdmin", "Level: 1" → "Admin", "Level: 2" → "Reception", "Level: 3" → "Doctor" (doctors list page)
- [ ] Fix `"patient(s)"` pluralization — use proper plural: "1 patient found" vs "25 patients found" (affects: patients, visits, receipts list pages)
- [ ] Replace "Checkout" with "Bill Payment" or "Collect Payment" (e-commerce language in a clinic)
- [ ] Replace "Operation Rate" with "Treatment Fee" on receipt print page (internal jargon on patient-facing document)
- [ ] Remove "ESTIMATE" from printed clinical report (financial data should not appear on patient-facing clinical document)
- [ ] Fix "Exams Done"/"Exams Pending" → "Notes Written"/"Notes Pending" on My Activity page (less ambiguous)
- [ ] Add `P#` prefix consistency — receipt list uses `P#` for patient code but nowhere else does. Remove or standardize.

### H2-4: Page-Specific Fixes
- [ ] Visit detail: replace 3 billing cards with inline pills (match patient detail's compact style)
- [ ] Visit detail: remove redundant "Visit Details" card — info already in header. Keep only: lab info, commission %, notes, step label
- [ ] Visit detail: consolidate duplicate "Edit Notes" buttons (one in header actions, one in clinical notes card)
- [ ] Reports hub: simplify — either make sidebar links directly or add descriptions to the 2 cards
- [ ] Commission report: replace unbounded summary cards with a summary table (8 doctors = 8 cards = 3 rows before detail table)
- [ ] Commission report: add rupee symbol to detail table values (summary cards have it, table doesn't)
- [ ] Outstanding report: replace lonely full-width total card with inline stat
- [ ] Settings operations page: add inline fee editing (currently can only create and toggle, not edit tariff rates)
- [ ] Doctor dashboard: add empty state for zero appointments ("No appointments scheduled for today")
- [ ] Lab detail page: fix back-link to use standard pattern (currently uses `Button variant="ghost"` instead of bare `Link`)
- [ ] Lab detail page: replace raw `<input>` elements with shadcn `<Input>` (styling inconsistency)
- [ ] Rooms page: label the sort order column (currently just a number with no context)

### H2-5: Appointments Page Structure
- [ ] Add page-level `<h2>` title and back link to appointments page (only page without server-rendered title)
- [ ] Remove duplicate patient search on admin dashboard (topbar search + dashboard search visible simultaneously)

---

## Hardening Sprint 3: Forms

Add validation, fix bugs, improve accessibility. Make every form production-ready.

### H3-1: Zod Schema Validation
- [ ] Create `src/lib/validations.ts` with Zod schemas for all entities
- [ ] Patient schema: name required + trimmed, mobile `type="tel"` with `pattern="[0-9]{10}"`, pincode 6 digits, DOB not in future, age ≥ 0
- [ ] Visit schema: patientId required, operationId required (currently allows phantom visits with no treatment), rate ≥ 0, discount ≤ rate
- [ ] Receipt schema: amount > 0, amount ≤ balance, whole rupees (no paise)
- [ ] Appointment schema: date not in past, patient required
- [ ] Doctor schema: commission 0-100 bounds, TDS 0-100 bounds, prevent non-SYSADM from creating SYSADM accounts
- [ ] Wire Zod schemas into all server actions — replace raw `formData.get() as string` + `parseInt`/`parseFloat`
- [ ] Add client-side validation mirroring server schemas on all forms

### H3-2: Form Bug Fixes
- [ ] Fix UTC date bug in visit form, appointment form, receipt form — replace `new Date().toISOString().split("T")[0]` with `format(new Date(), "yyyy-MM-dd")` from date-fns (3 forms affected, exam form already correct)
- [ ] Fix examination complaint pill bug — `complaint.toUpperCase().includes(c)` prevents adding "JAW PAIN" when "PAIN" exists. Use `.split(",").map(s=>s.trim()).includes(c)` for the add check too
- [ ] Fix `updateAppointment` — add past-date validation (createAppointment validates, update doesn't)
- [ ] Fix `finalizeReport` — add guard against double-finalization (currently silently overwrites lock timestamp)
- [ ] Fix comma-in-number parsing in checkout form — `parseFloat("10,000")` returns 10. Sanitize input by stripping commas.
- [ ] Fix form state reset for inline forms (Operation, Lab, Lab Rate, Room) — key the component to open/close cycle so old values don't persist

### H3-3: Form UX Improvements
- [ ] Patient form: add `type="tel"` on mobile field, add `required` visual indicator on name + mobile
- [ ] Patient form: trim name server-side (currently stores leading/trailing spaces)
- [ ] Visit form: add ARIA attributes to OperationCombobox (`role="listbox"`, `aria-expanded`, `aria-activedescendant`)
- [ ] Visit form: disable submit when no patient selected (currently allows server round-trip to fail)
- [ ] Receipt form: auto-fill amount from outstanding balance when visit selected (saves a step 80% of the time)
- [ ] Receipt form: add "Pay Full Amount" quick button
- [ ] Receipt form: add confirmation before submission ("Creating Receipt for Rs. X against Case #Y for Patient Z")
- [ ] Checkout form: make it a proper `<form>` element (currently button `onClick` — no Enter-to-submit, no form semantics)
- [ ] Examination form: make it a proper `<form>` element (same issue)
- [ ] Examination form: add `beforeunload` dirty-state warning (doctors can lose 10 minutes of clinical notes by navigating away)
- [ ] Operation/Lab/Room create forms: add success toast after creation
- [ ] Medical history editor: increase touch target size for Save/Cancel (currently ~24px, should be ≥44px for tablet)

### H3-4: Lab Rate Auto-Fill
- [ ] Visit form: auto-fill lab rate amount when lab rate item is selected (currently defaults to 0, user must manually type)
- [ ] Lab rate create form: default rate to empty with placeholder instead of 0

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
- [ ] `/receipts/new` — add `where` clause to only fetch visits with outstanding balance (currently loads ALL 80K visits, filters in JS). Use raw SQL or Prisma `having` equivalent.
- [ ] `/dashboard` — replace full visit scan for outstanding total with aggregated SQL query or limit to recent visits
- [ ] `/reports/outstanding` — add server-side pagination + move balance filter to database query (currently loads all visits, no `take` limit)
- [ ] `/reports/commission` — move doctor filter to database `where` clause (currently loads all receipts, filters in JS). Use `select` on doctor include to exclude password field.

### H4-3: N+1 Query Fixes
- [ ] `/patients/[id]` — parallelize main patient query and appointments query with `Promise.all` (currently sequential)
- [ ] `/patients/[id]` — remove duplicate files include (loaded at both patient-level and per-visit level)
- [ ] `/patients/[id]` — use `select` on `uploadedBy` to exclude password field (currently fetches full Doctor row)
- [ ] `/reports/commission` — eliminate N+1 receipt sub-query pattern (per-receipt sub-query for prior payments)
- [ ] `/my-activity` — collapse 5 separate `COUNT` queries into one `groupBy` or raw SQL aggregate
- [ ] `/visits/[id]/examine` — remove redundant `revalidateVisitPaths` DB query (visit already loaded earlier in the function)

### H4-4: Caching & Payload Optimization
- [ ] Remove `force-dynamic` from reference-data pages: `/settings/*`, `/doctors` — use `revalidatePath` in their server actions instead
- [ ] Add `revalidatePath("/visits/new")` to operation/lab mutation actions so the visit form caches reference data
- [ ] Use `select` instead of `include: true` on visit detail queries — only fetch needed columns (patient, operation, doctor, lab)
- [ ] Split TreatmentTimeline: extract `QuickNoteForm` as sole `"use client"` component, keep timeline rendering as server component

### H4-5: Search Optimization
- [ ] Patient search: add note/plan for Postgres `pg_trgm` GIN index migration (LIKE `%q%` cannot use B-tree indexes)
- [ ] Patient list: remove redundant `count` query — use `SELECT COUNT(*) OVER()` on Postgres or accept approximate count on SQLite
- [ ] Appointments page: replace fragile "in-house doctor" heuristic with explicit `isInHouse` boolean on Doctor model

---

## Hardening Sprint 5: Security

Harden auth, close permission gaps, protect patient data. Done last so all prior changes are secured together.

### H5-1: Session & Authentication
- [ ] Replace raw doctor ID cookie with signed/encrypted session token (use `iron-session` or `jose` JWT with server secret)
- [ ] Add `secure: true` flag to session cookie (conditional on production environment)
- [ ] Add `isActive` check to `getCurrentDoctor()` — deactivated doctors immediately locked out
- [ ] Add session expiry to a reasonable window (reduce from 30 days or add server-side session store for revocation)
- [ ] Hash passwords with bcrypt/argon2 (replace plaintext storage and comparison)
- [ ] Add rate limiting on login (max 5 attempts per 5 minutes per IP or account)
- [ ] Stop exposing all doctor names/IDs on the login page to unauthenticated users (or accept this as intentional UX for a LAN-only clinic)

### H5-2: Permission Gaps
- [ ] Add `canCollectPayments()` check to `createReceipt` server action (currently only UI-gated, L3 doctors can call directly)
- [ ] Add `canCollectPayments()` check to `recordCheckoutPayment` server action (same gap)
- [ ] Validate `doctorId` in `saveExamination` matches authenticated user (currently accepts any client-supplied doctorId)
- [ ] Scope `updateAppointmentStatus` to assigned doctor or admin (currently any authenticated user can transition any appointment)
- [ ] Prevent non-SYSADM users from creating SYSADM accounts via doctor form

### H5-3: Data Exposure
- [ ] Add `select` clause to doctor edit page query — exclude `password` from RSC serialization to client
- [ ] Add `select` clause to commission report doctor include — exclude `password` field
- [ ] Add `select` clause to all `uploadedBy: true` includes — exclude `password` field
- [ ] Validate `patientId` in file upload route — check that the patient exists and caller has access
- [ ] Validate foreign keys (operationId, doctorId, labId) exist before creating visit records

### H5-4: File Upload Security
- [ ] Move uploaded files behind an authenticated API route (currently served unauthenticated from `/public/uploads/`)
- [ ] Add server-side file content validation (check magic bytes, not just MIME type) to prevent HTML/script upload
- [ ] Add per-patient file enumeration protection (currently predictable paths: `/uploads/patients/{id}/{timestamp}-{name}`)

### H5-5: Data Integrity
- [ ] Wrap sequential ID generation in `$transaction` for `createPatient`, `createVisit`, `createReceipt` (race condition: two concurrent requests get same MAX → duplicate/error)
- [ ] Add `deletePatient` pre-check for existing visits (currently fails silently with FK error or orphans data)
- [ ] Add server-side input length limits on all free-text fields (name, address, clinical notes)
- [ ] Add audit logging for sensitive operations (login attempts, receipt creation, permission changes, clinical report edits)

---

## Phase 6: Production Readiness

### P6-1: Database Migration
- [ ] Migrate from SQLite → PostgreSQL (Supabase)
- [ ] Data migration script from legacy CLINIC.SQL
- [ ] Verify all 40K+ patients, 80K+ visits migrate cleanly
- [ ] Add `pg_trgm` GIN indexes for patient search (name, mobile)
- [ ] Verify all @@index declarations perform correctly on Postgres

### P6-2: Supabase Integration
- [ ] Supabase project setup
- [ ] Migrate auth to Supabase Auth (replaces cookie-based session from H5-1)
- [ ] Row-Level Security (RLS) policies
- [ ] File storage via Supabase Storage (replaces local filesystem from H5-4)

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

## Completed Phases (Archived)

### UX: Navigation & Inline Editing [DONE]

- [x] Back links on all detail/sub-pages (← pattern with ArrowLeft icon)
- [x] Inline medical history editing on patient detail (pencil → checkboxes → save)
- [x] Server action auth hardening (all patient/visit mutations now gated)
- [x] Input validation on disease update (dedup, bounds, type check)

### UX: Form Feedback, Safety & Consistency [DONE]

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
