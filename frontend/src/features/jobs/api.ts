import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiList } from "@/lib/api/client";
import { env } from "@/lib/env";
import { useAuthStore } from "@/lib/auth/store";
import { useLocaleStore } from "@/i18n/store";

export type JobStatus =
  | "received"
  | "diagnosing"
  | "awaiting_approval"
  | "awaiting_parts"
  | "in_repair"
  | "repaired"
  | "ready_for_pickup"
  | "delivered"
  | "cancelled"
  | "returned_unrepaired";

export type JobPriority = "low" | "normal" | "urgent";

export type JobPhoto = {
  id: string;
  kind: "before" | "after" | "damage" | "other";
  file_key: string;
  url: string;
  caption: string;
  size_bytes: number;
  width: number;
  height: number;
  taken_by_name: string | null;
  created_at: string;
};

export type Job = {
  id: string;
  job_no: number;
  kind: "full" | "quick" | "rough";
  customer: {
    id: string;
    name: string;
    phone: string;
    phone_masked: boolean;
  };
  device: {
    id: string;
    category: string;
    brand_id?: string;
    brand_name: string;
    brand_text?: string;
    model: string;
    color: string;
    identifiers: {
      id?: string;
      type: "imei1" | "imei2" | "serial" | "meid";
      value: string;
      captured_via?: "manual" | "barcode" | "ocr";
      is_valid_luhn?: boolean;
    }[];
  };
  assigned_to: {
    id: string;
    display_name: string;
  } | null;
  status: JobStatus;
  priority: JobPriority;
  source: string;
  fault_description: string;
  device_condition: string;
  condition_tags: string[];
  lock_type: "none" | "pin" | "pattern" | "password";
  is_locked: boolean;
  estimate_paise: number;
  expected_date: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  reopened_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  accessories?: { id: string; name: string }[];
  photos?: JobPhoto[];
};

export type JobCreatePayload = {
  customer_id?: string;
  new_customer?: {
    name: string;
    phone?: string;
    alt_phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    preferred_locale?: string;
    whatsapp_opt_in?: boolean;
    sms_opt_in?: boolean;
  };
  device_id?: string;
  new_device?: {
    category: string;
    brand_id?: string;
    brand_text?: string;
    model: string;
    color?: string;
    identifiers?: {
      type: "imei1" | "imei2" | "serial" | "meid";
      value: string;
      captured_via?: "manual" | "barcode" | "ocr";
      confirm_invalid?: boolean;
    }[];
  };
  fault_description: string;
  condition_tags?: string[];
  device_condition?: string;
  accessories?: string[];
  lock_type?: "none" | "pin" | "pattern" | "password";
  lock_value?: string;
  estimate_paise?: number;
  expected_date?: string | null;
  assigned_to_id?: string | null;
  internal_note?: string;
  priority?: JobPriority;
  kind?: "full" | "quick" | "rough";
};

export type AccessoryOption = {
  id: string;
  name: string;
  is_default: boolean;
};

export const jobKeys = {
  all: ["jobs"] as const,
  lists: () => [...jobKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...jobKeys.lists(), filters] as const,
  details: () => [...jobKeys.all, "detail"] as const,
  detail: (id: string | null) => [...jobKeys.details(), id] as const,
  photos: (id: string) => [...jobKeys.detail(id), "photos"] as const,
  accessories: ["accessory-options"] as const,
};

export function useAccessoryOptions() {
  const shopId = useAuthStore((s) => s.shopId);
  return useQuery({
    queryKey: [...jobKeys.accessories, shopId],
    queryFn: async () => {
      const res = await apiList<AccessoryOption>("/accessory-options/");
      return res.items;
    },
    enabled: Boolean(shopId),
  });
}

export function useJob(jobId: string | null) {
  const shopId = useAuthStore((s) => s.shopId);
  return useQuery({
    queryKey: jobKeys.detail(jobId),
    queryFn: () => api<Job>(`/jobs/${jobId}/`),
    enabled: Boolean(shopId && jobId),
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: { body: JobCreatePayload; idempotencyKey?: string }) =>
      api<Job>("/jobs/", {
        method: "POST",
        body,
        idempotencyKey,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: jobKeys.lists() });
    },
  });
}

export async function uploadJobPhotoDirect(
  jobId: string,
  photo: { blob: Blob; kind: string; caption?: string },
  idempotencyKey?: string
): Promise<JobPhoto> {
  const token = useAuthStore.getState().tokens?.access;
  const shopId = useAuthStore.getState().shopId;
  const locale = useLocaleStore.getState().locale;

  const formData = new FormData();
  formData.append("file", photo.blob, "photo.jpg");
  formData.append("kind", photo.kind);
  if (photo.caption) {
    formData.append("caption", photo.caption);
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Accept-Language": locale,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (shopId) headers["X-Shop-Id"] = shopId;
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const res = await fetch(`${env.apiBaseUrl}/jobs/${jobId}/photos/`, {
    method: "POST",
    headers,
    body: formData,
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const err = json?.error;
    throw new Error(err?.message || `Photo upload failed with status ${res.status}`);
  }
  return json?.data as JobPhoto;
}
