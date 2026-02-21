# Session Handoff — Clinic App

## What Was Built (MVP - P0)
A full working dental clinic management app rebuilt from legacy Centura/SQLBase system.

**Stack:** Next.js 15 (App Router), bun, Tailwind CSS 4, shadcn/ui, Prisma 6 + SQLite

**Working Features:**
- Dashboard with today's stats, quick actions, recent activity
- Patient CRUD with search (name, mobile, code), medical history, pagination
- Visit/treatment entry with operation selection (107 procedures), doctor assignment, lab details
- Billing & receipts with payment modes (Cash/Card/UPI/NEFT/Cheque)
- Printable receipts with Indian amount-in-words (Crore/Lakh format)
- Doctor commission report (percentage + fixed-rate, TDS deduction) — matches legacy `fnCommission` exactly
- Outstanding dues report with filters
- Doctor list (read-only), Settings page with DB stats
- Seed data: 50 patients, 20 doctors, 107 operations, 28 labs, 18 diseases, sample visits/receipts

**All 18 routes build and serve. Dev server: `bun run dev` on port 3000.**

---

## Critical User Feedback

### 1. Patient Code is THE Identifier (Highest Priority)
The clinic uses the patient code (SDH number like `10001`, `30427`) as THE identifier — staff types it, prints it on receipts, references it in conversation. Currently it's stored as `legacyCode` and treated as secondary. This needs to become the primary, prominent identifier everywhere. See ROADMAP.md CF-1.

### 2. Role-Based Views Needed
Currently there's only one view (admin). The app needs different experiences for:
- **Admin/SYSADM** — Full access (current view)
- **Reception** — Patient forms, receipts, appointments
- **Doctor** — Read patients/visits, write reports, no edit/delete
See ROADMAP.md Phase 1 (P1-1, P1-2).

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Full database schema (all models) |
| `prisma/seed.ts` | Seed data from legacy SQL dump |
| `src/lib/db.ts` | Prisma client singleton |
| `src/lib/commission.ts` | Doctor commission calc (matches legacy exactly) |
| `src/lib/amount-in-words.ts` | Indian rupee amount-to-words |
| `src/components/sidebar.tsx` | Main navigation |
| `src/components/patient-form.tsx` | Shared patient registration/edit form |
| `src/components/visit-form.tsx` | Visit creation with operation/doctor/lab selection |
| `src/app/(main)/layout.tsx` | Main layout (sidebar + topbar + content) |
| `ROADMAP.md` | Full roadmap with phases CF through P7 |

**Reference docs:**
| File | Purpose |
|------|---------|
| `/Users/sameer/Desktop/Code/clinic/BLUEPRINT.md` | Full reverse-engineered spec of legacy system |
| `/Users/sameer/Desktop/Code/clinic/clinic-legacy/Archive/ctd21/CLINIC.SQL` | Legacy SQL data dump |
| `/Users/sameer/Desktop/Code/clinic/clinic-legacy/Archive/ctd21/Clinic1.apt` | Legacy Centura source (business logic) |

---

## Technical Notes

- **Prisma 6** (not 7) — Prisma 7 had module resolution issues with bun. Import from `@prisma/client`.
- **bun** must be on PATH: `PATH="$HOME/.bun/bin:$PATH"`
- **Database** is SQLite at `prisma/dev.db`. Reset with `bunx prisma db push --force-reset && bun run prisma/seed.ts`
- **Server actions** pattern: each route group has an `actions.ts` file
- **Legacy case numbers** and patient codes are auto-generated as MAX+1 in server actions
- Commission logic in `src/lib/commission.ts` was verified against the exact `fnCommission` algorithm from `Clinic1.apt`

---

## What to Do Next
Follow `ROADMAP.md` in order:
1. **CF-1**: Make patient code the primary identifier (rename `legacyCode` → `code`, update search, display, forms, receipts)
2. **CF-2**: Add receipt number system
3. **Phase 1**: Auth & role-based access control
4. Continue through phases as prioritized in ROADMAP.md
