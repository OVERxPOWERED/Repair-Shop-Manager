export const locales = ["en", "hi", "hi-Latn"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
/** Intl formatting locale per UI locale (hi-Latn formats like en-IN). */
export const intlLocale: Record<Locale, string> = { en: "en-IN", hi: "hi-IN", "hi-Latn": "en-IN" };
export const localeLabels: Record<Locale, string> = { en: "English", hi: "हिन्दी", "hi-Latn": "Hinglish" };
