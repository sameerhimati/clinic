# Clinic App — Claude Context

## Session Start Rule

**Read `../ux-fixes.md` first every session.** It is the ground truth for the workflow redesign (Sessions 37+). All roadmap items are paused until the redesign is complete.

## Stack
- Next.js 16 (App Router), TypeScript, Tailwind CSS 4 + shadcn/ui
- Prisma 6 with SQLite, package manager: bun (`$HOME/.bun/bin` in PATH)
- Light-only theme (no `dark:` prefixes)

## Daily Patient Flow (the core workflow — BEING REDESIGNED)

1. **Reception (L2)** registers patient, schedules appointment
2. **BDS doctor (L3)** examines, creates treatment plan via dental chart (per-tooth findings + treatments)
3. **Reception (L2)** schedules follow-up with consultant, collects advance → patient escrow
4. **Consultant (L4)** views schedule, sees case summary, examines, marks "Work Done" per tooth
5. **Work Done** triggers: tooth status update + plan advancement + escrow fulfillment
6. **Reception (L2)** manages escrow balance, collects remaining payments

## Roles (BEING UPDATED — see `../ux-fixes.md` for full spec)
| Role | Level | Super-User | Key Access |
|------|-------|------------|------------|
| Admin | L1 | — | Everything, oversight, monthly audit review |
| Front Desk | L2 | Murli (lab rates, tariffs, large discounts) | Schedule, collect, follow-up patients |
| BDS Doctor | L3 | Clinical Head (edit findings dropdown, step templates) | Examine, treatment plans, 20% discount |
| Consultant | L4 | — | View own schedule, examine assigned cases only |

## Key Data Model
- `Visit.parentVisitId` → flat chain to root parent (not nested tree)
- `Visit.stepLabel` → maps to `TreatmentStep.name` for guided progress
- `TreatmentStep` on `Operation` → multi-step procedure templates
- **PLANNED**: `isSuperUser` on Doctor, `AuditLog`, `ToothStatus`, `ToothFinding`, `WorkDone`, escrow fields

## UI Design Standards
- **Target quality**: Apple, Notion, Linear, Vercel — smart, elegant, intentional
- **Use Playwright MCP** to screenshot and visually verify every UI change
- **Playwright cleanup**: After each Playwright session, delete all screenshot PNGs from the repo root and remove `.playwright-mcp/` dir. Never commit screenshots.
- **Form pattern**: `Card` + `grid gap-4 sm:grid-cols-N` + `space-y-2` per field
- See `session-handoff.md` for detailed design research (spacing, typography, grid rules)

## Dev Commands
```bash
bun run dev                    # start dev server
bun run build                  # production build (run after each change)
rm prisma/dev.db && bunx prisma db push && bun prisma/seed.ts  # fresh re-seed (demo data)
```

## Legacy Data (Real Clinic Data)
- **Use seed data during development** — real data is for deployment only
- Parsed JSON: `../clinic-legacy/parsed/` (12 JSON files, 324k rows)
- Import script: `prisma/import-legacy.bun.ts` (excluded from tsconfig)
- Parser: `../clinic-legacy/parse-sqltalk-exports.ts`
- Raw exports: `../clinic-legacy/exports-2026/` (from live CLINIC03 DB, March 2026)
- To load real data: `rm prisma/dev.db && bunx prisma db push && bun prisma/import-legacy.bun.ts`
- Stats: 36,662 patients, 102,457 visits, 109,484 receipts (₹18.84 Cr), 152 doctors, 68,948 patient files
- Legacy permission levels are inverted: L3=doctor, L4=reception (opposite of our L2=reception, L3=doctor)
- Scanned X-rays: 16.8GB in ClinicScanned/ at the clinic (2,009 patient folders) — not yet imported

## Project Documentation Map
| File | Purpose |
|------|---------|
| `CLAUDE.md` (this file) | Concise context loaded every session |
| `ROADMAP.md` | Full project roadmap — phases, sprints, what's done/pending |
| `../ux-fixes.md` | **Ground truth** — workflow redesign spec + UX bugs (read first every session) |
| `../session-handoff.md` | Session-to-session handoff — immediate next tasks, design research, current state |
| `../BLUEPRINT.md` | Original legacy system analysis + full requirements |
| `../FILE_INVENTORY.md` | Legacy Centura CTD21 data file catalog (for data import) |
| `../clinic-legacy/parsed/` | Parsed legacy JSON data (ready for import) |
| `prisma/import-legacy.bun.ts` | Legacy data → Prisma/SQLite import script |
| Claude memory `MEMORY.md` | Detailed project memory — auth, permissions, schema, all sessions |
| Claude memory `workflows.md` | Clinical workflow definitions + testing checklist |
