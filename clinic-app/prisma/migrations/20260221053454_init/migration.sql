-- CreateTable
CREATE TABLE "diseases" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "operations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "legacyCode" INTEGER,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "defaultMinFee" REAL,
    "defaultMaxFee" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "labs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "legacyCode" INTEGER,
    "name" TEXT NOT NULL,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "lab_rates" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "labId" INTEGER NOT NULL,
    "itemCode" INTEGER NOT NULL,
    "itemName" TEXT NOT NULL,
    "rate" REAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "lab_rates_labId_fkey" FOREIGN KEY ("labId") REFERENCES "labs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "designations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "clinic_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "addressLine3" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "phone" TEXT,
    "fax" TEXT,
    "email" TEXT,
    "gstNumber" TEXT,
    "scanFolder" TEXT,
    "appVersion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "doctors" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "legacyCode" INTEGER,
    "name" TEXT NOT NULL,
    "mobile" TEXT,
    "email" TEXT,
    "designationId" INTEGER,
    "commissionPercent" REAL NOT NULL DEFAULT 0,
    "commissionRate" REAL,
    "tdsPercent" REAL NOT NULL DEFAULT 0,
    "tdsNew" REAL,
    "tdsDate" DATETIME,
    "permissionLevel" INTEGER NOT NULL DEFAULT 3,
    "password" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "doctors_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "designations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "doctor_commission_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "doctorId" INTEGER NOT NULL,
    "periodFrom" DATETIME NOT NULL,
    "periodTo" DATETIME NOT NULL,
    "commissionPercent" REAL,
    "commissionRate" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "doctor_commission_history_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "patients" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "legacyCode" INTEGER,
    "salutation" TEXT,
    "name" TEXT NOT NULL,
    "fatherHusbandName" TEXT,
    "dateOfBirth" DATETIME,
    "ageAtRegistration" INTEGER,
    "gender" TEXT,
    "bloodGroup" TEXT,
    "occupation" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "addressLine3" TEXT,
    "city" TEXT,
    "pincode" TEXT,
    "referringPhysician" TEXT,
    "physicianPhone" TEXT,
    "remarks" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "patient_diseases" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER NOT NULL,
    "diseaseId" INTEGER NOT NULL,
    "notedDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "patient_diseases_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "patient_diseases_diseaseId_fkey" FOREIGN KEY ("diseaseId") REFERENCES "diseases" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "visits" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "legacyCaseNo" INTEGER,
    "patientId" INTEGER NOT NULL,
    "visitDate" DATETIME NOT NULL,
    "operationId" INTEGER,
    "operationRate" REAL,
    "discount" REAL NOT NULL DEFAULT 0,
    "doctorId" INTEGER,
    "assistingDoctorId" INTEGER,
    "doctorCommissionPercent" REAL,
    "doctorCommissionAmount" REAL,
    "labId" INTEGER,
    "labRateId" INTEGER,
    "labRateAmount" REAL NOT NULL DEFAULT 0,
    "labQuantity" REAL NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "visits_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "visits_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "operations" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "visits_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "visits_assistingDoctorId_fkey" FOREIGN KEY ("assistingDoctorId") REFERENCES "doctors" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "visits_labId_fkey" FOREIGN KEY ("labId") REFERENCES "labs" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "visits_labRateId_fkey" FOREIGN KEY ("labRateId") REFERENCES "lab_rates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "legacyReceiptNo" INTEGER,
    "visitId" INTEGER NOT NULL,
    "receiptDate" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "paymentMode" TEXT NOT NULL DEFAULT 'Cash',
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "receipts_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "receipts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "doctors" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "clinical_reports" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "visitId" INTEGER NOT NULL,
    "reportDate" DATETIME NOT NULL,
    "doctorId" INTEGER NOT NULL,
    "complaint" TEXT,
    "examination" TEXT,
    "diagnosis" TEXT,
    "treatmentNotes" TEXT,
    "estimate" TEXT,
    "medication" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "clinical_reports_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "clinical_reports_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "patient_files" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT,
    "description" TEXT,
    "fileType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "patient_files_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "diseases_code_key" ON "diseases"("code");

-- CreateIndex
CREATE UNIQUE INDEX "operations_legacyCode_key" ON "operations"("legacyCode");

-- CreateIndex
CREATE UNIQUE INDEX "labs_legacyCode_key" ON "labs"("legacyCode");

-- CreateIndex
CREATE UNIQUE INDEX "lab_rates_labId_itemCode_key" ON "lab_rates"("labId", "itemCode");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_legacyCode_key" ON "doctors"("legacyCode");

-- CreateIndex
CREATE UNIQUE INDEX "patients_legacyCode_key" ON "patients"("legacyCode");

-- CreateIndex
CREATE UNIQUE INDEX "patient_diseases_patientId_diseaseId_key" ON "patient_diseases"("patientId", "diseaseId");

-- CreateIndex
CREATE UNIQUE INDEX "visits_legacyCaseNo_key" ON "visits"("legacyCaseNo");
