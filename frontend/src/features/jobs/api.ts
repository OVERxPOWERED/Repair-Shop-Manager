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
    preferred_locale?: string;
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
  total_paise?: number;
  cost_paise?: number;
  paid_paise?: number;
  balance_paise?: number;
  tracking_token?: string;
  tracking_url?: string;
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
  advance_paise?: number;
  advance_mode?: "cash" | "upi" | "card" | "bank";
  advance_reference?: string;
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

export type DashboardSummary = {
  received_today: number;
  pending: number;
  in_progress: number;
  repaired: number;
  delivered_today: number;
  collected_today_paise?: number;
};

export type JobCounts = {
  all: number;
  pending: number;
  in_progress: number;
  repaired: number;
  delivered: number;
  closed: number;
};

export type JobStatusHistoryItem = {
  id: string;
  from_status: JobStatus;
  to_status: JobStatus;
  note: string;
  cancel_reason: string;
  changed_by_name: string;
  created_at: string;
};

export type JobTransitions = {
  allowed: JobStatus[];
};

export type JobNote = {
  id: string;
  content: string;
  is_internal: boolean;
  author_name: string;
  created_at: string;
};

export const jobKeys = {
  all: ["jobs"] as const,
  lists: () => [...jobKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...jobKeys.lists(), filters] as const,
  counts: () => [...jobKeys.all, "counts"] as const,
  summary: (date: string) => [...jobKeys.all, "summary", date] as const,
  details: () => [...jobKeys.all, "detail"] as const,
  detail: (id: string | null) => [...jobKeys.details(), id] as const,
  transitions: (id: string | null) => [...jobKeys.detail(id), "transitions"] as const,
  history: (id: string | null) => [...jobKeys.detail(id), "history"] as const,
  notes: (id: string | null) => [...jobKeys.detail(id), "notes"] as const,
  photos: (id: string) => [...jobKeys.detail(id), "photos"] as const,
  accessories: ["accessory-options"] as const,
};

function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      sp.set(k, String(v));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function useDashboardSummary(date?: string) {
  const shopId = useAuthStore((s) => s.shopId);
  const targetDate = date || new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: [...jobKeys.summary(targetDate), shopId],
    queryFn: () => api<DashboardSummary>(`/dashboard/summary/?date=${targetDate}`),
    enabled: Boolean(shopId),
    staleTime: 15_000,
  });
}

export function useJobCounts() {
  const shopId = useAuthStore((s) => s.shopId);
  return useQuery({
    queryKey: [...jobKeys.counts(), shopId],
    queryFn: () => api<JobCounts>("/jobs/counts/"),
    enabled: Boolean(shopId),
    staleTime: 15_000,
  });
}

export function useJobs(filters?: Record<string, unknown>) {
  const shopId = useAuthStore((s) => s.shopId);
  return useQuery({
    queryKey: [...jobKeys.list(filters || {}), shopId],
    queryFn: () => apiList<Job>(`/jobs/${buildQueryString(filters)}`),
    enabled: Boolean(shopId),
    staleTime: 10_000,
  });
}

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

export function useJobTransitions(jobId: string | null) {
  const shopId = useAuthStore((s) => s.shopId);
  return useQuery({
    queryKey: jobKeys.transitions(jobId),
    queryFn: () => api<JobTransitions>(`/jobs/${jobId}/transitions/`),
    enabled: Boolean(shopId && jobId),
  });
}

export function useJobHistory(jobId: string | null) {
  const shopId = useAuthStore((s) => s.shopId);
  return useQuery({
    queryKey: jobKeys.history(jobId),
    queryFn: () => api<JobStatusHistoryItem[]>(`/jobs/${jobId}/history/`),
    enabled: Boolean(shopId && jobId),
  });
}

export function useJobNotes(jobId: string | null) {
  const shopId = useAuthStore((s) => s.shopId);
  return useQuery({
    queryKey: jobKeys.notes(jobId),
    queryFn: () => api<JobNote[]>(`/jobs/${jobId}/notes/`),
    enabled: Boolean(shopId && jobId),
  });
}

export function useChangeJobStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      jobId,
      toStatus,
      note,
      cancelReason,
      expectedVersion,
    }: {
      jobId: string;
      toStatus: JobStatus;
      note?: string;
      cancelReason?: string;
      expectedVersion: number;
    }) =>
      api<Job>(`/jobs/${jobId}/status/`, {
        method: "POST",
        body: { to_status: toStatus, note, cancel_reason: cancelReason },
        ifMatch: expectedVersion,
      }),
    onSuccess: (updatedJob) => {
      qc.invalidateQueries({ queryKey: jobKeys.detail(updatedJob.id) });
      qc.invalidateQueries({ queryKey: jobKeys.transitions(updatedJob.id) });
      qc.invalidateQueries({ queryKey: jobKeys.history(updatedJob.id) });
      qc.invalidateQueries({ queryKey: jobKeys.lists() });
      qc.invalidateQueries({ queryKey: jobKeys.counts() });
      qc.invalidateQueries({ queryKey: [...jobKeys.all, "summary"] });
    },
  });
}

export function useReopenJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, reason }: { jobId: string; reason: string }) =>
      api<Job>(`/jobs/${jobId}/reopen/`, {
        method: "POST",
        body: { reason },
      }),
    onSuccess: (updatedJob) => {
      qc.invalidateQueries({ queryKey: jobKeys.detail(updatedJob.id) });
      qc.invalidateQueries({ queryKey: jobKeys.transitions(updatedJob.id) });
      qc.invalidateQueries({ queryKey: jobKeys.history(updatedJob.id) });
      qc.invalidateQueries({ queryKey: jobKeys.lists() });
      qc.invalidateQueries({ queryKey: jobKeys.counts() });
      qc.invalidateQueries({ queryKey: [...jobKeys.all, "summary"] });
    },
  });
}

export function useAssignJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, membershipId }: { jobId: string; membershipId: string | null }) =>
      api<Job>(`/jobs/${jobId}/assign/`, {
        method: "POST",
        body: { membership_id: membershipId },
      }),
    onSuccess: (updatedJob) => {
      qc.invalidateQueries({ queryKey: jobKeys.detail(updatedJob.id) });
      qc.invalidateQueries({ queryKey: jobKeys.lists() });
    },
  });
}

export function useRevealJobLock() {
  return useMutation({
    mutationFn: (jobId: string) =>
      api<{ lock_type: string; lock_value: string }>(`/jobs/${jobId}/lock/`, {
        method: "POST",
      }),
  });
}

export function useAddJobNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      jobId,
      content,
      isInternal,
    }: {
      jobId: string;
      content: string;
      isInternal: boolean;
    }) =>
      api<JobNote>(`/jobs/${jobId}/notes/`, {
        method: "POST",
        body: { content, is_internal: isInternal },
      }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: jobKeys.notes(variables.jobId) });
    },
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      jobId,
      body,
      expectedVersion,
    }: {
      jobId: string;
      body: Partial<JobCreatePayload>;
      expectedVersion: number;
    }) =>
      api<Job>(`/jobs/${jobId}/`, {
        method: "PATCH",
        body,
        ifMatch: expectedVersion,
      }),
    onSuccess: (updatedJob) => {
      qc.invalidateQueries({ queryKey: jobKeys.detail(updatedJob.id) });
      qc.invalidateQueries({ queryKey: jobKeys.lists() });
    },
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
      qc.invalidateQueries({ queryKey: jobKeys.counts() });
      qc.invalidateQueries({ queryKey: [...jobKeys.all, "summary"] });
    },
  });
}

export function useDeleteJobPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, photoId }: { jobId: string; photoId: string }) =>
      api(`/jobs/${jobId}/photos/${photoId}/`, { method: "DELETE" }),
    onSuccess: (_, { jobId }) => {
      qc.invalidateQueries({ queryKey: jobKeys.detail(jobId) });
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
