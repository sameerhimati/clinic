/** Server action utilities — safe error handling for user-facing actions */

import { Prisma } from "@prisma/client";

/**
 * Convert internal errors to user-safe messages.
 * Prisma constraint violations, DB errors, etc. get mapped to friendly text.
 * Intentional user errors (thrown with `new Error("...")`) pass through as-is.
 */
export function toUserError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return "A record with this value already exists. Please try again.";
      case "P2003":
        return "This record is referenced by other data and cannot be modified.";
      case "P2025":
        return "Record not found. It may have been deleted.";
      default:
        return "A database error occurred. Please try again.";
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return "Invalid data submitted. Please check your inputs.";
  }

  if (error instanceof Error) {
    // Intentional user-facing errors pass through
    return error.message;
  }

  return "Something went wrong. Please try again.";
}
