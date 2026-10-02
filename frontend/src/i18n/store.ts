import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultLocale, type Locale } from "./config";

type LocaleState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: defaultLocale,
      setLocale: (locale) => set({ locale }),
    }),
    { name: "fixpro.locale" }
  )
);
