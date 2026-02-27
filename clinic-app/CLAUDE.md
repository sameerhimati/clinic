# Clinic App — Claude Context

## Session Start Rule

**Before starting any new feature or roadmap item, ask the user:**
> "Have you finished testing the daily patient flow? Any bugs or workflow issues to fix before we move on?"

Do NOT proceed with new roadmap items until the user confirms. Workflow-first development.

## Stack
- Next.js 16 (App Router), TypeScript, Tailwind CSS 4 + shadcn/ui
- Prisma 6 with SQLite, package manager: bun (`$HOME/.bun/bin` in PATH)
- Light-only theme (no `dark:` prefixes)

## Daily Patient Flow (the core workflow)

1. **Reception** creates patient + appointment
2. **BDS doctor** (SURENDER, L3) does initial exam
3. BDS schedules follow-up with **consultant** (RAMANA REDDY, L3)
4. Consultant opens follow-up — sees BDS notes in side-by-side panel
5. Consultant examines, schedules next step (RCT = 5 visits, Crown = 3, etc.)
6. **Reception** (MURALIDHAR, L2) collects payment

## Key Data Model
- `Visit.parentVisitId` → flat chain to root parent (not nested tree)
- `Visit.stepLabel` → maps to `TreatmentStep.name` for guided progress
- `TreatmentStep` on `Operation` → multi-step procedure templates

## Roles
| Role | Level | Key restriction |
|------|-------|-----------------|
| Admin | 1 | Everything |
| Reception | 2 | No clinical exam |
| Doctor | 3 | No reports, lab costs, commission %, collect buttons, receipts, visits list |

## UI Design Standards
- **Target quality**: Apple, Notion, Linear, Vercel — smart, elegant, intentional
- **Use Playwright MCP** to screenshot and visually verify every UI change
- **Form pattern**: `Card` + `grid gap-4 sm:grid-cols-N` + `space-y-2` per field
- See `session-handoff.md` for detailed design research (spacing, typography, grid rules)

## Dev Commands
```bash
bun run dev                    # start dev server
bun run build                  # production build (run after each change)
rm prisma/dev.db && bunx prisma db push && bun prisma/seed.ts  # fresh re-seed
```

## Project Documentation Map
| File | Purpose |
|------|---------|
| `CLAUDE.md` (this file) | Concise context loaded every session |
| `ROADMAP.md` | Full project roadmap — phases, sprints, what's done/pending |
| `../session-handoff.md` | Session-to-session handoff — immediate next tasks, design research, current state |
| `../BLUEPRINT.md` | Original legacy system analysis + full requirements |
| `../FILE_INVENTORY.md` | Legacy Centura CTD21 data file catalog (for data import) |
| Claude memory `MEMORY.md` | Detailed project memory — auth, permissions, schema, all sessions |
| Claude memory `workflows.md` | Clinical workflow definitions + testing checklist |
