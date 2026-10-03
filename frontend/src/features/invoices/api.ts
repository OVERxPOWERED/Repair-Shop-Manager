import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, newIdempotencyKey } from "@/lib/api/client";

export type InvoiceKind = "simple_bill" | "tax_invoice" | "bill_of_supply" | "credit_note";
export type InvoiceStatus = "draft" | "issued" | "cancelled";

export type InvoiceLine = {
  id: string;
  position: number;
  description: string;
  hsn_sac: string;
  quantity: string | number;
  unit_price_paise: number;
  discount_paise: number;
  tax_inclusive: boolean;
  tax_rate_bp: number;
  taxable_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  line_total_paise: number;
};

export type InvoiceLineInput = {
  description: string;
  hsn_sac?: string;
  quantity?: number | string;
  unit_price_paise: number;
  discount_paise?: number;
  tax_inclusive?: boolean;
  tax_rate_bp?: number;
};

export type Invoice = {
  id: string;
  job_id: string | null;
  customer_id: string | null;
  kind: InvoiceKind;
  status: InvoiceStatus;
  series_id: string | null;
  number: number | null;
  number_display: string;
  issue_date: string | null;
  original_invoice_id: string | null;
  place_of_supply_state: string;
  customer_gstin: string;
  subtotal_paise: number;
  discount_paise: number;
  taxable_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  round_off_paise: number;
  total_paise: number;
  amount_paid_paise: number;
  balance_paise: number;
  shop_snapshot: Record<string, unknown>;
  customer_snapshot: Record<string, unknown>;
  pdf_key: string;
  notes: string;
  terms: string;
  issued_by_id: string | null;
  issued_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string;
  lines: InvoiceLine[];
  version: number;
  created_at: string;
  updated_at: string;
};

export type UpdateDraftInvoiceInput = {
  customer_gstin?: string;
  place_of_supply_state?: string;
  notes?: string;
  terms?: string;
  lines?: InvoiceLineInput[];
};

export type InvoiceQueryParams = {
  status?: string;
  kind?: InvoiceKind;
  from?: string;
  to?: string;
  q?: string;
  job_id?: string;
};

export function useInvoice(invoiceId: string | undefined | null) {
  return useQuery({
    queryKey: ["invoices", invoiceId],
    queryFn: () => api<Invoice>(`/invoices/${invoiceId}/`),
    enabled: Boolean(invoiceId),
  });
}

export function useInvoices(params: InvoiceQueryParams = {}) {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.set("status", params.status);
  if (params.kind) queryParams.set("kind", params.kind);
  if (params.from) queryParams.set("from", params.from);
  if (params.to) queryParams.set("to", params.to);
  if (params.q) queryParams.set("q", params.q);
  if (params.job_id) queryParams.set("job_id", params.job_id);

  const qs = queryParams.toString();
  const endpoint = qs ? `/invoices/?${qs}` : "/invoices/";

  return useQuery({
    queryKey: ["invoices", params],
    queryFn: () => api<Invoice[]>(endpoint),
  });
}

export function useJobInvoice(jobId: string | undefined | null) {
  return useQuery({
    queryKey: ["invoices", "by-job", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const list = await api<Invoice[]>(`/invoices/?job_id=${jobId}`);
      // Find live invoice (draft or issued, non-credit-note)
      return list.find((inv) => inv.status !== "cancelled" && inv.kind !== "credit_note") ?? null;
    },
    enabled: Boolean(jobId),
  });
}

export function useCreateDraftFromJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) =>
      api<Invoice>(`/jobs/${jobId}/invoice/`, {
        method: "POST",
      }),
    onSuccess: (data, jobId) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices", "by-job", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId] });
    },
  });
}

export function useUpdateDraftInvoice(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateDraftInvoiceInput) =>
      api<Invoice>(`/invoices/${invoiceId}/`, {
        method: "PATCH",
        body: data,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["invoices", invoiceId], updated);
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      if (updated.job_id) {
        queryClient.invalidateQueries({ queryKey: ["invoices", "by-job", updated.job_id] });
        queryClient.invalidateQueries({ queryKey: ["jobs", updated.job_id] });
      }
    },
  });
}

export function useIssueInvoice(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables?: { idempotencyKey?: string }) =>
      api<Invoice>(`/invoices/${invoiceId}/issue/`, {
        method: "POST",
        idempotencyKey: variables?.idempotencyKey ?? newIdempotencyKey(),
      }),
    onSuccess: (issued) => {
      queryClient.setQueryData(["invoices", invoiceId], issued);
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      if (issued.job_id) {
        queryClient.invalidateQueries({ queryKey: ["invoices", "by-job", issued.job_id] });
        queryClient.invalidateQueries({ queryKey: ["jobs", issued.job_id] });
      }
    },
  });
}

export function useCancelInvoice(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reason }: { reason: string }) =>
      api<{ invoice: Invoice; credit_note: Invoice }>(`/invoices/${invoiceId}/cancel/`, {
        method: "POST",
        body: { reason },
      }),
    onSuccess: (res) => {
      queryClient.setQueryData(["invoices", invoiceId], res.invoice);
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      if (res.invoice.job_id) {
        queryClient.invalidateQueries({ queryKey: ["invoices", "by-job", res.invoice.job_id] });
        queryClient.invalidateQueries({ queryKey: ["jobs", res.invoice.job_id] });
      }
    },
  });
}

export function useDeleteDraftInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) =>
      api<void>(`/invoices/${invoiceId}/`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}
