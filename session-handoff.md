# Session Handoff
> Last updated: 2026-03-07 (Session 37 — Workflow Redesign Planning)

## Completed This Session
- [x] Audited last 10 session handoffs for missed items (5 found, documented)
- [x] Created comprehensive `ux-fixes.md` — ground truth document for clinic workflow redesign
- [x] Captured full workflow redesign spec from user + Murli (reception) + Dr. Baisakhi (BDS)
- [x] Updated ROADMAP.md — all other items paused, workflow redesign is the active priority
- [x] Entered plan mode — need to create phased implementation plan

## Current State
- **Branch:** main
- **Last commit:** `6c7f83b` Add Payments, Collections & Bifurcation UX to roadmap
- **Build:** Passing (44 routes)
- **Uncommitted changes:** `ux-fixes.md` (new), `ROADMAP.md` (updated), `session-handoff.md` (updated), `prisma/import-legacy.bun.ts` (unrelated)
- **Blockers:** None — spec is complete enough to start planning

## Ground Truth Document: `ux-fixes.md`
**Read this file first every session.** It contains:
- Part 1: Full workflow redesign spec (permissions, escrow, dental chart, prescription flow, follow-ups)
- Part 2: Specific UX bugs and issues

### Summary of Major Changes
1. **L4 permission level** — Consultants (schedule view + examine only, stripped UI)
2. **Super-user tier** — `isSuperUser` flag for L2 (Murli: lab rates, large discounts) and L3 (Clinical Head: findings dropdown, step templates)
3. **Escrow payment model** — Replace FIFO allocation. Money held unallocated, fulfilled only on "Work Done"
4. **Dental chart as odontogram** — Per-tooth findings, work done history, multi-select, chart-centric patient page
5. **Work Done flow** — Strict completion trigger per tooth/visit. Updates chart + advances plan + triggers escrow
6. **Prescription flow** — Replace medication tab. Separate form, auto-notify front desk to print
7. **Role enforcement** — Remove visit creation for L3/L4. Front desk owns all scheduling
8. **Patient follow-up tracking** — Pending queue, configurable reminder schedules
9. **Audit log** — Flagged actions with mandatory reasons, monthly report for L1
10. **Patient page redesign** — Dental chart as hero, not visit timeline

### Key Design Decisions
- **No approval queues** — Actions happen immediately. Accountability via audit log + monthly review.
- **Escrow not per-treatment** — Patient-level balance. Allocated only on procedure completion.
- **L3/L4 cannot schedule anything** — "Schedule" in L4 context means VIEW their schedule, not create appointments.
- **Findings dropdown editable by L3 super-user** — Like how L1 manages tariff cards.

## Next Session Should
1. **Read `ux-fixes.md`** — the ground truth document
2. **Plan mode** — break WR-1 through WR-8 into implementation phases with dependency order
3. **Start with WR-1 (Permission Model)** — everything else depends on L4 + isSuperUser existing
4. **Then WR-6 (Role Enforcement)** — remove visit creation UI, enforce scheduling restrictions
5. **Then WR-2 (Audit Log)** — foundation for accountability before building escrow/discount changes

## Context to Remember
- "Murli" = MURALIDHAR (L2 reception, primary tester, will be L2 super-user)
- "Dr. Baisakhi" = BDS doctor who provided clinical workflow feedback
- User explicitly clarified: L3/L4 CANNOT schedule appointments. "View schedule" only.
- Discount tiers: L3/L4 up to 20%, L2 standard up to 20%, L2 super up to 50%+, L1 unlimited. 100% only on L1 instruction.
- The existing Visit model may need significant rework — visits should auto-create from appointments, not be manually created
- Escrow model replaces the current FIFO checkout allocation entirely
- Dental chart redesign is the biggest UI change — becomes the primary patient page interface

## Start Command
```bash
export PATH="$HOME/.bun/bin:$PATH"
cd /Users/sameer/Desktop/Code/clinic/clinic-app
bun dev
```
