import { z } from "zod/v4";

/** Locale-safe today string (yyyy-MM-dd) — avoids UTC shift from toISOString() */
export function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Locale-safe date to yyyy-MM-dd string */
export function dateToString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Strip commas from number strings before parsing (handles Indian formatting like "10,000") */
const numericString = z.string().transform((s) => s.replace(/,/g, ""));

/** Coerce a FormData string to a trimmed non-empty string, or null */
const optionalString = z
  .string()
  .transform((s) => s.trim() || null)
  .nullable()
  .optional();

/** Coerce a FormData string to an integer, or null */
const optionalInt = z
  .string()
  .transform((s) => {
    const n = parseInt(s, 10);
    return isNaN(n) ? null : n;
  })
  .nullable()
  .optional();

/** Coerce a FormData string to a float (strips commas), or 0 */
const numericOrZero = z
  .string()
  .optional()
  .default("0")
  .transform((s) => {
    const n = parseFloat(s.replace(/,/g, ""));
    return isNaN(n) ? 0 : n;
  });

// ── Patient ──────────────────────────────────────────────────────────

export const patientSchema = z.object({
  name: z.string().trim().min(1, "Patient name is required"),
  salutation: optionalString,
  fatherHusbandName: optionalString,
  dateOfBirth: z
    .string()
    .optional()
    .transform((s) => {
      if (!s) return undefined;
      const d = new Date(s);
      if (d > new Date()) return undefined; // DOB cannot be in the future
      return d;
    }),
  ageAtRegistration: z
    .string()
    .optional()
    .transform((s) => {
      if (!s) return undefined;
      const n = parseInt(s, 10);
      return isNaN(n) || n < 0 ? undefined : n;
    }),
  gender: optionalString,
  bloodGroup: optionalString,
  occupation: optionalString,
  phone: optionalString,
  mobile: z.string().trim().min(1, "Mobile number is required")
    .transform((s) => s.replace(/[\s\-()\/]/g, ""))
    .pipe(z.string().regex(/^[6-9]\d{9}$/, "Mobile must be 10 digits starting with 6-9")),
  email: optionalString,
  addressLine1: optionalString,
  addressLine2: optionalString,
  addressLine3: optionalString,
  city: optionalString,
  pincode: z
    .string()
    .optional()
    .transform((s) => {
      if (!s || !s.trim()) return undefined;
      return s.trim();
    }),
  referringPhysician: optionalString,
  physicianPhone: optionalString,
  remarks: optionalString,
});

export type PatientInput = z.output<typeof patientSchema>;

// ── Visit ────────────────────────────────────────────────────────────

export const visitSchema = z.object({
  patientId: z.coerce.number().int().positive("Patient is required"),
  operationId: optionalInt,
  doctorId: optionalInt,
  assistingDoctorId: optionalInt,
  labId: optionalInt,
  labRateId: optionalInt,
  visitType: z.enum(["NEW", "FOLLOWUP", "REVIEW"]).default("NEW"),
  parentVisitId: optionalInt,
  stepLabel: optionalString,
  appointmentId: optionalInt,
  planItemId: optionalInt,
  operationRate: numericOrZero,
  discount: numericOrZero,
  labRateAmount: numericOrZero,
  labQuantity: z
    .string()
    .optional()
    .default("1")
    .transform((s) => {
      if (!s) return 1;
      const n = parseFloat(s.replace(/,/g, ""));
      return isNaN(n) || n <= 0 ? 1 : n;
    }),
  visitDate: z
    .string()
    .optional()
    .transform((s) => (s ? new Date(s) : new Date())),
  notes: optionalString,
});

export type VisitInput = z.output<typeof visitSchema>;

// ── Receipt ──────────────────────────────────────────────────────────

export const receiptSchema = z.object({
  visitId: z.coerce.number().int().positive("Visit is required"),
  amount: z
    .string()
    .transform((s) => parseFloat(s.replace(/,/g, "")))
    .pipe(z.number().positive("Amount must be greater than zero")),
  paymentMode: z.string().default("Cash"),
  receiptDate: z
    .string()
    .optional()
    .transform((s) => (s ? new Date(s) : new Date())),
  notes: optionalString,
});

export type ReceiptInput = z.output<typeof receiptSchema>;

// ── Appointment ──────────────────────────────────────────────────────

export const appointmentSchema = z.object({
  patientId: z.coerce.number().int().positive("Patient is required"),
  doctorId: optionalInt,
  roomId: optionalInt,
  date: z.string().min(1, "Date is required"),
  timeSlot: optionalString,
  reason: optionalString,
  notes: optionalString,
  isWalkIn: z.string().optional().transform((s) => s === "true"),
});

export type AppointmentInput = z.output<typeof appointmentSchema>;

// ── Doctor ───────────────────────────────────────────────────────────

export const doctorSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  mobile: optionalString,
  email: optionalString,
  designationId: optionalInt,
  permissionLevel: z.coerce.number().int().min(0).max(3).default(3),
  commissionPercent: z.coerce.number().min(0).max(100).default(0),
  commissionRate: z
    .string()
    .optional()
    .transform((s) => {
      if (!s) return null;
      const n = parseFloat(s);
      return isNaN(n) || n <= 0 ? null : n;
    }),
  tdsPercent: z.coerce.number().min(0).max(100).default(0),
  password: optionalString,
});

export type DoctorInput = z.output<typeof doctorSchema>;

// ── Helpers ──────────────────────────────────────────────────────────

/** Extract and validate form data against a Zod schema. Returns parsed data or throws user-friendly error. */
export function parseFormData<T extends z.ZodType>(
  schema: T,
  formData: FormData
): z.output<T> {
  const raw = Object.fromEntries(formData.entries());
  const result = schema.safeParse(raw);
  if (!result.success) {
    const firstError = result.error.issues[0];
    throw new Error(firstError?.message || "Invalid form data");
  }
  return result.data;
}
