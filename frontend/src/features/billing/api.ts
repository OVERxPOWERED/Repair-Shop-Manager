import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, newIdempotencyKey } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/store";

export type JobLineItemKind = "part" | "labour" | "other";

export type JobLineItem = {
  id: string;
  kind: JobLineItemKind;
  description: string;
  quantity: string | number;
  unit_price_paise: number;
  unit_cost_paise?: number;
  discount_paise: number;
  line_total_paise: number;
  version: number;
  created_at: string;
  updated_at: string;
};

export type JobLineItemInput = {
  kind: JobLineItemKind;
  description: string;
  quantity?: number | string;
  unit_price_paise: number;
  unit_cost_paise?: number;
  discount_paise?: number;
};

export type PaymentMode = "cash" | "upi" | "card" | "bank";
export type PaymentDirection = "in" | "out";

export type Payment = {
  id: string;
  job_id: string | null;
  customer_id: string | null;
  customer_name?: string;
  direction: PaymentDirection;
  mode: PaymentMode;
  amount_paise: number;
  reference: string;
  received_by_id: string;
  received_by_name?: string;
  received_at: string;
  refunds_payment_id?: string | null;
  notes: string;
  created_at: string;
};

export type JobPaymentsSummary = {
  items: Payment[];
  paid_paise: number;
  balance_paise: number;
};

export function useJobLineItems(jobId: string | undefined) {
  return useQuery({
    queryKey: ["jobs", jobId, "line-items"],
    queryFn: () => api<JobLineItem[]>(`/jobs/${jobId}/line-items/`),
    enabled: Boolean(jobId),
  });
}

export function useCreateLineItem(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: JobLineItemInput) =>
      api<JobLineItem>(`/jobs/${jobId}/line-items/`, {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "line-items"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useUpdateLineItem(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      version,
      data,
    }: {
      itemId: string;
      version: number;
      data: Partial<JobLineItemInput>;
    }) =>
      api<JobLineItem>(`/jobs/${jobId}/line-items/${itemId}/`, {
        method: "PATCH",
        body: data,
        ifMatch: version,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "line-items"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useDeleteLineItem(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      api<void>(`/jobs/${jobId}/line-items/${itemId}/`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "line-items"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useJobPayments(jobId: string | undefined) {
  return useQuery({
    queryKey: ["jobs", jobId, "payments"],
    queryFn: () => api<JobPaymentsSummary>(`/jobs/${jobId}/payments/`),
    enabled: Boolean(jobId),
  });
}

export function useRecordPayment(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      mode: PaymentMode;
      amount_paise: number;
      reference?: string;
      notes?: string;
      idempotencyKey?: string;
    }) => {
      const { idempotencyKey = newIdempotencyKey(), ...body } = data;
      return api<Payment>(`/jobs/${jobId}/payments/`, {
        method: "POST",
        body,
        idempotencyKey,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId, "payments"] });
      queryClient.invalidateQueries({ queryKey: ["jobs", jobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useRefundPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      paymentId,
      amount_paise,
      reason,
      idempotencyKey = newIdempotencyKey(),
    }: {
      paymentId: string;
      amount_paise: number;
      reason: string;
      idempotencyKey?: string;
    }) =>
      api<Payment>(`/payments/${paymentId}/refund/`, {
        method: "POST",
        body: { amount_paise, reason },
        idempotencyKey,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export type CurrentShopDetails = {
  id: string;
  name: string;
  upi_id?: string | null;
  phone?: string;
  gst_enabled: boolean;
};

export function useCurrentShopDetails() {
  const shopId = useAuthStore((s) => s.shopId);
  return useQuery({
    queryKey: ["shops", "current", shopId],
    queryFn: () => api<CurrentShopDetails>("/shops/current/"),
    enabled: Boolean(shopId),
  });
}

