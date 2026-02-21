# FILE INVENTORY — Secunderabad Dental Hospital Legacy Software

**Archive**: `Archive.rar` (1.1 GB compressed, 3.1 GB extracted)
**Total files**: 1,984
**Date of archive**: Feb 20, 2026 (but data spans 2001-2023)
**Location**: Full copy of D: drive from clinic Windows machine

---

## CRITICAL DISCOVERY: This is NOT a .NET Application

**The original prompt assumed this was a .NET application with .exe + .dll files that could be decompiled with ILSpy. This is INCORRECT.**

The application is built with **Centura Team Developer 2.1 (CTD21)** — a proprietary RAD tool by Gupta Technologies (now Unify/OpenText). Key evidence:
- Directory named `ctd21` (Centura Team Developer 2.1)
- `CLINIC.exe` is a Win32 PE executable (NOT .NET IL)
- `Clinic1.apt` — CTD application source file (proprietary binary format)
- All DLLs are CTD runtime: `cbi21.dll`, `cdlli21.dll`, `cguti21.dll`, `cnri21.dll`, etc.
- `.QRP` files = Centura QuickReport templates
- `.APL` files = Centura Application Library files
- Database is **Gupta SQLBase 8.5** (not Sybase SQL Anywhere)

**Impact on approach:**
- ILSpy decompilation will NOT work
- The `.apt` file requires Centura Team Developer IDE to open (proprietary binary)
- HOWEVER: We have **complete SQL dumps** (14MB of `CLINIC.SQL`) with full schema + all data
- The SQL dumps are the primary source for understanding the database, business rules, and data
- The `.QRP` report files reveal report structures
- SMS text files reveal communication features

---

## Top-Level Directory Structure

```
Archive/
├── $RECYCLE.BIN/          ← Windows Recycle Bin (IGNORE)
├── Clinic/                ← BACKUP COPY of ctd21/ + SB850/ + installers
│   ├── BACKUP/            ← Database backups by day-of-week
│   ├── ctd21/             ← DUPLICATE of top-level ctd21/
│   ├── SB850/             ← DUPLICATE of top-level SB850/
│   ├── SQLBASE 850/       ← SQLBase installer media
│   ├── sb850 ptf4/        ← SQLBase patch installer
│   └── Setup.exe          ← Original clinic software installer (17MB)
├── ctd21/                 ← LIVE APPLICATION DIRECTORY (the clinic software)
│   ├── CLINIC.exe         ← Main application (1.4MB, last modified Oct 2020)
│   ├── Clinic1.apt        ← Application source (1.2MB, CTD binary format)
│   ├── CLINIC.SQL          ← FULL database dump (14MB, Oct 2020)
│   ├── CLINIC03/          ← Older/smaller DB copy (18MB, Dec 2013)
│   ├── PATIENT/           ← Patient photo images (32 patient folders)
│   ├── Patients Scanned Reports/ ← Scanned documents (30 patient folders)
│   ├── *.QRP              ← Report templates (28+ files)
│   ├── *.dll              ← CTD runtime libraries
│   └── Various SQL dumps  ← Multiple historical DB exports
├── SB850/                 ← LIVE SQLBase 8.5 DATABASE ENGINE
│   ├── CLINIC03/          ← LIVE DATABASE: CLINIC03.DBS (260MB, Sep 2023)
│   ├── dbnt5sv.exe        ← SQLBase server engine
│   ├── sql.ini            ← Active DB configuration
│   └── [runtime files]    ← SQLBase engine DLLs, tools, samples, docs
└── System Volume Information/ ← Windows system (IGNORE)
```

---

## CRITICAL Files (Application core, database, config)

| File | Size | Modified | Description |
|------|------|----------|-------------|
| `ctd21/CLINIC.exe` | 1.4M | Oct 2020 | **Main application executable** (Win32 PE, CTD21) |
| `ctd21/Clinic1.apt` | 1.2M | Apr 2014 | **Application source** (CTD binary format) |
| `SB850/CLINIC03/CLINIC03.DBS` | 260M | Sep 2023 | **LIVE database** (most current, SQLBase 8.5) |
| `ctd21/CLINIC.SQL` | 14M | Oct 2020 | **Full DB dump** — complete schema + all data (most current SQL export) |
| `SB850/sql.ini` | 1.3K | Sep 2023 | **Active DB config** — connection strings, server settings |
| `ctd21/sql.ini` | 522B | May 2025 | **Client config** — DB connection from app to server |
| `ctd21/CONFIG.INI` | 40B | Oct 2002 | App config (minimal — just DBName=BANK placeholder) |
| `ctd21/dcc.ini` | 1.2K | Oct 2001 | CTD deployment config |
| `SB850/dbnt5sv.exe` | 1.0M | Oct 2018 | SQLBase 5-user server engine |
| `Clinic/Setup.exe` | 17M | Oct 2002 | Original application installer |

---

## IMPORTANT Files (Reports, SQL scripts, data exports, templates)

### Report Templates (.QRP — Centura QuickReport)
| File | Size | Description (inferred from name) |
|------|------|-------------|
| `ctd21/C_REC.QRP` | 13K | **Receipt/bill** print template |
| `ctd21/C_PSLIP.QRP` | 12K | **Payment slip** template |
| `ctd21/C_PATIENT.QRP` | 17K | **Patient record** report |
| `ctd21/C_PATREC.QRP` | 6K | **Patient records** summary |
| `ctd21/C_docsum.qrp` | 19K | **Doctor summary** report |
| `ctd21/C_clisum.qrp` | 18K | **Clinic summary** report |
| `ctd21/C_DOCS.QRP` | 14K | **Doctor-wise** report |
| `ctd21/c_doc.qrp` | 12K | **Doctor** report |
| `ctd21/C_DOCDD.QRP` | 12K | **Doctor daily detail** report |
| `ctd21/C_DOCDET.QRP` | 11K | **Doctor detail** report |
| `ctd21/C_DOORG.qrp` | 23K | **Doctor-wise by org** report |
| `ctd21/C_CLIDET.QRP` | 16K | **Clinic detail** report |
| `ctd21/C_DISC.QRP` | 6.7K | **Discount** report |
| `ctd21/C_DUES.qrp` | 7.2K | **Dues/outstanding** report |
| `ctd21/C_DUES_ORG.qrp` | 7.2K | **Dues by org** report |
| `ctd21/C_Opall.qrp` | 7.5K | **Operations all** report |
| `ctd21/C_Opdet.qrp` | 7.4K | **Operations detail** report |
| `ctd21/C_LABALL.QRP` | 8.8K | **Lab work all** report |
| `ctd21/C_LABDET.QRP` | 8.8K | **Lab work detail** report |
| `ctd21/C_ALLLAB.QRP` | 8.6K | **All lab** report |
| `ctd21/C_MAIL.QRP` | 3.7K | **Mailing label** template |
| `ctd21/C_MAIL1.QRP` | 3.7K | Mailing label variant 1 |
| `ctd21/C_MAIL2.QRP` | 3.5K | Mailing label variant 2 |
| `ctd21/C_MAIL3.QRP` | 3.5K | Mailing label variant 3 |
| `ctd21/C_PHONE.QRP` | 2.2K | **Phone list** report |
| `ctd21/c_docpat.qrp` | 9.7K | **Doctor-patient** report |
| `ctd21/C_PSLIP1.QRP` | 19K | Payment slip variant |
| `ctd21/C_pslipOLD.qrp` | 19K | Old payment slip (backup) |
| `ctd21/C_docsumOLD.qrp` | 16K | Old doctor summary (backup) |
| `ctd21/C_MAIL_OLD.QRP` | 4K | Old mail template (backup) |
| `ctd21/C_REC 27102020.QRP` | 13K | Receipt backup from Oct 2020 |
| `ctd21/C_DR_REPORT.QRP` | ? | Doctor report (if exists) |

### SQL Dump Files (Database exports at various dates)
| File | Size | Modified | Description |
|------|------|----------|-------------|
| `ctd21/CLINIC.SQL` | 14M | Oct 2020 | **Most current** full DB dump |
| `ctd21/C1.SQL` | 10M | Feb 2016 | Historical dump |
| `ctd21/CLINI.SQL` | 10M | Oct 2015 | Historical dump |
| `ctd21/CLINIC03.SQL` | 8.6M | Sep 2014 | Historical dump |
| `ctd21/CLINIC04.SQL` | 7.2M | Feb 2014 | Historical dump |
| `ctd21/c.sql` | 8.6M | Aug 2014 | Historical dump |
| `ctd21/OPERATION.SQL` | 2.8K | Nov 2013 | **Operations/procedures table** export |
| `ctd21/FAIL.SQL` | 1.6K | Dec 2015 | Error log / failed operations |

### Data Export Files
| File | Size | Modified | Description |
|------|------|----------|-------------|
| `ctd21/PATIENT DETAILS.xlsx` | 2.0M | Aug 2015 | **Patient data export** (Excel) |
| `ctd21/PATIENT DETAILS.txt` | 2.2M | Aug 2015 | **Patient data export** (text) |
| `ctd21/Festivals_Sms.txt` | 1.1K | Jan 2014 | Festival SMS templates (New Year) |
| `ctd21/DoctorSms.txt` | 105B | Feb 2014 | Doctor appointment SMS template |
| `ctd21/PatientSms.txt` | 0B | Nov 2019 | Patient SMS (empty) |
| `ctd21/Status.txt` | 894B | Mar 2020 | SMS delivery status log |

### Patient Images & Scanned Reports
| Directory | Contents | Description |
|-----------|----------|-------------|
| `ctd21/PATIENT/` | 32 patient folders (10001-10027+) | Patient photos (JPG, ~50-100KB each) |
| `ctd21/Patients Scanned Reports/` | 30 patient folders | Scanned medical documents (JPG) |

### Database Backups
| File | Size | Modified | Description |
|------|------|----------|-------------|
| `Clinic/BACKUP/clinic03/WED/CLINIC03.BKP` | 258M | Aug 2023 | Wednesday backup (most recent) |
| `Clinic/BACKUP/clinic03/TUE/CLINIC03.BKP` | 247M | Feb 2023 | Tuesday backup |
| `Clinic/BACKUP/clinic03/08062022/CLINIC03.BKP` | 202M | Jun 2022 | Dated backup |
| `Clinic/BACKUP/clinic03/MON/CLINIC03.BKP` | 199M | May 2022 | Monday backup |
| `Clinic/BACKUP/clinic03/SAT/CLINIC03.BKP` | 161M | Oct 2020 | Saturday backup |
| `Clinic/BACKUP/clinic03/CLINIC03.BKP` | 160M | Sep 2020 | Root backup |
| `Clinic/BACKUP/clinic03/THU/CLINIC03.BKP` | 0B | Mar 2023 | Thursday backup (EMPTY/failed) |
| Various `.LOG` files | 100-500K each | Transaction logs for backups |

---

## REFERENCE Files (Useful context, not for migration)

### SQLBase Documentation (in `SB850/Books/` and `Clinic/SQLBASE 850/Books/`)
- `DBA.PDF` (2.2M) — Database admin guide
- `sqllang.pdf` (2.8M) — SQL language reference
- `api.pdf` (2.7M) — API reference
- `Advtop.pdf` (1.8M) — Advanced topics
- `Console.pdf` (1.2M) — Console guide
- `connecting.pdf` (767K) — Connectivity guide
- `sqltalk.pdf` (1.4M) — SQLTalk guide
- `starter.pdf` (142K) — Getting started
- `SQLBNew.pdf` (152K) — What's new

### Help Files
- `SB850/SQLBASE.HLP`, `TALK.HLP`, `sqlcon.hlp`, `graphppr.hlp` — SQLBase help files
- `ctd21/graphppr.hlp`, `cfgwi10.hlp` — CTD help files

### CTD Application Libraries (.APL)
- `ctd21/Clinic1.apt` — **Main app source** (already listed as CRITICAL)
- `ctd21/comws.apl`, `comwstl.apl` — Communication libraries
- `ctd21/vtcal.apl` — Calendar library
- `ctd21/vtcomm.apL` — Communications
- `ctd21/vtdos.apl` — DOS operations
- `ctd21/vtfile.apl` — File operations
- `ctd21/vtstr.apl` — String operations
- `ctd21/vttblwin.apl` — Table window
- `ctd21/mtbl.apl` — Table library
- `ctd21/mimg.apl` — Image library
- `ctd21/swbidi32.apl` — Bi-directional text
- `ctd21/Automation.apl` — OLE Automation
- `ctd21/OLE Automation.apl` — OLE Automation
- `ctd21/Acrobat Control for ActiveX.apl` — Acrobat integration
- `ctd21/csXImage Library.apl` — Image control library
- `ctd21/AxImage ActiveX Control module.apl` — Image ActiveX

---

## IGNORE Files

### Duplicate Directories
The `Clinic/` directory contains **exact duplicates** of both `ctd21/` (183M each) and `SB850/` (343M each). The top-level versions are the LIVE copies; the `Clinic/` copies are backups.

### Windows System
- `$RECYCLE.BIN/` — Contains a 564MB zip file (likely another backup)
- `System Volume Information/` — Windows system metadata

### SQLBase SDK/Samples (in `SB850/` and `Clinic/SB850/`)
- `SB850/Samples/` — VB6, C#, J#, ASP.NET, JDBC, COM+ sample code (SQLBase SDK)
- `SB850/include/` — C/C++ header files for SQLBase API
- `SB850/lib/` — SQLBase client libraries
- `SB850/src/` — Source files
- `SB850/scripts/` — SQLBase maintenance scripts
- `SB850/island/` — Demo database (ISLAND.DBS)
- `SB850/$SB85PTFUninstall$/` — Patch rollback files
- `SB850/Topic/` — Help topic HTML files
- `SB850/Java/` — JDBC driver JAR

### SQLBase Runtime DLLs (both in `ctd21/` and `SB850/`)
~100+ DLL files that are part of the SQLBase and CTD runtime — NOT application code.

### Installers
- `Clinic/Setup.exe` (17M) — Original clinic installer
- `Clinic/SQLBASE 850/setup.exe`, `setup2.exe` (100M) — SQLBase installer
- `Clinic/sb850 ptf4/setup.exe` (10M) — SQLBase patch
- `ctd21/SHARE.exe` (5.5M) — Shared runtime installer
- `ctd21/Mdac_typ.exe` (5M) — MDAC installer
- `ctd21/TUCI.exe` (587K) — Unify Client installer
- `ctd21/csXImage1.exe` (1.6M) — Image control installer
- `SB850/Redist/setup.exe` (12M) — SQLBase redistributable

### Misc
- `ctd21/CLINIC.rar` (2.2M) — Archived backup of clinic files
- `ctd21/c.zip` (1.4M), `C.rar` (1.5M), `SHQRP.ZIP` (835K) — Various archives
- `ctd21/My Documents.lnk` — Windows shortcut
- `ctd21/setup.log`, `setup.qui` — Installation logs
- Various `.bmp`, `.ico` files — UI icons/images for the application
- `SB850/certify.htm`, `relnotes*.htm` — SQLBase release notes
- `Clinic/SQLBASE 850.zip` (116M) — Archived SQLBase installer

---

## Summary by Category

| Category | File Count (approx) | Notes |
|----------|-------------------|-------|
| **CRITICAL** | ~15 files | CLINIC.exe, Clinic1.apt, CLINIC03.DBS, CLINIC.SQL, config files |
| **IMPORTANT** | ~80 files | QRP reports, SQL dumps, patient data exports, SMS files, patient images, backups |
| **REFERENCE** | ~50 files | SQLBase docs, help files, APL libraries |
| **IGNORE** | ~1,840 files | Duplicates (Clinic/ folder), SDK samples, runtime DLLs, installers, OS files |

---

## Key Configuration Extracted

### Database Connection
- **Engine**: Gupta SQLBase 8.5 (5-user license)
- **Server name**: `Server1`
- **Database name**: `CLINIC03`
- **DB file location**: `D:\SB850\CLINIC03\CLINIC03.DBS` (on original machine)
- **Protocol**: TCP/IP (WinSock) via `sqlws32.dll`
- **Server address**: `192.168.0.99:2155` (from client config)
- **Client machine**: `DELL-PC` (also `SERVER`)
- **DB users**: `SYSADM` (admin), `MURALI`, `NONE` (all with encrypted passwords)

### Database Schema (25 tables found in CLINIC.SQL)
1. `DOCTOR` — Doctor records with payment percentages, TDS rates, mobile, department
2. `OPERATION` — 100+ dental procedure codes with min/max fees
3. `LAB` — Dental lab records
4. `LAB_RATE` — Lab work pricing
5. `PLAN_TABLE` — Treatment plans
6. `APPOINT` — Appointments
7. `HISTORY` — Treatment history (largest table, starts at line 691)
8. `RECEIPT` — Payment receipts (starts at line 80,521)
9. `PATIENT` — Patient records (starts at line 165,736 — huge!)
10. `MISC` — Miscellaneous settings
11. `D_DETAILS` — Doctor details
12. `DISEASE` — Disease codes/lookup
13. `PATIENT_DISEASE` — Patient-disease junction table
14. `DEPT` — Departments
15. `DESIG` — Designations
16. `SMS_TEMPLATES` — SMS message templates
17. `COMPLAINT` — Patient complaints
18. `TREATMENT` — Treatment records
19. `DR_REPORT` — Doctor reports
20. `PATIENT_FILES` — Patient file attachments (starts at line 262,958)
21. `FORMNAME` — Form name lookups
22. `PERMISSIONS` — User permissions
23. `DRUGS` — Drug/medication records
24. `DOSAGE` — Dosage information
25. `PERIOD` — Period/timing information

### Business Context
- **Clinic name**: Secunderabad Dental Hospital
- **Location**: Secunderabad, Hyderabad, India
- **Active period**: ~2002-2023 (21 years of data)
- **Primary doctor/owner**: KAZIM (D_CODE=1, level 1, password visible)
- **Total doctors**: 120+ (many part-time/visiting)
- **Doctor payment model**: Percentage-based (25-75%) with TDS deduction
- **Patient IDs**: 5-digit numbers (10001+)
- **SMS integration**: Review appointment reminders, festival greetings
- **Dental procedures**: 100+ types (REG/CONS, RCT, Extraction, Ortho, Implant, etc.)
- **Special rates**: CGHS (govt health scheme), BSNL (telecom company) discounted rates
