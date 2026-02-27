# Session Handoff
> Last updated: 2026-02-27 (Session 14 — Core Workflow Overhaul)

## Completed This Session

### Core Workflow Overhaul — "Replace the Paper" (5 parts)
1. **Side-by-side exam notes** — follow-up exams show all previous chain reports in sticky left panel (desktop) / collapsible card (mobile)
2. **Treatment templates** — `TreatmentStep` model on operations; CRUD editor in settings; seeded for RCT (5), Crown (3), Ortho (3), Implant (5), Bridge (3)
3. **Post-exam scheduling** — treatment progress card on visit detail with step checklist + "Schedule Next Step" button (pre-fills appointment)
4. **Appointment card enrichment** — operation name, step label, medical flags (disease pills), visit count, previous diagnosis
5. **Appointment detail panel** — Sheet slide-over on card click replaces navigation; patient info, context, actions

### Patient Registration Fixes
- Mobile number mandatory + 10-digit validation (starts with 6-9)
- Live duplicate check: debounced API search, amber warning with link to existing patient
- Age auto-populates from DOB
- Medical history checklist: clean 2-col grid with aligned checkboxes
- Zod server-side validation normalizes mobile (strips spaces/dashes)

### Date Format Standardization
- All display dates changed to `dd-MM-yyyy` (Indian format) across 16 files
- Native date picker stays in OS locale (can't change browser `<input type="date">`)

### CLAUDE.md Created
- Core workflow documentation at `clinic-app/CLAUDE.md`
- Loaded by Claude Code in every session automatically

## ⚠️ CRITICAL: Before Proceeding with Roadmap

**DO NOT start new roadmap items until the user has fully tested the Daily Patient Flow:**

```
Reception creates patient + appointment
  → BDS doctor examines (sees blank form, fills it)
  → BDS schedules follow-up with consultant
  → Consultant opens follow-up exam (should see BDS notes in left panel)
  → Consultant examines + saves
  → Visit detail shows treatment progress (step 2/5 done)
  → "Schedule Step 3" button works with pre-filled date
  → Repeat through all steps
  → Reception collects payment
```

**Ask the user at session start:**
> "Have you finished testing the daily patient flow? Any bugs or workflow issues to fix before we move on?"

The user wants to define ALL core workflows before building more features. The next workflows to define (user has not outlined these yet):
- Lab work flow (send to lab → receive → fit)
- Emergency walk-in flow
- Insurance/billing flow
- Monthly reporting flow

## Current State
- **Branch:** main
- **Last commit:** `41d888e` — Mobile validation + duplicate detection
- **Build:** ✅ Passes cleanly (34 routes)
- **DB:** Re-seeded with treatment steps (19 steps across 5 operations)
- **Blockers:** None — waiting on user testing

## Context to Remember
- **Workflow-first development** — user wants to define real clinic workflows before building features. Don't jump to reports/hardening/imports until workflows are mapped and tested.
- **Treatment chain model:** `Visit.parentVisitId` → flat chain to root. Follow-ups of follow-ups point to ORIGINAL parent.
- **TreatmentStep** on Operation: stepNumber, name, defaultDayGap. Visit.stepLabel matches step name.
- **Side-by-side layout:** `lg:grid-cols-[380px_1fr]` with sticky scrollable left panel.
- **Appointment panel:** Sheet component, opens on card click instead of navigating to patient page.
- **Mobile validation:** strips `[\s\-()\/]`, requires `^[6-9]\d{9}$`. Duplicate check via `/api/patients/search`.
- **Date format:** `dd-MM-yyyy` for display, `dd/MM/yyyy` for print pages. Native `<input type="date">` uses OS locale.
- **Legacy phone formats:** 7-digit, 8-digit landlines, 10-digit mobiles with spaces/dashes/parens, multiple numbers per field.
- Light-only theme — no `dark:` prefixes
- `bun` package manager (`$HOME/.bun/bin` in PATH)
- Seed logins: KAZIM/admin (L1), MURALIDHAR/admin (L2), SURENDER/doctor (L3), RAMANA REDDY/doctor (L3)

## Known Technical Debt
- Unbounded `outstandingVisits` query in admin dashboard (H4-2)
- Plain-text passwords, unsigned session cookie (H5)
- Sequential ID generation race conditions (H5-5)
- Receipt form "Pay Full" uses DOM getElementById instead of React ref
- Password fields exposed in RSC serialization (H5-3)
- Native date picker shows OS locale format (not dd-MM-yyyy)

## Start Command
```bash
export PATH="$HOME/.bun/bin:$PATH" && cd /Users/sameer/Desktop/Code/clinic/clinic-app && bun dev
```
