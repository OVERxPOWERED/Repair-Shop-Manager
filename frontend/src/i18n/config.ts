export const locales = ["en", "hi", "hi-Latn"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
/** Intl formatting locale per UI locale (hi-Latn formats like en-IN). */
export const intlLocale: Record<Locale, string> = { en: "en-IN", hi: "hi-IN", "hi-Latn": "en-IN" };
export const localeLabels: Record<Locale, string> = { en: "English", hi: "हिन्दी", "hi-Latn": "Hinglish" };

/**
 * Maps an API error code to an i18n translated error message.
 * Falls back to errors.generic or the code string itself.
 */
export function errorMessage(
  t: (key: string) => string,
  code: string,
  fallback = "generic"
): string {
  try {
    const msg = t(code);
    if (msg && msg !== code) return msg;
  } catch {
    // key missing or translation error
  }
  try {
    return t(fallback);
  } catch {
    return code;
  }
}
