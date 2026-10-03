import { useLocaleStore } from "@/i18n/store";
import { useAuthStore } from "@/lib/auth/store";
import { useServerWakeStore } from "@/lib/server-wake";
import { env } from "@/lib/env";

export { useServerWakeStore };

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string[]> = {},
    public requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ListMeta = { count: number; page: number; next: string | null; previous: string | null };
export type ListResult<T> = { items: T[]; meta: ListMeta };

type Method = "GET" | "POST" | "PATCH" | "DELETE";
export type RequestOptions = {
  method?: Method;
  body?: unknown;
  auth?: boolean; // default true
  shop?: boolean; // send X-Shop-Id (default true)
  idempotencyKey?: string;
  ifMatch?: number;
  signal?: AbortSignal;
};

type RefreshResult = "ok" | "invalid" | "network";
let refreshing: Promise<RefreshResult> | null = null;

async function doRefresh(): Promise<RefreshResult> {
  const refresh = useAuthStore.getState().tokens?.refresh;
  if (!refresh) return "invalid";
  let res: Response;
  try {
    res = await fetch(`${env.apiBaseUrl}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh }),
    });
  } catch {
    return "network";
  }
  if (!res.ok) return "invalid";
  const { data } = await res.json();
  await useAuthStore.getState().setTokens({ access: data.access, refresh: data.refresh ?? refresh });
  return "ok";
}

/** Single-flight: parallel 401s share one refresh (the server treats a reused refresh token as theft). */
export function refreshTokens(): Promise<RefreshResult> {
  if (!refreshing) refreshing = doRefresh().finally(() => (refreshing = null));
  return refreshing;
}

let activeSlowRequests = 0;

async function doFetch(path: string, opts: RequestOptions, canRetry: boolean): Promise<unknown> {
  const { tokens, shopId } = useAuthStore.getState();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Accept-Language": useLocaleStore.getState().locale,
    "X-App-Version": env.appVersion,
  };
  const isForm = typeof FormData !== "undefined" && opts.body instanceof FormData;
  if (opts.body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  if (opts.auth !== false && tokens?.access) headers.Authorization = `Bearer ${tokens.access}`;
  if (opts.shop !== false && shopId) headers["X-Shop-Id"] = shopId;
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
  if (opts.ifMatch !== undefined) headers["If-Match"] = String(opts.ifMatch);

  let res: Response;
  try {
    res = await fetch(`${env.apiBaseUrl}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body === undefined ? undefined : isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
      signal: opts.signal,
    });
  } catch {
    throw new ApiError(0, "network.offline", "Network error");
  }

  if (res.status === 401 && canRetry && opts.auth !== false && tokens?.refresh) {
    const result = await refreshTokens();
    if (result === "ok") return doFetch(path, opts, false);
    if (result === "network") throw new ApiError(0, "network.offline", "Network error");
    await useAuthStore.getState().signOut();
  }
  if (res.status === 204) return null;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const e = body?.error;
    throw new ApiError(res.status, e?.code ?? "server.error", e?.message ?? res.statusText, e?.fields ?? {}, e?.request_id);
  }
  return body;
}

async function request(path: string, opts: RequestOptions, canRetry = true): Promise<unknown> {
  let didFire = false;
  const timer = setTimeout(() => {
    didFire = true;
    activeSlowRequests += 1;
    useServerWakeStore.setState({ waking: true });
  }, 4000);

  try {
    return await doFetch(path, opts, canRetry);
  } finally {
    clearTimeout(timer);
    if (didFire) {
      activeSlowRequests = Math.max(0, activeSlowRequests - 1);
      if (activeSlowRequests === 0) {
        useServerWakeStore.setState({ waking: false });
      }
    }
  }
}

/** For single-object endpoints: returns envelope.data. */
export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const body = (await request(path, opts)) as { data: T } | null;
  return (body?.data ?? null) as T;
}

/** For paginated list endpoints. */
export async function apiList<T>(path: string, opts: RequestOptions = {}): Promise<ListResult<T>> {
  const body = (await request(path, opts)) as { data: T[]; meta: ListMeta };
  return { items: body.data, meta: body.meta };
}

export const newIdempotencyKey = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
