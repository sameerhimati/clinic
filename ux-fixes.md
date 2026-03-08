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

> Priority: P0 = blocks workflow, P1 = painful, P2 = polish.
> Add items as discovered during testing. Check off when fixed.

## Reception Dashboard
- [ ] P1: Today's schedule has no clear ordering — should be by appointment time, then by status (arrived first). Needs visual grouping. 
- [ ] P0: Complete overhaul of Dashboard, think about what we need here

## Patient Registration
- [ ] P2: Entering Age should auto-compute approximate DoB (Jan 1 of birth year). Defaulting to today's date is wrong.

## Patient Page
- [ ] P0: Remove "New Visit" button and sidebar sheet for visit creation. Visits should only be created through appointments.
- [ ] P1: Page is confusing and rigid. Needs redesign with dental chart as primary interface (see Part 1).
- [ ] P1: Key information not visible at a glance — escrow balance, medical alerts, active treatment plan progress.

## Dental Chart
- [ ] P1: No multi-tooth selection (needed for bridges, quadrant work).
- [ ] P1: No per-tooth findings — just select/deselect.
- [ ] P1: No "Work Done" section — doctors want to record what was done per tooth per visit.
- [ ] P2: Findings dropdown should be editable by L3 super-user.

## Examination Form
- [ ] P1: Remove medication tab, replace with optional prescription flow.
- [ ] P1: Consultants (L4) need to add notes to existing cases without full exam form.
- [ ] P2: "Work Done" should be the primary action, notes should be optional/secondary.

## Permissions
- [ ] P0: Need L4 permission level for consultants (currently only L1-L3).
- [ ] P0: Need super-user flag for L2 and L3 elevated privileges.
- [ ] P1: Discount limits not enforced per role (currently any admin/reception can give any discount).
- [ ] P1: No audit log for flagged actions (large discounts, rate changes, plan modifications).

## Payments
- [ ] P0: Escrow model not implemented — payments currently allocate directly to visits via FIFO.
- [ ] P1: No advance payment collection at scheduling time.
- [ ] P1: No escrow balance visible on patient page.
- [ ] P2: Monthly flagged-actions report for L1 not built.
