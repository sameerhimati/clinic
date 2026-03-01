/** File upload constants — shared between client validation and server API route */

export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const FILE_TYPE_ERROR = "File type not allowed. Use JPG, PNG, GIF, WebP, or PDF.";
export const FILE_SIZE_ERROR = "File too large. Max 10MB.";

/** File categories for organizing patient files */
export const FILE_CATEGORIES = {
  XRAY: { label: "X-ray", color: "bg-blue-100 text-blue-800" },
  SCAN: { label: "Scan", color: "bg-purple-100 text-purple-800" },
  PHOTO: { label: "Photo", color: "bg-green-100 text-green-800" },
  DOCUMENT: { label: "Document", color: "bg-amber-100 text-amber-800" },
  OTHER: { label: "Other", color: "bg-gray-100 text-gray-700" },
} as const;

export type FileCategory = keyof typeof FILE_CATEGORIES;

/** Auto-detect category from filename */
export function detectCategory(fileName: string): FileCategory {
  const lower = fileName.toLowerCase();

  // X-ray patterns
  if (/x[-_]?ray|opg|panoramic|bitewing|periapical|cephalometric|cbct/i.test(lower)) {
    return "XRAY";
  }

  // Scan patterns
  if (/scan|scanned|record/i.test(lower)) {
    return "SCAN";
  }

  // PDF → document
  if (lower.endsWith(".pdf")) {
    return "DOCUMENT";
  }

  // Image extensions → photo
  if (/\.(jpg|jpeg|png|gif|webp)$/.test(lower)) {
    return "PHOTO";
  }

  return "OTHER";
}
