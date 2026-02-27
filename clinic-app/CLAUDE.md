# Clinic App — Claude Context

## Session Start Rule

**Before starting any new feature or roadmap item, ask the user:**
> "Have you finished testing the daily patient flow? Any bugs or workflow issues to fix before we move on?"

Do NOT proceed with new roadmap items until the user confirms workflows are tested. The user wants to define ALL core clinical workflows before building more features.

## Stack
- Next.js 16 (App Router), TypeScript, Tailwind CSS 4 + shadcn/ui
- Prisma 6 with SQLite, package manager: bun

## Core Clinical Workflows

These are the real-world workflows the app must support. Every feature should be evaluated against these flows.

### Daily Patient Flow

1. **Reception** creates patient + appointment
2. **BDS doctor** (full-time) does initial exam — complaint, findings, treatment plan
3. BDS doctor **schedules follow-up** with consultant
4. **Consultant** arrives, opens follow-up — needs to see BDS notes (previously on paper, now in side-by-side panel)
5. Consultant examines, may schedule further follow-ups (RCT = ~5 visits)
6. **Reception** collects payment

### Key Design Principles from This Flow

- **Context carries forward**: when a doctor opens a follow-up exam, they must see all previous notes in the chain without leaving the page
- **Treatment is multi-step**: RCT = 5 visits, Crown = 3 visits, Implant = 5 visits. The system tracks steps via `TreatmentStep` templates on operations
- **Scheduling is guided**: after saving an exam, the visit detail shows treatment progress and a "Schedule Next Step" button with suggested dates
- **Anyone can schedule**: BDS doctor schedules on consultant's behalf, reception schedules for everyone
- **Appointment cards need context**: operation name, step label, medical flags, previous diagnosis — not just patient name + free-text reason

### Roles & What They See

| Role | Level | Can See | Cannot See |
|------|-------|---------|------------|
| SYSADM | 0 | Everything | — |
| Admin | 1 | Everything | — |
| Reception | 2 | Billing, scheduling, patient CRUD, reports | — |
| Doctor | 3 | Clinical data, own schedule, patient info | Reports, lab costs, commission %, collect buttons, receipts, visits list |

### Treatment Chain Data Model

- `Visit.parentVisitId` → root parent (flat chain, not nested tree)
- Follow-ups of follow-ups still point to ORIGINAL parent
- `Visit.stepLabel` → maps to `TreatmentStep.name` for guided progress
- `TreatmentStep` on `Operation` → defines multi-step procedures (name, step number, day gap)

## Auth
- Cookie-based sessions, `requireAuth()` in layout
- Permission checks: `canSeeReports()`, `canSeeInternalCosts()`, `canCollectPayments()`, `canEditPatients()`, `isAdmin()`
- ALL mutating server actions check auth + permissions

## File Structure
- `src/app/(main)/` — all authenticated routes with sidebar layout
- `src/app/(main)/[route]/actions.ts` — server actions per route group
- `src/components/` — shared UI components
- `src/lib/` — utilities (auth, permissions, billing, commission, etc.)
- `prisma/schema.prisma` — data model
- `prisma/seed.ts` — demo data seeder

## Dev Commands
- `bun run dev` — start dev server
- `bun run build` — production build (run after each change set)
- `bun prisma/seed.ts` — re-seed (requires fresh db: `rm prisma/dev.db && bunx prisma db push`)
- `bunx prisma db push` — sync schema to db without migrations
