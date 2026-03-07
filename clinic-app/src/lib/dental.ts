/** FDI tooth number utilities and dental constants */

const TOOTH_NAMES: Record<number, string> = {
  // Upper Right (Q1)
  11: "Upper Right Central Incisor",
  12: "Upper Right Lateral Incisor",
  13: "Upper Right Canine",
  14: "Upper Right First Premolar",
  15: "Upper Right Second Premolar",
  16: "Upper Right First Molar",
  17: "Upper Right Second Molar",
  18: "Upper Right Third Molar",
  // Upper Left (Q2)
  21: "Upper Left Central Incisor",
  22: "Upper Left Lateral Incisor",
  23: "Upper Left Canine",
  24: "Upper Left First Premolar",
  25: "Upper Left Second Premolar",
  26: "Upper Left First Molar",
  27: "Upper Left Second Molar",
  28: "Upper Left Third Molar",
  // Lower Left (Q3)
  31: "Lower Left Central Incisor",
  32: "Lower Left Lateral Incisor",
  33: "Lower Left Canine",
  34: "Lower Left First Premolar",
  35: "Lower Left Second Premolar",
  36: "Lower Left First Molar",
  37: "Lower Left Second Molar",
  38: "Lower Left Third Molar",
  // Lower Right (Q4)
  41: "Lower Right Central Incisor",
  42: "Lower Right Lateral Incisor",
  43: "Lower Right Canine",
  44: "Lower Right First Premolar",
  45: "Lower Right Second Premolar",
  46: "Lower Right First Molar",
  47: "Lower Right Second Molar",
  48: "Lower Right Third Molar",
};

export function getToothName(toothNumber: number): string {
  return TOOTH_NAMES[toothNumber] || `Tooth ${toothNumber}`;
}

export function getToothShortName(toothNumber: number): string {
  const full = TOOTH_NAMES[toothNumber];
  if (!full) return `#${toothNumber}`;
  // e.g. "Upper Right First Molar" → "UR First Molar"
  const parts = full.split(" ");
  const vertical = parts[0][0]; // U or L
  const side = parts[1][0]; // R or L
  return `${vertical}${side} ${parts.slice(2).join(" ")}`;
}

export const TOOTH_STATUSES = {
  HEALTHY: { label: "Healthy", color: "#22c55e" },
  CARIES: { label: "Caries", color: "#ef4444" },
  FILLED: { label: "Filled", color: "#3b82f6" },
  CROWNED: { label: "Crowned", color: "#2563eb" },
  MISSING: { label: "Missing", color: "#6b7280" },
  RCT: { label: "RCT", color: "#6366f1" },
  IMPLANT: { label: "Implant", color: "#4f46e5" },
  EXTRACTED: { label: "Extracted", color: "#9ca3af" },
} as const;

export type ToothStatusKey = keyof typeof TOOTH_STATUSES;

export function getStatusLabel(status: string): string {
  return TOOTH_STATUSES[status as ToothStatusKey]?.label || status;
}

export function getStatusColor(status: string): string {
  return TOOTH_STATUSES[status as ToothStatusKey]?.color || "#6b7280";
}

/** Visual indicator symbols for tooth statuses on the chart */
export const TOOTH_STATUS_INDICATORS: Record<string, string> = {
  CARIES: "\u25CF",
  FILLED: "\u25CF",
  CROWNED: "\u265B",
  MISSING: "\u2715",
  RCT: "R",
  IMPLANT: "\u2699",
  EXTRACTED: "\u2715",
};

export function isValidToothNumber(n: number): boolean {
  return n in TOOTH_NAMES;
}

/** All 32 valid FDI tooth numbers */
export const ALL_TEETH = Object.keys(TOOTH_NAMES).map(Number);

/** Infer the resulting tooth status from an operation name */
export function inferToothStatus(operationName: string): ToothStatusKey | null {
  const name = operationName.toUpperCase();
  if (name.includes("RCT") || name.includes("ROOT CANAL")) return "RCT";
  if (name.includes("EXTRACT")) return "EXTRACTED";
  if (name.includes("CROWN") || name.includes("CAP")) return "CROWNED";
  if (name.includes("IMPLANT")) return "IMPLANT";
  if (name.includes("FILLING") || name.includes("RESTORATION") || name.includes("COMPOSITE") || name.includes("CONS.")) return "FILLED";
  return null;
}
