"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "@/i18n/IntlProvider";
import { SessionBoot } from "@/lib/auth/SessionBoot";
import { Toaster } from "@/components/ui/sonner";
import { ApiError } from "@/lib/api/client";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (count, err) =>
              !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <IntlProvider>
        <SessionBoot>
          {children}
          <Toaster />
        </SessionBoot>
      </IntlProvider>
    </QueryClientProvider>
  );
}
