import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiList, newIdempotencyKey } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/store";

export type DeviceIdentifier = {
  id?: string;
  type: "imei1" | "imei2" | "serial" | "meid";
  value: string;
  luhn_valid?: boolean | null;
  captured_via?: "manual" | "barcode" | "ocr";
  confirm_invalid?: boolean;
};

export type Device = {
  id: string;
  customer_id: string;
  category: "mobile" | "laptop" | "tv" | "appliance" | "other";
  brand_id?: string | null;
  brand_name?: string;
  brand_text?: string;
  model: string;
  color?: string;
  notes?: string;
  identifiers: DeviceIdentifier[];
  version: number;
  created_at: string;
  updated_at: string;
};

export type DeviceInput = {
  customer_id: string;
  category: "mobile" | "laptop" | "tv" | "appliance" | "other";
  brand_id?: string | null;
  brand_text?: string;
  model: string;
  color?: string;
  notes?: string;
  identifiers?: DeviceIdentifier[];
};

export type ShopBrand = {
  id: string;
  device_category: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  version: number;
};

export type ImeiLookupResult = {
  value: string;
  luhn_valid: boolean | null;
  matches: Array<{
    device_id: string;
    customer_id: string;
    customer_name: string;
    model: string;
    last_job_no: string | null;
    last_job_id?: string | null;
  }>;
};

export function useDevices(customerId?: string | null) {
  const shopId = useAuthStore((s) => s.shopId);
  return useQuery({
    queryKey: ["devices", shopId, customerId],
    queryFn: async () => {
      const res = await apiList<Device>(`/devices/?customer=${customerId}`);
      return res.items;
    },
    enabled: Boolean(shopId && customerId),
  });
}

export function useBrands(category?: string) {
  const shopId = useAuthStore((s) => s.shopId);
  return useQuery({
    queryKey: ["brands", shopId, category],
    queryFn: async () => {
      const catParam = category ? `&device_category=${encodeURIComponent(category)}` : "";
      const res = await apiList<ShopBrand>(`/brands/?is_active=true&page_size=100${catParam}`);
      return res.items;
    },
    enabled: Boolean(shopId),
  });
}

export function useCreateDevice() {
  const queryClient = useQueryClient();
  const shopId = useAuthStore((s) => s.shopId);
  return useMutation({
    mutationFn: async (body: DeviceInput) => {
      return api<Device>("/devices/", {
        method: "POST",
        body,
        idempotencyKey: newIdempotencyKey(),
      });
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["devices", shopId, created.customer_id] });
    },
  });
}

export function useUpdateDevice() {
  const queryClient = useQueryClient();
  const shopId = useAuthStore((s) => s.shopId);
  return useMutation({
    mutationFn: async ({ id, version, ...body }: DeviceInput & { id: string; version: number }) => {
      return api<Device>(`/devices/${id}/`, {
        method: "PATCH",
        body,
        ifMatch: version,
      });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["devices", shopId, updated.customer_id] });
    },
  });
}

export function useDeleteDevice() {
  const queryClient = useQueryClient();
  const shopId = useAuthStore((s) => s.shopId);
  return useMutation({
    mutationFn: async ({ id, customerId }: { id: string; customerId: string }) => {
      await api<null>(`/devices/${id}/`, {
        method: "DELETE",
      });
      return customerId;
    },
    onSuccess: (customerId) => {
      queryClient.invalidateQueries({ queryKey: ["devices", shopId, customerId] });
    },
  });
}

export function useImeiLookup(value?: string | null) {
  const shopId = useAuthStore((s) => s.shopId);
  const clean = value?.replace(/[\s-]/g, "").toUpperCase();
  return useQuery({
    queryKey: ["imei-lookup", shopId, clean],
    queryFn: async () => {
      return api<ImeiLookupResult>(`/devices/imei-lookup/?value=${encodeURIComponent(clean!)}`);
    },
    enabled: Boolean(shopId && clean && clean.length === 15),
  });
}
