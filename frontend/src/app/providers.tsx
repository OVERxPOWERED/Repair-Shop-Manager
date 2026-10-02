"use client";

import { IntlProvider } from "@/i18n/IntlProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return <IntlProvider>{children}</IntlProvider>;
}
