import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth/store";

export type ShopSettings = {
  id: string;
  organization_id: string;
  name: string;
  shop_type: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  pincode: string;
  state_code: string;
  timezone: string;
  default_locale: string;
  gst_enabled: boolean;
  gstin: string | null;
  registration_type: string;
  upi_id: string | null;
  invoice_prefix: string;
  round_off_enabled: boolean;
  default_terms: string;
  logo_url: string | null;
  lock_order_after_delivery: boolean;
  engineers_see_assigned_only: boolean;
  mask_phone_for_engineers: boolean;
  default_warranty_days: number;
  tracking_enabled: boolean;
  tracking_expiry_days: number;
  auto_sms_events: string[];
  version: number;
  created_at: string;
  updated_at: string;
};

export type ShopBrand = {
  id: string;
  device_category: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  version: number;
  created_at: string;
  updated_at: string;
};

export type AccessoryOption = {
  id: string;
  name: string;
  is_default: boolean;
  sort_order: number;
  version: number;
  created_at: string;
  updated_at: string;
};

export type MessageTemplate = {
  id: string;
  shop: string | null;
  key: string;
  channel: "sms" | "whatsapp";
  locale: string;
  body: string;
  dlt_template_id: string | null;
  wa_template_name: string | null;
  is_active: boolean;
};

export function useShopSettings() {
  const shopId = useAuthStore((s) => s.shopId);
  return useQuery({
    queryKey: ["shops", "current", shopId],
    queryFn: () => api<ShopSettings>("/shops/current/"),
    enabled: Boolean(shopId),
  });
}

export function useUpdateShopSettings() {
  const queryClient = useQueryClient();
  const shopId = useAuthStore((s) => s.shopId);
  return useMutation({
    mutationFn: ({ data, version }: { data: Partial<ShopSettings>; version: number }) =>
      api<ShopSettings>("/shops/current/", {
        method: "PATCH",
        body: data,
        ifMatch: version,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["shops", "current", shopId], updated);
      queryClient.invalidateQueries({ queryKey: ["shops", "current"] });
    },
  });
}

export function useUploadShopLogo() {
  const queryClient = useQueryClient();
  const shopId = useAuthStore((s) => s.shopId);
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return api<ShopSettings>("/shops/current/logo/", {
        method: "POST",
        body: fd,
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["shops", "current", shopId], updated);
      queryClient.invalidateQueries({ queryKey: ["shops", "current"] });
    },
  });
}

export function useBrands(category?: string) {
  const shopId = useAuthStore((s) => s.shopId);
  const path = category && category !== "all" ? `/brands/?device_category=${category}` : "/brands/";
  return useQuery({
    queryKey: ["brands", shopId, category],
    queryFn: () => api<ShopBrand[]>(path),
    enabled: Boolean(shopId),
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { device_category: string; name: string; is_active?: boolean; sort_order?: number }) =>
      api<ShopBrand>("/brands/", {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
    },
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ShopBrand> }) =>
      api<ShopBrand>(`/brands/${id}/`, {
        method: "PATCH",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
    },
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api(`/brands/${id}/`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
    },
  });
}

export function useAccessories() {
  const shopId = useAuthStore((s) => s.shopId);
  return useQuery({
    queryKey: ["accessory-options", shopId],
    queryFn: () => api<AccessoryOption[]>("/accessory-options/"),
    enabled: Boolean(shopId),
  });
}

export function useCreateAccessory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; is_default?: boolean; sort_order?: number }) =>
      api<AccessoryOption>("/accessory-options/", {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accessory-options"] });
    },
  });
}

export function useUpdateAccessory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AccessoryOption> }) =>
      api<AccessoryOption>(`/accessory-options/${id}/`, {
        method: "PATCH",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accessory-options"] });
    },
  });
}

export function useDeleteAccessory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api(`/accessory-options/${id}/`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accessory-options"] });
    },
  });
}

export function useMessageTemplates() {
  const shopId = useAuthStore((s) => s.shopId);
  return useQuery({
    queryKey: ["message-templates", shopId],
    queryFn: () => api<MessageTemplate[]>("/message-templates/"),
    enabled: Boolean(shopId),
  });
}

export function useUpdateMessageTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { body?: string; is_active?: boolean; wa_template_name?: string } }) =>
      api<MessageTemplate>(`/message-templates/${id}/`, {
        method: "PATCH",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
    },
  });
}
