import type { useTranslations } from "next-intl";
import { ApiError } from "./client";

export function errorMessage(t: ReturnType<typeof useTranslations>, err: unknown): string {
  if (err instanceof ApiError) {
    const key = `errors.${err.code}`;
    return t.has(key) ? t(key) : err.message;
  }
  return t("errors.generic");
}
