"use client";

import { NextIntlClientProvider } from "next-intl";
import { useEffect } from "react";
import en from "./messages/en.json";
import hi from "./messages/hi.json";
import hiLatn from "./messages/hi-Latn.json";
import { useLocaleStore } from "./store";

const messages = { en, hi, "hi-Latn": hiLatn } as const;

export function IntlProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocaleStore((s) => s.locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="Asia/Kolkata">
      {children}
    </NextIntlClientProvider>
  );
}
