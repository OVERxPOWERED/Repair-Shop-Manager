import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/store";

export type ReportsSummary = {
  range: {
    from: string;
    to: string;
    days: number;
  };
  jobs: {
    received: number;
    delivered: number;
    by_status: Record<string, number>;
  };
  collections: {
    total_paise: number;
    by_mode: {
      cash: number;
      upi: number;
      card: number;
      bank: number;
    };
    refunds_paise: number;
  };
  revenue: {
    invoiced_paise: number;
    credit_notes_paise: number;
    net_paise: number;
  };
  profit?: {
    parts_cost_paise: number;
    gross_profit_paise: number;
  };
};

export function useReportsSummary(from: string, to: string) {
  const shopId = useAuthStore((s) => s.shopId);
  return useQuery({
    queryKey: ["reports", "summary", shopId, from, to],
    queryFn: () => api<ReportsSummary>(`/reports/summary/?from=${from}&to=${to}`),
    enabled: Boolean(shopId && from && to),
  });
}
