# Session Handoff
> Last updated: 2026-02-28 (Sessions 20-21 — Doctor dashboard queue, commission model, step tracker)

## What Happened This Session

### Committed: `c23aa82` — Per-operation doctor fees, treatment chain commission report, step tracker costs

**1. Doctor Dashboard Queue (Session 20)**
- `DoctorScheduleWidget` redesigned: 3-section layout
- "Now Seeing" (blue) — IN_PROGRESS patient with "Continue Exam"
- "Waiting Room" (amber) — all ARRIVED patients, first gets "Examine" if no IN_PROGRESS
- Schedule list below with remaining appointments

**2. Commission Model Redesign (Session 21)**
- `Operation.doctorFee` (Float?) — fixed fee per procedure (RCT=₹1,800, Extraction=₹500, etc.)
- `Operation.labCostEstimate` (Float?) — typical lab cost for collection warnings
- Commission report: dual-view with "By Receipt" (legacy) + "By Treatment" (chain view) toggle
- Treatment chain view groups by root visit, shows doctorFee, collected, shortfall, completion status
- Checkout page: amber warning banner when collected < doctorFee + labCost for a treatment chain
- Operations settings: doctorFee and labCostEstimate fields in CRUD forms

**3. Step Tracker Enhancement (Session 21)**
- Visit detail header: "Step 3 of 5" badge next to visit type
- Treatment Progress card: "N of M steps" counter, ₹ cost per step, doctor+date per step
- Chain cost summary: Billed / Paid / Due / Doctor fee (hidden for L3 doctors)

**4. Seed Data Cleanup (Session 21)**
- Patient 3 (SRINIVAS NARRA): coherent story — Extraction (5 days ago) + RCT chain (3 visits, steps 1-3)
- 16 total appointments (up from 10): SURENDER has 1 IN_PROGRESS + 2 ARRIVED, RAMANA has 3 ARRIVED
- More clinical reports added across visits

## Testing Status — Where We Are

The core 9-step daily workflow has been **implemented** since Session 18 but has **never been manually tested end-to-end** by the user. Sessions 19-21 added features (dashboard queue, commission model, step tracker) without completing the testing checklist.

### Testing Checklist (from workflows.md)
- [ ] Reception: create patient (mobile validation, dupe check)
- [ ] Reception: book appointment for patient
- [ ] BDS doctor: mark arrived → examine (blank form, first visit)
- [ ] BDS doctor: save exam → see treatment progress card
- [ ] BDS doctor: schedule follow-up with consultant via "Schedule Next Step"
- [ ] Consultant: open follow-up → examine → see BDS notes in left panel
- [ ] Consultant: save exam → treatment progress shows 2/N steps done
- [ ] Consultant: schedule step 3 → appointment pre-filled
- [ ] Reception: collect payment at checkout
- [ ] Test appointment card enrichment (operation, disease pills)
- [ ] Test appointment detail panel (Sheet on card click)
- [ ] Test mobile: side-by-side collapses to stacked
- [ ] Test roles: L1/L2/L3 see appropriate views

**None of these have been checked off yet.** We keep building features before testing, which means bugs could be accumulating. The next session should NOT add features until this checklist is walked through.

## Pricing & Payment Model — Current State

### How it works today:
1. **Treatment pricing**: `Operation` has a tariff rate (`defaultMinFee`). When a visit is created, `Visit.operationRate` is set to the tariff (or manually adjusted). `Visit.discount` can reduce it (tiered: doctors 10%, reception 15%, admin unlimited).
2. **Billed amount**: `operationRate - discount` per visit. Follow-up visits typically have rate=₹0.
3. **Payment collection**: At checkout (`/patients/[id]/checkout`), reception sees all visits with outstanding balance. Pays against specific visits with FIFO allocation. Creates receipts with `receiptNo`, `amount`, `paymentMode` (Cash/Card/UPI/Cheque).
4. **Doctor compensation**: NEW model — `Operation.doctorFee` is a fixed fee per procedure (e.g., RCT = ₹1,800). Tracked per treatment chain (root visit + all follow-ups). Commission report shows chain completion status.
5. **Minimum collection**: Checkout warns if total collected < doctorFee + labCostEstimate. Warning only, not a hard block.

### What's NOT built yet:
- **Settlement workflow** — no UI for marking doctor fees as "settled" (paid out to doctor). Currently the commission report shows what's owed but there's no settlement tracking.
- **Monthly settlement** — the plan was 1st-of-month settlement. No `DoctorSettlement` model or settlement page exists.
- **Chain completion finalization** — auto-complete works (all steps have exams = completed), but no manual "Mark Treatment Complete" button exists yet.
- **Lab cost gating at visit creation** — plan was to warn when creating a lab-work visit if insufficient payment collected. Not implemented.
- **GST/invoice generation** — on Phase 7 nice-to-haves list.
- **UPI/QR code integration** — on Phase 7 nice-to-haves list.

### Decisions still needed from user:
1. **Settlement tracking**: Do we need a `DoctorSettlement` model (date, doctorId, amount, treatment chains covered)? Or is the report enough for now?
2. **Who triggers settlement?** Admin clicks "Settle" monthly? Or just a report that admin prints and hands to accountant?
3. **Lab cost flow**: When does lab work get ordered? Is there a lab order concept, or is labCostEstimate just informational?
4. **Multi-doctor chains**: If BDS starts RCT and consultant finishes, who gets the doctorFee? Split? Goes to primary?

## Current State
- **Branch**: main (pushed to remote)
- **Last commit**: `c23aa82`
- **Build**: Passes cleanly
- **Blockers**: None
- **Dev server**: `bun dev` on port 3000

## Next Session Should
1. **Walk through the 9-step testing checklist** — create a real patient, full appointment→exam→follow-up→payment flow
2. **Fix any bugs found** during testing
3. **Answer the pricing/settlement questions** above
4. **Only then** move to new features (settlement UI, reports, etc.)

## Start Command
```bash
export PATH="$HOME/.bun/bin:$PATH" && cd /Users/sameer/Desktop/Code/clinic/clinic-app && bun dev
```
