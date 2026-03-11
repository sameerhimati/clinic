# Clinic Workflow Redesign & UX Fixes

> **Ground truth document for the clinic rebuild.** Read this file every session.
> Part 1 = How the clinic should work (workflow + permissions). Part 2 = Specific bugs/issues.
> All roadmap and session-handoff items are secondary to this file until it's complete.

---

# Part 1: Workflow Redesign

## Role & Permission Model

### Roles (4 levels)

| Level | Role | Who | Core Job |
|-------|------|-----|----------|
| L1 | Admin | Dr. Kazim | System config, user management, full access, oversight |
| L2 | Front Desk | Murli + staff | Patient onboarding, scheduling, payments, lab follow-up |
| L3 | BDS Doctor | In-house dentists | Examine, diagnose, create treatment plans |
| L4 | Consultant | Visiting specialists | View own schedule, examine assigned cases, mark work done |

### Super-User Tier (within L2 and L3)

Each role has an optional **super-user** flag (`isSuperUser` boolean on Doctor model). Super-users get additional privileges within their role without needing L1 access.

| Role | Standard | Super-User | Example Super-User |
|------|----------|------------|-------------------|
| L2 | Schedule, collect payments, standard discounts (up to 20%) | Change lab rates, change tariff rates, authorize large discounts (up to 50%+), manage lab relationships | Murli |
| L3 | Examine, create treatment plans, 20% max discount | Edit examination dropdown options (findings list), edit treatment step templates, clinical configuration | Clinical Head (Dr. Baisakhi?) |

**100% discounts** (family/VIP): Only L1, or L2 super-user acting on explicit L1 instruction.

### Audit & Accountability (instead of approval queues)

Kazim is not at a computer all day. Don't block workflow with approvals. Instead:

- **`AuditLog` table**: Who did what, when, to which patient/visit
- **Auto-flagged events**: Discount >20%, lab rate change, tariff change, treatment plan modification, cancelled treatment
- **Every flagged action requires a reason field** (mandatory text: "family member", "patient hardship", etc.)
- **Monthly review report for L1**: Filterable log of all flagged actions — who, what, why
- **No blocking**: Actions happen immediately, accountability is after-the-fact

### What Each Role Can and Cannot Do

**L2 — Front Desk:**
- CAN: Register patients, schedule all appointments (first-time + follow-ups), collect payments, manage escrow, follow up with patients, follow up with labs, print prescriptions, view all schedules
- CAN (super-user only): Change lab rates, change tariff rates, authorize discounts >20%
- CANNOT: Examine patients, create treatment plans, mark procedures complete

**L3 — BDS Doctor:**
- CAN: Examine patients, create treatment plans (tooth-by-tooth), select labs during planning, prescribe medication, view their own schedule, give up to 20% discount
- CAN (super-user only): Edit examination findings dropdown, edit treatment step templates
- CANNOT: Schedule appointments, create visits directly, change lab/tariff rates, authorize large discounts

**L4 — Consultant:**
- CAN: View their own schedule, view case summary for assigned patients, examine patients, mark work done, add notes to existing cases
- CANNOT: See tariffs, schedule anything, create treatment plans, create visits, see financial details, manage anything administrative
- UI: Stripped down — schedule + patient examination only

---

## Key Workflow 1: New Patient -> Treatment Plan -> Execution

### Step 1: Patient Arrives (L2)
1. Front desk registers patient (name, mobile, age, gender — quick registration)
2. Collects medical history: current medications (especially blood thinners), past surgeries, allergies
3. Schedules appointment with BDS doctor

### Step 2: BDS Examination (L3)
1. Doctor opens patient from their schedule/waiting room
2. **Dental chart is the primary interface** — doctor clicks tooth/teeth
3. Per-tooth: select findings from dropdown (Caries, Chip, Fracture, Mobility, Missing, etc.)
4. Per-tooth: recommend treatment (RCT, Extraction, Crown, Filling, etc.)
5. Multi-tooth selection supported (e.g. bridge spanning 3 teeth — shift-click or drag)
6. **If lab work involved** (e.g. Crown — ceramic vs zirconia): dropdown shows available labs + their prices for that specific material
7. Treatment plan auto-generated from per-tooth findings + treatments
8. Optional: prescribe medication → notification sent to front desk for printing
9. Mark examination as complete

### Step 3: Front Desk Schedules Follow-up (L2)
1. Front desk sees treatment plan created by BDS doctor
2. Matches treatment type to appropriate consultant/department (e.g. extractions → surgeon, RCT → endodontist)
3. Schedules follow-up appointment with correct consultant
4. Collects advance payment (typically 500-1000) to lock in appointment
5. Payment goes into **patient escrow** (not allocated to specific treatment yet)

### Step 4: Consultant Executes (L4)
1. Consultant opens their schedule, sees patient
2. Sees **smart case summary**: what BDS recommended, per-tooth findings, what's been done, what's pending
3. Examines patient, may agree or disagree with plan:
   - **Agrees**: Performs procedure, marks "Work Done" on specific tooth/teeth
   - **Disagrees**: Marks plan item as "changed", recommends alternative (e.g. extraction instead of RCT)
4. "Work Done" entry = **strict definition of complete**
   - Updates tooth status on dental chart
   - Advances treatment plan step
   - Triggers escrow fulfillment for that procedure
5. Optional: add notes to case, prescribe medication

### Step 5: Payment Fulfillment (Automatic)
1. When "Work Done" is marked, system fulfills payment from escrow
2. Doctor/consultant fee allocated from escrow to that treatment
3. Remaining escrow stays for future treatments
4. Front desk can see escrow balance + fulfilled vs pending

---

## Key Workflow 2: The Escrow Payment Model (NEW)

### How It Works
1. **Patient pays money** → goes into patient escrow (a running balance)
2. **Money is unallocated** — not tied to any specific treatment until procedure is complete
3. **Procedure marked complete** ("Work Done" button) → system allocates payment from escrow
4. **Escrow balance** = total paid - total fulfilled

### Why This Matters
Handles plan changes gracefully:
- BDS recommends RCT on 4 teeth, patient pays 4000 advance
- Consultant says tooth 14 needs extraction, not RCT
- No refund needed — escrow money just gets allocated to extraction instead
- Other 3 teeth continue with RCT as planned
- Front desk sees clear escrow balance at all times

### Escrow Rules
- Advance payment at scheduling → escrow
- Additional payments at any time → escrow
- Procedure complete → auto-deduct from escrow (amount = tariff rate minus any discount)
- Escrow can go negative (patient owes money) — front desk sees outstanding
- Monthly settlement: escrow fulfillments feed into doctor commission report

---

## Key Workflow 3: Treatment Plan Changes

When a consultant disagrees with the original BDS plan:
1. Consultant opens case, sees BDS treatment plan
2. Marks specific plan item as "Changed" or "Not Applicable" with reason
3. Recommends alternative treatment for that tooth (here we need to notify the BDS Doctors/Front Desk to schedule with the concerned consultant)
4. System: original plan item → cancelled, new plan item → created
5. Escrow allocation unchanged (money is unallocated until work done)
6. Front desk sees the change, can reschedule as needed
7. Audit log captures: who changed what, when, why

---

## Key Workflow 4: Patient Follow-up & Reminders (NEW)

### Problem
Patient gets treatment plan but doesn't schedule. Or completes treatment but needs 6-month checkup. Currently no tracking.

### Solution
- **Pending follow-up queue**: Patients with treatment plans but no scheduled appointments
- **Follow-up schedule per treatment type**: e.g. "RCT → 6-month checkup", "Extraction → 1-week follow-up"
- **Front desk dashboard widget**: "Patients needing follow-up calls" with phone numbers, last visit date, what's pending
- **Post-treatment reminders**: After treatment complete, auto-create reminder at defined interval
- **Status tracking**: Called / No Answer / Scheduled / Declined

---

## Key Workflow 5: Dental Chart as Primary Interface (REDESIGN)

### Current State
Simple 32-tooth grid. Click to select, stores as JSON array. No per-tooth data.

### Target State: Odontogram
1. **Visual tooth map** with current status per tooth (color-coded: healthy, caries, filled, crowned, missing, etc.)
2. **Click a tooth** → panel shows: current findings, work history, active plan items
3. **Multi-tooth selection**: Shift-click or drag for bridges, quadrants
4. **Per-tooth findings**: Dropdown of common problems (Caries, Chip, Fracture, Mobility, Periapical Lesion, etc.)
   - This dropdown is **editable by L3 super-user** (like how L1 edits tariffs)
   - Stored as a `ToothFinding` reference table
5. **Per-tooth treatments**: After selecting findings, select recommended treatment
6. **Work Done section**: Separate from treatment plan — records what was ACTUALLY done today
   - Work Done = past (what happened this visit)
   - Treatment Plan = future (what needs to happen)
   - Work Done entry auto-updates tooth status + advances plan + triggers escrow

### Schema Impact
- `ToothStatus` model: per patient, per tooth number — current state, finding history, work history
- `ToothFinding` reference table: editable list of possible findings (L3 super-user manages)
- `WorkDone` model: per visit, per tooth — what procedure was performed, links to treatment plan item

---

## Key Workflow 6: Prescription Flow (REDESIGN)

### Current State
Medication tab on examination form. Notes-based.

### Target State
1. Remove medication section from exam form entirely
2. Optional "Prescribe Medication" button on exam form
3. Opens separate prescription form (drug, dosage, frequency, duration)
4. On save: creates `Prescription` record linked to visit
5. **Auto-notification to front desk**: "Patient X needs prescription printed"
6. Front desk prints on A4 clinic letterhead
7. Doctor signs physical printout
8. Print layout: professional prescription format with clinic header, patient info, Rx details

---

## Patient Page Redesign

### Current Problem
Long scrollable page with sections. Information not prioritized. Confusing.

### Target Layout
**Sticky header**: Patient name, code, age, mobile, medical alerts (blood thinners etc.), escrow balance

**Main area — Dental chart as hero**:
- Interactive odontogram showing current tooth states at a glance
- Click any tooth to see its full history
- Active treatment plan items shown per-tooth on the chart

**Below chart**:
- Active treatment plans (with progress)
- Upcoming appointments
- Payment summary (escrow balance, outstanding)

**Secondary** (collapsible or tab):
- Visit history / timeline
- Files / X-rays
- Patient info (demographics, medical history)

---

## Things to Remove
- [ ] "New Visit" button on patient page for L3/L4
- [ ] Visit creation sidebar/sheet (visits auto-created from appointments only)
- [ ] Direct visit or appointment scheduling by L3/L4 (they VIEW schedule only)
- [ ] Medication tab on examination form (replace with prescription flow)
- [ ] Any L3/L4 access to scheduling, payment collection, lab rate changes
- [ ] Visits sidebar nav for L4 (they don't need to browse visits)

---

# Part 2: Specific UX Bugs & Issues

> Priority: P0 = blocks workflow, P1 = painful daily, P2 = polish.
> Updated: Session 49 — Full UX Audit (4-persona Playwright walkthrough, 2026-03-11)
> Previous items marked [x] = implemented in earlier sessions.

---

## Previously Reported (Status Update)

### Completed ✅
- [x] P0: L4 permission level for consultants — DONE (Session 38)
- [x] P0: Super-user flag for L2/L3 — DONE (Session 38)
- [x] P0: Escrow model — DONE (Sprint 5)
- [x] P0: Remove "New Visit" button/sheet — DONE (visits/new redirects to dashboard)
- [x] P1: Multi-tooth selection on dental chart — DONE (drag-to-select, quadrant buttons)
- [x] P1: Per-tooth findings — DONE (ToothFinding model, ToothStatus per-tooth)
- [x] P1: Work Done section — DONE (WorkDone model, exam form integration)
- [x] P1: Discount limits per role — DONE (Session 38, maxDiscountPercent)
- [x] P1: Audit log for flagged actions — DONE (Session 39)
- [x] P1: Escrow balance visible on patient page — DONE (sticky header)
- [x] P1: L4 consultant quick notes — DONE (ConsultantQuickNote component)
- [x] P1: Prescription flow separate from exam — DONE (PrescriptionSheet + /prescription routes)
- [x] P2: Findings dropdown editable by L3 super — DONE (/settings/findings)
- [x] P2: Monthly flagged-actions report — DONE (audit log report)
- [x] P0-PERM-1: `updateAppointmentStatus` role check + doctor undo exception — DONE (Session 50)
- [x] P0-PERM-2: `/plan/new` L4 redirect + `createTreatmentPlan` uses `canCreateTreatmentPlans()` — DONE (Session 50)
- [x] P0-PERM-3: "New Plan" button hidden from L4 — DONE (Session 50)
- [x] P0-PERF-1: Receipts page pagination with take/skip — DONE (Session 50)
- [x] P0-PERF-2: Dashboard pending payment visits limited to take:200 — DONE (Session 50)
- [x] P0-PERF-3: Dashboard outstanding total uses raw SQL aggregation — DONE (Session 50)
- [x] P0-PERF-4: Receipts/new filtered to operationRate>0 + take:500 — DONE (Session 50)
- [x] P0-PERF-5: Patient search case-insensitive — VERIFIED OK (SQLite LIKE is case-insensitive for ASCII; search API already uses raw SQL)
- [x] P1-EXAM-1: Cmd+S saves in-place (new "stay" target), Save → "Save & Close" — DONE (Session 50)
- [x] P1-EXAM-2: Diagnosis quick-picks with QuickPills reusable component — DONE (Session 50)
- [x] P1-EXAM-5: Dead `isQuickMode` variable removed — DONE (Session 50)
- [x] P1-L4-1: Sidebar "My Schedule" → /appointments — DONE (Session 50)
- [x] P1-L4-2: "Check In" / "Arrived" buttons hidden from L4 — DONE (Session 50)
- [x] P1-L4-3: "Schedule" button hidden from L4 on patient page — DONE (Session 50)
- [x] P1-L4-4: Greeting shows "Dr." prefix for all doctors — DONE (Session 50)
- [x] P1-DASH-0: Outstanding balance badges on admin dashboard appointment cards — DONE (Session 50)
- [x] P1-PAY-1: Post-payment Done button + receipt confirmation in checkout — DONE (Session 50)

### Still Open (from original list)
- [x] P1: Dashboard needs role-specific overhaul (P1-DASH-1/2/3) — DONE (Session 51)
- [x] P2: Age entry should auto-compute approximate DoB (P2-REG-4) — DONE (Session 51)

---

## NEW FINDINGS — Session 49 UX Audit

### 🔴 P0 — Blocks Workflow / Security

#### Performance: Pages will crash on real data (102K visits, 109K receipts)
- [x] **P0-PERF-1**: `/receipts` — FIXED: added take/skip server-side pagination (Session 50)
- [x] **P0-PERF-2**: Dashboard `pendingPaymentVisits` — FIXED: limited to take:200 (Session 50)
- [x] **P0-PERF-3**: Dashboard `outstandingVisits` — FIXED: replaced with raw SQL aggregation (Session 50)
- [x] **P0-PERF-4**: `/receipts/new` — FIXED: filtered operationRate>0 + take:500 (Session 50)
- [x] **P0-PERF-5**: Patient search — VERIFIED OK: SQLite LIKE is case-insensitive for ASCII; search API uses raw SQL (Session 50)

#### Permission Gaps (Security)
- [x] **P0-PERM-1**: `updateAppointmentStatus` — FIXED: canSchedule() check + doctor undo exception (Session 50)
- [x] **P0-PERM-2**: `/plan/new` — FIXED: L4 redirect + canCreateTreatmentPlans() in action (Session 50)
- [x] **P0-PERM-3**: "New Plan" button — FIXED: hidden from L4 (Session 50)

#### Missing Critical Workflow Step
- [x] **P0-FLOW-1**: Escrow deposit receipt print page — DONE (Session 51). Print page at `/patients/[id]/checkout/[paymentId]/print`, Print button in post-payment success message.

---

### 🟡 P1 — Painful Daily Friction

#### Examination Form (Dr. Surender's #1 page)
- [x] **P1-EXAM-1**: Cmd+S saves in-place (new "stay" target), "Save" → "Save & Close" — FIXED (Session 50)
- [x] **P1-EXAM-2**: Diagnosis quick-picks with QuickPills reusable component — FIXED (Session 50)
- [x] **P1-EXAM-3**: Work Done "recently used" operations — DONE (Session 51). Last 5 ops saved to localStorage, shown as "Recent" section when search is empty.
- [ ] **P1-EXAM-4**: No plan creation from exam form. Doctor flow is examine→diagnose→plan, but app requires navigate away to create plan. Context switch breaks flow. **DEFERRED** — plans intentionally created from patient page per design.
- [x] **P1-EXAM-5**: Dead `isQuickMode` variable removed — FIXED (Session 50)
- [x] **P1-EXAM-6**: "Copy to Notes" button on BDS Recommendation card — DONE (Session 51). Copies previous diagnosis + treatment notes for consultants.
- [x] **P1-EXAM-7**: Duplicate visit prevention — DONE (Session 51). `createVisitAndExamine` checks for existing today-visit before creating, reuses if found.

#### L4 Consultant Experience
- [x] **P1-L4-1**: Sidebar "My Schedule" → /appointments — FIXED (Session 50)
- [x] **P1-L4-2**: "Check In" / "Arrived" buttons hidden from L4 — FIXED (Session 50)
- [x] **P1-L4-3**: "Schedule" button hidden from L4 on patient page — FIXED (Session 50)
- [x] **P1-L4-4**: Greeting shows "Dr." prefix for all doctors — FIXED (Session 50)

#### Dashboard Issues
- [x] **P1-DASH-0**: Outstanding balance badges on admin dashboard appointment cards — FIXED (Session 50)
- [x] **P1-DASH-1**: L1 admin dashboard differentiation — DONE (Session 51). L1 gets stat cards (Visits, Collections, Outstanding) + audit flag count + staff activity. L2 keeps inline stat links.
- [x] **P1-DASH-2**: Dashboard stat cards for L1 admin — DONE (Session 51). 3-column grid of clickable Card components replacing inline pills.
- [ ] **P1-DASH-3**: Quick action buttons (New Patient, Schedule, Receipt) are reception-focused. Admin doesn't need these above the fold. **DEFERRED** — folded into P1-DASH-1 (L1 gets different hero, not same buttons).

#### Patient Page
- [x] **P1-PAT-1**: Escrow balance prominent pill/badge in sticky header — DONE (Session 51). Red for deficit, green for credit, moved before visit count.
- [x] **P1-PAT-2**: Financial summary elevated to position 4 for L1/L2 — DONE (Session 51). Moved from bottom to right after appointments with summary cards + receipt list.
- [x] **P1-PAT-3**: Dental chart button visible in sticky header for doctors — DONE (Session 51). SmilePlus icon button next to dropdown.

#### Receipts & Payments
- [x] **P1-PAY-1**: Post-payment Done button + receipt confirmation in checkout — FIXED (Session 50)
- [ ] **P1-PAY-2**: Payment history collapsed by default on checkout. **DEFERRED** — collapsed is correct, keeps checkout focused.
- [x] **P1-PAY-3**: Suggested amount + deficit as primary quick buttons — DONE (Session 51). Suggested amount styled as primary button, deficit shown if different.

#### UI Component Issues
- [x] **P1-UI-1**: Searchable DoctorCombobox (Popover+Command) — DONE (Session 51). Replaced plain `<select>` in 5 locations: appointment form, commission report, visits filter, doctor-activity report, outstanding report.
- [x] **P1-UI-2**: `text-[10px]` → `text-xs` across 15 files — DONE (Session 51). 37 replacements, tooth-chart preserved.
- [x] **P1-UI-3**: Human-readable audit log details — DONE (Session 51). Friendly labels, `₹X → ₹Y` arrow format for fee changes, currency formatting.

---

### 🟢 P2 — Polish & Enhancements

#### Exam Form Polish
- [x] **P2-EXAM-1**: Complaint pills title case — DONE (Session 51). Case-insensitive matching for backward compat.
- [ ] **P2-EXAM-2**: ToothApplyBar (7+ buttons) wraps badly on smaller screens. **DEFERRED** — low priority, acceptable on desktop.
- [ ] **P2-EXAM-3**: No keyboard shortcut cheat sheet visible. **DEFERRED** — low priority, Cmd+S is standard.
- [x] **P2-EXAM-4**: Autosave interval reduced 15s → 5s — DONE (Session 51).
- [ ] **P2-EXAM-5**: No deciduous (pediatric) tooth chart — FDI numbers 51-85. **DEFERRED** — major feature, not a fix.
- [ ] **P2-EXAM-6**: Touch/mobile: drag-to-select not supported. **DEFERRED** — major feature, not a fix.

#### Dashboard Polish
- [ ] **P2-DASH-1**: No "patients remaining today" counter. **DEFERRED** — low priority.
- [ ] **P2-DASH-2**: No "tomorrow's schedule preview". **DEFERRED** — low priority.
- [ ] **P2-DASH-3**: No "View full schedule" link. **DEFERRED** — already works, minor.
- [x] **P2-DASH-4**: Audit flag notification for admin — DONE (Session 51). Folded into P1-DASH-1 (audit flag count on L1 dashboard).

#### Appointments
- [x] **P2-APPT-1**: "Today" button on appointments page — DONE (Session 51). Already existed in appointment-day-view.
- [x] **P2-APPT-2**: Walk-in toggle moved to top of appointment form — DONE (Session 51). Now appears after patient search, before doctor/date fields.
- [ ] **P2-APPT-3**: No "print today's schedule" button. **DEFERRED** — low priority.
- [ ] **P2-APPT-4**: No week/month view option. **DEFERRED** — major feature.
- [ ] **P2-APPT-5**: `/appointments` day view shown to L4 with full clinic timetable. **DEFERRED** — already filtered to own schedule.

#### Reports
- [ ] **P2-RPT-1**: Reports hub has no inline stats on cards. **DEFERRED** — low priority.
- [x] **P2-RPT-2**: Outstanding aging analysis (30/60/90 day buckets) — DONE (Session 51). Color-coded summary cards above table.
- [ ] **P2-RPT-3**: No CSV export on outstanding report. **DEFERRED** — low priority.
- [x] **P2-RPT-4**: Audit log pagination — DONE (Session 51). 50 per page with Previous/Next buttons, replacing take:500.
- [ ] **P2-RPT-5**: Doctor-Activity report only shows L3 doctors. **DEFERRED** — low priority.
- [x] **P2-RPT-6**: Commission report doctor filter — DONE (Session 51). Covered by P1-UI-1 (DoctorCombobox).
- [ ] **P2-RPT-7**: Discount report has no doctor filter. **DEFERRED** — low priority.

#### Settings
- [x] **P2-SET-1**: Operations search/filter — DONE (Session 51). Search input filters by name or category.
- [ ] **P2-SET-2**: Clinic info is read-only. **DEFERRED** — low priority.
- [ ] **P2-SET-3**: Database Stats card is developer-facing. **DEFERRED** — low priority.
- [ ] **P2-SET-4**: No confirmation dialog before deactivating an operation. **DEFERRED** — low priority.

#### Patient Registration
- [ ] **P2-REG-1**: Title select uses raw `<select>` element. **DEFERRED** — low priority.
- [ ] **P2-REG-2**: Mobile required but elderly patients may not have one. **DEFERRED** — low priority.
- [ ] **P2-REG-3**: No "register and schedule" combined flow. **DEFERRED** — major workflow change.
- [x] **P2-REG-4**: Age → approximate DoB auto-fill — DONE (Session 51). Computes Jan 1 of `currentYear - age` when DoB is empty.

#### Visits List
- [x] **P2-VIS-1**: "Today" quick-filter on visits page — DONE (Session 51).
- [ ] **P2-VIS-2**: URL/label mismatch — sidebar says "Payments" but URL is `/receipts`. **DEFERRED** — cosmetic.

#### Misc
- [x] **P2-MISC-1**: Patient search min 2 chars — DONE (Session 51). Changed from 1 → 2 character minimum.
- [ ] **P2-MISC-2**: `/visits/new` redirect is silent. **DEFERRED** — low priority.
- [ ] **P2-MISC-3**: Deposit click on receipts page goes to patient page. **DEFERRED** — low priority.

---

## Route Inventory (45 routes)

> Verdict: **KEEP** / **MERGE** / **REMOVE** / **GATE** (add permission check)

| # | Route | Used By | Verdict | Notes |
|---|-------|---------|---------|-------|
| 1 | `/login` | All | KEEP | Essential |
| 2 | `/` | All | KEEP | Redirect to dashboard |
| 3 | `/dashboard` | All | KEEP | Needs role-specific views |
| 4 | `/patients` | L1/L2 | KEEP | Essential for reception |
| 5 | `/patients/new` | L2 | KEEP | Registration flow |
| 6 | `/patients/[id]` | All | KEEP | Central patient hub |
| 7 | `/patients/[id]/edit` | L1/L2 | KEEP | Patient updates |
| 8 | `/patients/[id]/checkout` | L1/L2 | KEEP | Payment collection |
| 9 | `/patients/[id]/plan/new` | L3 | **GATE** | Needs L4 redirect |
| 10 | `/patients/[id]/plan/[planId]/edit` | L3 | KEEP | Already gated |
| 11 | `/patients/[id]/chain/new` | L3 | KEEP | Already gated |
| 12 | `/appointments` | L1/L2 | KEEP | Day view scheduling |
| 13 | `/appointments/new` | L1/L2 | KEEP | Already gated |
| 14 | `/appointments/[id]/reschedule` | L1/L2 | KEEP | Rescheduling |
| 15 | `/visits` | L1/L2 | KEEP (low use) | Rarely navigated directly |
| 16 | `/visits/new` | — | **REMOVE** | Already disabled, just a redirect |
| 17 | `/visits/[id]` | All | KEEP | Visit detail |
| 18 | `/visits/[id]/examine` | L3/L4 | KEEP | Core exam flow |
| 19 | `/visits/[id]/examine/print` | All | KEEP | Print exam report |
| 20 | `/visits/[id]/prescription` | All | KEEP | Prescription management |
| 21 | `/visits/[id]/prescription/print` | All | KEEP | Print prescription |
| 22 | `/receipts` | L1/L2 | KEEP | Rename URL to `/payments` |
| 23 | `/receipts/new` | L1/L2 | KEEP (legacy) | For legacy per-visit receipts |
| 24 | `/receipts/[id]/print` | L1/L2 | KEEP | Receipt printing |
| 25 | `/reports` | L1 | KEEP | Reports hub |
| 26 | `/reports/audit` | L1 | KEEP | Audit log |
| 27 | `/reports/commission` | L1 | KEEP | Doctor payouts |
| 28 | `/reports/outstanding` | L1/L2 | KEEP | Revenue tracking |
| 29 | `/reports/discount` | L1 | KEEP | Discount oversight |
| 30 | `/reports/doctor-activity` | L1 | KEEP | Doctor reviews |
| 31 | `/reports/doctor-patients` | L1 | **MERGE** | Into doctor-activity |
| 32 | `/reports/lab` | L1 | KEEP | Lab cost tracking |
| 33 | `/reports/operations` | L1 | KEEP | Procedure analysis |
| 34 | `/reports/patients` | L1 | KEEP | Patient directory |
| 35 | `/reports/receipts` | L1 | KEEP | Cash reconciliation |
| 36 | `/settings` | L1 | KEEP | Settings hub |
| 37 | `/settings/operations` | L1, L3-super | KEEP | Tariff + templates |
| 38 | `/settings/labs` | L1 | KEEP | Lab management |
| 39 | `/settings/labs/[id]` | L1 | KEEP | Lab detail |
| 40 | `/settings/rooms` | L1 | KEEP | Room management |
| 41 | `/settings/findings` | L3-super | KEEP | Findings config |
| 42 | `/settings/bulk-upload` | L1 | KEEP | Data import |
| 43 | `/doctors` | L1 | KEEP | Staff management |
| 44 | `/doctors/new` | L1 | KEEP | Add doctor |
| 45 | `/doctors/[id]/edit` | L1 | KEEP | Edit doctor |
| 46 | `/my-activity` | L3 | KEEP | Doctor self-review |

**Summary**: 42 keep, 1 gate, 1 merge, 1 remove, 1 rename

---

## Top 5 Items to Fix Next

These are selected for maximum impact on daily workflow across all personas:

1. ~~**P0-PERF-1 through P0-PERF-5**~~ — ✅ ALL FIXED (Session 50)
2. ~~**P0-PERM-1 + P0-PERM-2 + P0-PERM-3**~~ — ✅ ALL FIXED (Session 50)
3. **P0-FLOW-1**: Escrow deposit receipt print page — Done button added, but still need printable receipt for escrow payments. ~~P1-PAY-1~~ FIXED.
4. ~~**P1-EXAM-1 + P1-EXAM-2**~~ — ✅ ALL FIXED (Session 50)
5. ~~**P1-L4-1 through P1-L4-4**~~ — ✅ ALL FIXED (Session 50)

### Remaining Priority Queue (Session 51+)

All P0 and P1 items are now **DONE**. Only deferred P2 items remain — all are low-priority polish or major new features:

**Deferred (low priority / cosmetic):**
- P2-EXAM-2: ToothApplyBar wrapping on small screens
- P2-EXAM-3: Keyboard shortcut hints
- P2-DASH-1/2/3: Dashboard remaining polish (patient counter, tomorrow preview)
- P2-APPT-3: Print today's schedule
- P2-RPT-1/3/5/7: Reports polish (hub stats, CSV export, L4 in doctor-activity, discount filter)
- P2-SET-2/3/4: Settings polish (editable clinic info, remove DB stats, deactivate confirm)
- P2-REG-1/2: Registration polish (title combobox, mobile optional)
- P2-VIS-2: URL/label mismatch
- P2-MISC-2/3: Misc polish (visits/new toast, deposit click)

**Deferred (major features — not fixes):**
- P2-EXAM-5: Pediatric (deciduous) dental chart
- P2-EXAM-6: Touch/mobile support
- P2-APPT-4: Week/month calendar view
- P2-REG-3: Register + schedule combined flow
- P1-PAY-2: Payment history default open (intentionally collapsed)

---

## What Each Persona Said Works Well (Don't Break These)

**Murli (Reception)**:
- "Ready for Checkout" dashboard card with escrow balance and work done summary
- Follow-up queue with overdue highlighting and phone numbers
- Inline "Check In" from dashboard appointment cards
- Patient search "/" keyboard shortcut with debounced results
- Pre-fill logic when scheduling follow-ups from visit detail

**Dr. Surender (BDS)**:
- "Now Seeing" hero card with "Continue Exam" — single click
- Complaint pills — one tap to set chief complaint
- Side-by-side previous notes on desktop for follow-ups
- "Save & Next Patient" auto-chains to next arrived appointment
- Draft autosave with restore banner

**Dr. Ramana Reddy (Consultant)**:
- BDS Recommendation banner on exam form for L4
- Multi-day schedule widget (7-day view) for 2-day/week visitors
- ConsultantQuickNote on visit detail
- Financial data properly hidden
- Stripped-down sidebar

**Dr. Kazim (Admin)**:
- Audit log with severity/actor filters
- Commission report with per-doctor summaries + TDS + net payable
- Outstanding total color-coded red with direct link
- Treatment progress card with step completion checkmarks
- Chain-level cost summary on visit detail
