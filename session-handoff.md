# Session Handoff
> Last updated: 2026-02-27 (Session 16 — Form Polish + Workflow Testing Start)

## Completed This Session

### Form UI Polish (app-wide consistency)
- Established design system tokens across ALL forms: `space-y-6` between cards, `space-y-1.5` field containers, `gap-x-6 gap-y-4` grids
- Page max-width: all form pages → `max-w-2xl` (focused column, premium pattern)
- Submit buttons: right-aligned with Cancel link (Cancel navigates contextually — back to patient if coming from patient, else to parent list)
- Patient form: Title/Gender/Blood Group switched from shadcn `Select` to native `<select>` to fix auto-fill bug (shadcn Select picks first option when no value selected)
- Removed "Other" gender option (just Male/Female)
- Medical history checkboxes: 3-col max, tighter spacing (`gap-x-4 gap-y-0`, `py-1`, `select-none`)
- Duplicate warning: upgraded to proper alert banner with title + description
- Applied same patterns to: visit-form, appointment-form, doctor-form + all page wrappers

### Bug Fixes
- **Readonly DB error**: Turbopack internal cache corruption (`.next/` directory) was the root cause — NOT the SQLite DB. Fixed by `rm -rf .next` + restart. Also re-seeded fresh DB for good measure.
- **Edit Patient hanging**: Same Turbopack cache corruption. Fixed with cache clear.

### Patient Profile — Appointments Section
- Added past appointments (COMPLETED, CANCELLED, NO_SHOW) to patient detail page
- Combined "Upcoming" + "Past" into unified "Appointments" section with Schedule button
- Past appointments render with `opacity-60` to distinguish from active ones

## Current State
- **Branch:** main
- **Last commit:** `3d489e9` — Session 15
- **Build:** ✅ Passes cleanly (34 routes)
- **Uncommitted changes:** YES — 10 modified files (all form/page polish + patient detail appointments)
- **DB:** Freshly re-seeded (50 patients + 1 TEST PATIENT created during testing)
- **Dev server:** Was running on port 3000. May need restart after session break. If Turbopack panics, `rm -rf .next` first.
- **Blockers:** None

## ⚠️ CRITICAL: Workflow Testing in Progress

User is testing the Daily Patient Flow. **Step 1 (Register Patient) passed.** Step 2 (Schedule Appointment) is next.

### Workflow Issues Discovered During Testing (to address next session)

1. **Visit should require an appointment** — Currently you can create a visit without an appointment. The flow should be: Appointment → Arrived → Start Visit. Direct "New Visit" without an appointment should not be the default path. On patient detail, if no active appointment exists, the primary action should be "Schedule Appointment" not "New Visit".

2. **Walk-in / immediate appointment** — Need a quick "Walk-in" flow that creates an appointment with current date/time and immediately moves to ARRIVED status, bypassing the scheduling step. This is for patients who show up without an appointment.

3. **L2 (Reception) should NOT be able to examine** — Reception can create patients, appointments, visits, collect payments. But the "Examine" button (clinical notes) should only be available to L3 (doctors). Reception should be able to VIEW examination reports but not create/edit them.

4. **"New Visit" vs "Schedule Appointment" is confusing** — The user found these two concepts unclear. Consider:
   - Remove standalone "New Visit" from dashboard quick actions for reception
   - Primary path: Schedule Appointment → Arrived → Start Visit (creates visit automatically)
   - "Record First Visit" on empty patient page should become "Schedule Appointment"
   - Keep "New Visit" accessible but secondary (for backdating, walk-ins, etc.)

5. **Patient detail "New Visit" button** — Should show "Schedule Appointment" when no active appointment. When there IS an active appointment (ARRIVED/IN_PROGRESS), show "Start Visit" or "Examine" as appropriate.

## Design Decisions Made
- Native `<select>` over shadcn `Select` for fields that need true empty/null state (Title, Gender, Blood Group). Shadcn Select doesn't support `value=""` properly.
- `max-w-2xl` for ALL form pages (patient, visit, appointment, doctor). Premium apps use narrow focused columns.
- Cancel button always navigates contextually: if we know the patient, go back to their profile.

## Context to Remember
- **Turbopack cache corruption** is a recurring issue. If pages hang or crash, `rm -rf .next` fixes it. This is a Next.js 16 + Turbopack bug, not our code.
- **Form selects**: Use native `<select>` (not shadcn `Select`) when an empty/null default is needed. Shadcn Select auto-fills the first option.
- **DB re-seed**: `rm prisma/dev.db && bunx prisma db push && bun prisma/seed.ts`. TEST PATIENT (#10051) was created manually during testing.
- **Patient #52** may also exist from testing (created after re-seed).
- **Playwright MCP** is installed and working for visual testing. Login as MURALIDHAR/admin first.
- User's UI bar is HIGH — "Think Apple, Google, Uber, Notion, Figma."

## Files Modified (uncommitted)
```
clinic-app/src/components/patient-form.tsx       # Major: native selects, spacing, medical history, submit
clinic-app/src/components/visit-form.tsx          # Spacing, grid gaps, contextual cancel
clinic-app/src/components/appointment-form.tsx    # Spacing, grid gaps, contextual cancel
clinic-app/src/components/doctor-form.tsx         # Spacing, grid gaps, cancel link
clinic-app/src/app/(main)/patients/new/page.tsx   # max-w-2xl, space-y-6
clinic-app/src/app/(main)/patients/[id]/edit/page.tsx  # max-w-2xl, space-y-6
clinic-app/src/app/(main)/visits/new/page.tsx     # max-w-2xl, space-y-6
clinic-app/src/app/(main)/appointments/new/page.tsx # max-w-2xl, space-y-6
clinic-app/src/app/(main)/patients/[id]/page.tsx  # Added pastAppointments query
clinic-app/src/app/(main)/patients/[id]/patient-page-client.tsx  # Appointments section (past+future)
```

## Next Session Should
1. **Commit current work** — all form polish + patient appointments section
2. **Implement appointment-first visit flow** — visit creation requires an appointment (or walk-in). Remove/demote standalone "New Visit" for reception. Add walk-in shortcut.
3. **Gate clinical examination to L3 only** — Reception (L2) can view but not create/edit exam reports
4. **Rework patient detail action buttons** — "Schedule Appointment" as primary when no active appt; "Start Visit"/"Examine" when there is one
5. **Continue workflow testing from Step 2** — Schedule Appointment → Arrived → Start Visit → Examine
6. **Platform-wide UI consistency** — the form polish is done, but list pages, detail pages, settings pages still need spacing audit (see previous session's audit)

## Start Command
```bash
export PATH="$HOME/.bun/bin:$PATH" && cd /Users/sameer/Desktop/Code/clinic/clinic-app && rm -rf .next && bun dev
```
