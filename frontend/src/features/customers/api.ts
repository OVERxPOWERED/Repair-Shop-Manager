import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiList, newIdempotencyKey } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/store";

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  alt_phone: string;
  email: string;
  address: string;
  notes: string;
  preferred_locale: string;
  whatsapp_opt_in: boolean;
  sms_opt_in: boolean;
  last_job_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  phone_masked: boolean;
};

export type CustomerInput = {
  name: string;
  phone?: string | null;
  alt_phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  preferred_locale?: string;
  whatsapp_opt_in?: boolean;
  sms_opt_in?: boolean;
};

export function useCustomers(q?: string) {
  const shopId = useAuthStore((s) => s.shopId);
  return useInfiniteQuery({
    queryKey: ["customers", shopId, q ?? ""],
    queryFn: async ({ pageParam = 1 }) => {
      const qParam = q && q.trim() ? `&q=${encodeURIComponent(q.trim())}` : "";
      return apiList<Customer>(`/customers/?page=${pageParam}${qParam}`);
    },
    getNextPageParam: (lastPage) => {
      return lastPage.meta.next ? lastPage.meta.page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: Boolean(shopId),
  });
}

export function useCustomer(id?: string | null) {
  const shopId = useAuthStore((s) => s.shopId);
  return useQuery({
    queryKey: ["customer", shopId, id],
    queryFn: async () => {
      return api<Customer>(`/customers/${id}/`);
    },
    enabled: Boolean(shopId && id),
  });
}

export function useCustomerByPhone(phone?: string | null) {
  const shopId = useAuthStore((s) => s.shopId);
  const cleanPhone = phone?.trim();
  return useQuery({
    queryKey: ["customer-by-phone", shopId, cleanPhone],
    queryFn: async () => {
      const res = await apiList<Customer>(`/customers/?phone=${encodeURIComponent(cleanPhone!)}`);
      return res.items[0] ?? null;
    },
    enabled: Boolean(shopId && cleanPhone && cleanPhone.length >= 10),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const shopId = useAuthStore((s) => s.shopId);
  return useMutation({
    mutationFn: async (body: CustomerInput) => {
      return api<Customer>("/customers/", {
        method: "POST",
        body,
        idempotencyKey: newIdempotencyKey(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", shopId] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const shopId = useAuthStore((s) => s.shopId);
  return useMutation({
    mutationFn: async ({ id, version, ...body }: CustomerInput & { id: string; version: number }) => {
      return api<Customer>(`/customers/${id}/`, {
        method: "PATCH",
        body,
        ifMatch: version,
      });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["customers", shopId] });
      queryClient.invalidateQueries({ queryKey: ["customer", shopId, updated.id] });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const shopId = useAuthStore((s) => s.shopId);
  return useMutation({
    mutationFn: async (id: string) => {
      return api<null>(`/customers/${id}/`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", shopId] });
    },
  });
}
