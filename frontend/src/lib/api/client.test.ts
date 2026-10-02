import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api, apiList, ApiError, RequestOptions } from "./client";
import { useAuthStore } from "@/lib/auth/store";
import { useLocaleStore } from "@/i18n/store";
import { env } from "@/lib/env";

describe("API client", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    useLocaleStore.setState({ locale: "en" });
    useAuthStore.setState({
      status: "signedIn",
      tokens: { access: "access-token-123", refresh: "refresh-token-456" },
      user: { id: "user-1", phone: "9999999999", name: "Test User", email: null, preferred_locale: "en" },
      shops: [{
        membership_id: "m-1",
        shop_id: "shop-abc",
        shop_name: "FixPro Shop",
        shop_type: "repair",
        city: "Delhi",
        role_id: "r-1",
        role_name: "Owner",
        permissions: ["all"],
      }],
      shopId: "shop-abc",
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("api() returns envelope.data", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: "item-1", name: "Screen Replacement" } }),
    } as unknown as Response);

    const result = await api<{ id: string; name: string }>("/catalog/items/1/");
    expect(result).toEqual({ id: "item-1", name: "Screen Replacement" });
  });

  it("apiList() returns items and meta", async () => {
    const mockList = {
      data: [{ id: "1" }, { id: "2" }],
      meta: { count: 2, page: 1, next: null, previous: null },
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockList,
    } as unknown as Response);

    const result = await apiList<{ id: string }>("/catalog/items/");
    expect(result.items).toHaveLength(2);
    expect(result.items[0].id).toBe("1");
    expect(result.meta.count).toBe(2);
  });

  it("error response becomes ApiError with code, status, fields, and requestId", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({
        error: {
          code: "validation.invalid",
          message: "Invalid phone number",
          fields: { phone: ["Enter a valid 10-digit number."] },
          request_id: "req-xyz-789",
        },
      }),
    } as unknown as Response);

    await expect(api("/auth/otp/send/")).rejects.toThrow(ApiError);
    try {
      await api("/auth/otp/send/");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(400);
      expect(apiErr.code).toBe("validation.invalid");
      expect(apiErr.message).toBe("Invalid phone number");
      expect(apiErr.fields).toEqual({ phone: ["Enter a valid 10-digit number."] });
      expect(apiErr.requestId).toBe("req-xyz-789");
    }
  });

  it("fetch throwing becomes ApiError(0, 'network.offline') and does NOT sign out", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(api("/customers/")).rejects.toThrow(ApiError);
    try {
      await api("/customers/");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(0);
      expect(apiErr.code).toBe("network.offline");
    }

    expect(useAuthStore.getState().status).toBe("signedIn");
    expect(useAuthStore.getState().tokens?.access).toBe("access-token-123");
  });

  it("two parallel calls that both get 401 cause exactly one refresh call, then both retry and succeed", async () => {
    let refreshCalls = 0;
    let endpoint1Calls = 0;
    let endpoint2Calls = 0;

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/auth/token/refresh/")) {
        refreshCalls++;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: { access: "new-access-token", refresh: "new-refresh-token" },
          }),
        } as unknown as Response;
      }

      if (urlStr.includes("/resource-1/")) {
        endpoint1Calls++;
        if (endpoint1Calls === 1) {
          return {
            ok: false,
            status: 401,
            json: async () => ({ error: { code: "token.expired", message: "Token expired" } }),
          } as unknown as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { id: "res-1" } }),
        } as unknown as Response;
      }

      if (urlStr.includes("/resource-2/")) {
        endpoint2Calls++;
        if (endpoint2Calls === 1) {
          return {
            ok: false,
            status: 401,
            json: async () => ({ error: { code: "token.expired", message: "Token expired" } }),
          } as unknown as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { id: "res-2" } }),
        } as unknown as Response;
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ data: {} }),
      } as unknown as Response;
    });

    const [res1, res2] = await Promise.all([
      api<{ id: string }>("/resource-1/"),
      api<{ id: string }>("/resource-2/"),
    ]);

    expect(res1).toEqual({ id: "res-1" });
    expect(res2).toEqual({ id: "res-2" });
    expect(refreshCalls).toBe(1);
    expect(endpoint1Calls).toBe(2);
    expect(endpoint2Calls).toBe(2);
    expect(useAuthStore.getState().tokens?.access).toBe("new-access-token");
  });

  it("refresh 401 calls signOut()", async () => {
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/auth/token/refresh/")) {
        return {
          ok: false,
          status: 401,
          json: async () => ({ error: { code: "token.invalid", message: "Invalid refresh token" } }),
        } as unknown as Response;
      }
      return {
        ok: false,
        status: 401,
        json: async () => ({ error: { code: "token.expired", message: "Token expired" } }),
      } as unknown as Response;
    });

    await expect(api("/secure-data/")).rejects.toThrow(ApiError);
    expect(useAuthStore.getState().status).toBe("signedOut");
    expect(useAuthStore.getState().tokens).toBeNull();
  });

  it("passes correct headers: X-Shop-Id, Idempotency-Key, If-Match, Accept-Language, and Auth", async () => {
    let capturedHeaders: HeadersInit | undefined;
    global.fetch = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      capturedHeaders = init?.headers;
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { success: true } }),
      } as unknown as Response;
    });

    // Default: sends Auth, X-Shop-Id, X-App-Version, Accept, Accept-Language
    await api("/items/");
    let headers = capturedHeaders as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer access-token-123");
    expect(headers["X-Shop-Id"]).toBe("shop-abc");
    expect(headers["Accept"]).toBe("application/json");
    expect(headers["Accept-Language"]).toBe("en");
    expect(headers["X-App-Version"]).toBe(env.appVersion);

    // With shop: false
    await api("/auth/me/", { shop: false });
    headers = capturedHeaders as Record<string, string>;
    expect(headers["X-Shop-Id"]).toBeUndefined();

    // With auth: false
    await api("/public/", { auth: false });
    headers = capturedHeaders as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();

    // With idempotencyKey and ifMatch
    await api("/orders/", {
      method: "POST",
      body: { total: 5000 },
      idempotencyKey: "idem-key-test-99",
      ifMatch: 3,
    });
    headers = capturedHeaders as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBe("idem-key-test-99");
    expect(headers["If-Match"]).toBe("3");
    expect(headers["Content-Type"]).toBe("application/json");
  });
});
