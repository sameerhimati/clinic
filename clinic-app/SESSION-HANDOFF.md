# Session Handoff
> Last updated: 2026-02-26 (Session 13 — UX Audit & Tariff Integration)

## Completed This Session
- [x] **Tariff Card Integration** — Replaced 114 legacy operations with 65 procedures from SDH Tariff Card (50 adult + 10 pedo + 5 utility). `defaultMinFee` set to exact tariff amounts. Operation names match tariff card verbatim (e.g., "Root Canal Treatment" not "RCT", "Ceramic Crown - PFM" not "CER CROWN").
- [x] **Tariff Auto-Fill in Visit Form** — Selecting a treatment auto-fills the Rate field with its tariff price. Tariff reference shown inline ("Tariff: ₹7,000") — click to reset. Amber indicator when rate differs from tariff.
- [x] **Tiered Discount System** — Replaced free-text discount with role-based tier buttons: [No Discount] [10%] [15%] [20%]. L3 doctors: max 10%. L2 reception: max 15%. Admin: all tiers + Custom flat amount. Auto-calculates discount amount + live net amount summary. Server-side validation in `createVisit` rejects unauthorized discount tiers.
- [x] **Visit Form UX Overhaul** — Reordered fields: Patient → Treatment → Rate+Discount → Doctor → Lab → Notes. Lab section collapsed by default ("Add Lab Work" toggle). Removed unnecessary Card wrappers and section headers. Single flat form layout.
- [x] **Seed Data Updated** — All visit/receipt amounts updated to tariff prices. Categories: General, Restorative, Endodontics, Prosthodontics, Periodontics, Surgery, Orthodontics, Implants, Pedo.
- [x] **Terminology Consistency** — "Operation/Procedure" → "Treatment" across: visit detail, settings page, operations admin page, operation create form. Settings page now shows "Treatments & Tariff".
- [x] **UX Cleanup** — Reports page: removed card descriptions. Settings page: removed descriptive subtexts. Receipts/new: simplified empty state. Patient detail: section headers simplified to uppercase tracking-wide labels. Patient list + detail: tightened row padding for denser lists. Patient header: removed redundant "Patient" label above code.

## Current State
- **Branch:** main
- **Build:** passing (34 routes, zero errors)
- **Seed:** 65 operations (tariff-matched), 50 patients, 49+ visits, 10 appointments
- **Blockers:** none

## Next Session Should
1. **Continue UX audit** — Examine form, appointment form, doctor list/form, checkout flow, commission/outstanding reports all untouched
2. **CF-4: Legacy data import** — write import script for `CLINIC.SQL` → SQLite
3. **Phase 4: Remaining reports** — Operations Report, Lab Details, Discount Report, Receipts Report
4. **Form validation** — add zod schemas for client + server validation

## Context to Remember
- **Discount tiers** — `DISCOUNT_TIERS` array in `visit-form.tsx` defines tiers with `minLevel` (the highest permission level that can use the tier — lower number = more access). Server validation in `createVisit` uses `maxPercent` calculation.
- **Tariff rate tracking** — `tariffRate` state in VisitForm tracks the `defaultMinFee` of the selected operation. Shown as inline label, amber when rate differs.
- **Lab section collapsible** — `showLabSection` state in VisitForm. Defaults to false. "Add Lab Work" button expands it.
- **Operations seed codes preserved** — Legacy codes (1, 7, 15, etc.) kept for backward compatibility. New procedures use codes 120+.
- **`defaultMaxFee` deprecated** — Tariff card uses single price, not min/max range. `defaultMinFee` is THE tariff rate. Form label says "Tariff Rate (₹)".

## Start Command
```
cd /Users/sameer/Desktop/Code/clinic/clinic-app && PATH="$HOME/.bun/bin:$PATH" bun run dev
```
