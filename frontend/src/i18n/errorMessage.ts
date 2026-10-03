import { ApiError } from "@/lib/api/client";

/**
 * Extracts a user-displayable error string from an unknown error,
 * prioritizing ApiError details and field errors.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.fields && Object.keys(err.fields).length > 0) {
      const firstField = Object.keys(err.fields)[0];
      const msgs = err.fields[firstField];
      if (Array.isArray(msgs) && msgs.length > 0) {
        return `${msgs[0]}`;
      }
    }
    return err.message || "An error occurred";
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "An unexpected error occurred";
}
