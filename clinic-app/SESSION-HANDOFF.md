# Session Handoff — Clinic App

## Last Session: Session 1 — Make the App Actually Usable
**Date:** 2026-02-21
**Focus:** Renamed legacy fields, made patient code the primary identifier, built multi-visit checkout page, wired up navigation.

---

## What's Built

**Stack:** Next.js 16 (App Router), bun, Tailwind CSS 4, shadcn/ui, Prisma 6 + SQLite

**Working Features (19 routes):**
- Dashboard with today's stats, quick actions, recent visits with patient codes + "Pay" links
- Patient CRUD with search (name, mobile, code — exact code match prioritized), medical history, pagination
- Patient code shown prominently everywhere as `#10001` — the primary identifier
- Visit/treatment entry with operation selection (107 procedures), doctor assignment, lab details
- **Patient Checkout page** (`/patients/[id]/checkout`) — multi-visit payment allocation with:
  - Outstanding visit list with per-visit allocation inputs
  - Auto-allocate button (FIFO oldest-first)
  - Atomic multi-receipt creation via `prisma.$transaction()`
  - Real-time validation (allocation must match payment amount)
- Billing & receipts with auto-generated sequential receipt numbers (`receiptNo`)
- Printable receipts with patient code, receipt number, Indian amount-in-words
- Doctor commission report (percentage + fixed-rate, TDS) — verified correct with multi-receipt scenarios
- Outstanding dues report with "Pay" links to checkout
- Doctor list, Settings page with DB stats
- "Collect Payment" button on patient detail, visit detail, dashboard, and outstanding report

**All 19 routes build and serve. Dev server: `bun run dev` on port 3000.**

---

## Session 1 Changes

### Schema Renames (Breaking)
| Old Field | New Field | Model |
|-----------|-----------|-------|
| `legacyCode` | `code` | Patient, Doctor, Operation, Lab |
| `legacyCaseNo` | `caseNo` | Visit |
| `legacyReceiptNo` | `receiptNo` | Receipt |

All 13+ source files updated. Old migration SQL still references old names (harmless).

### New Files
| File | Purpose |
|------|---------|
| `src/app/(main)/patients/[id]/checkout/page.tsx` | Checkout server component |
| `src/app/(main)/patients/[id]/checkout/checkout-form.tsx` | Interactive checkout client component |
| `src/app/(main)/patients/[id]/checkout/actions.ts` | `recordCheckoutPayment` server action |

### Key Behavior Changes
- Receipt creation now auto-generates `receiptNo` as `MAX(receiptNo) + 1`
- Patient creation auto-generates `code` as `MAX(code) + 1` (was already there, just renamed)
- Visit "Add Payment" buttons now redirect to patient checkout (not single-receipt form)
- Single-receipt form (`/receipts/new`) still works as fallback
- Seed data includes multi-receipt checkout scenarios + sequential receipt numbers

---

## Seed Data (Demo Only)
Current seed data is **demo/placeholder** — not real patient data:
- 50 patients (codes 10001–10050), 20 doctors, 107 operations, 28 labs
- 22 visits (cases 80001–80022), 21 receipts (receipt #1–21)
- Multi-receipt checkout scenarios for patients 18 and 20
- **When real data is imported**, receipt numbers and patient codes will need to start from the correct sequence (after legacy max values: ~40,427 patients, ~20,178 receipts)

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Full database schema (all models) |
| `prisma/seed.ts` | Demo seed data |
| `src/lib/db.ts` | Prisma client singleton |
| `src/lib/commission.ts` | Doctor commission calc (matches legacy exactly) |
| `src/lib/amount-in-words.ts` | Indian rupee amount-to-words |
| `src/components/sidebar.tsx` | Main navigation |
| `src/components/patient-form.tsx` | Shared patient registration/edit form |
| `src/components/visit-form.tsx` | Visit creation with operation/doctor/lab selection |
| `src/app/(main)/patients/[id]/checkout/` | Multi-visit checkout flow (3 files) |

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
- Patient codes, case numbers, and receipt numbers are all auto-generated as MAX+1 in server actions
- Commission logic verified against exact `fnCommission` algorithm from legacy `Clinic1.apt`
- **Git repo**: `github.com/sameerhimati/clinic` (private)

---

## What to Do Next
Follow `ROADMAP.md` in order:
1. **CF-3**: Legacy data import (migrate real patient/visit/receipt data from CLINIC.SQL)
2. **Phase 1**: Auth & role-based access control
3. Continue through phases as prioritized in ROADMAP.md
