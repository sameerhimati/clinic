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
