import { create } from "zustand";
import { getPref, setPref } from "@/native/preferences";
import { getSecret, removeSecret, setSecret } from "@/native/secure-storage";

export type Tokens = { access: string; refresh: string };
export type User = { id: string; phone: string; name: string; email: string | null; preferred_locale: string };
export type MyShop = {
  membership_id: string;
  shop_id: string;
  shop_name: string;
  shop_type: string;
  city: string;
  role_id: string;
  role_name: string;
  permissions: string[];
};

type Status = "booting" | "signedOut" | "signedIn";

type AuthState = {
  status: Status;
  tokens: Tokens | null;
  user: User | null;
  shops: MyShop[];
  shopId: string | null;
  boot: () => Promise<void>;
  setSession: (s: { user: User; tokens?: Tokens; shops: MyShop[] }) => Promise<void>;
  setTokens: (t: Tokens) => Promise<void>;
  selectShop: (shopId: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const TOKENS_KEY = "fixpro.tokens";
const SHOP_KEY = "fixpro.shopId";

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: "booting",
  tokens: null,
  user: null,
  shops: [],
  shopId: null,

  boot: async () => {
    const raw = await getSecret(TOKENS_KEY);
    const shopId = await getPref(SHOP_KEY);
    let tokens: Tokens | null = null;
    if (raw) {
      try {
        tokens = JSON.parse(raw) as Tokens;
      } catch {
        tokens = null;
      }
    }
    set({ tokens, shopId, status: tokens ? "signedIn" : "signedOut" });
  },

  setSession: async ({ user, tokens, shops }) => {
    if (tokens) await setSecret(TOKENS_KEY, JSON.stringify(tokens));
    const current = get().shopId;
    const shopId = shops.some((s) => s.shop_id === current) ? current : (shops[0]?.shop_id ?? null);
    if (shopId) await setPref(SHOP_KEY, shopId);
    set({ user, shops, shopId, status: "signedIn", ...(tokens ? { tokens } : {}) });
  },

  setTokens: async (tokens) => {
    await setSecret(TOKENS_KEY, JSON.stringify(tokens));
    set({ tokens });
  },

  selectShop: async (shopId) => {
    await setPref(SHOP_KEY, shopId);
    set({ shopId });
  },

  signOut: async () => {
    await removeSecret(TOKENS_KEY);
    set({ status: "signedOut", tokens: null, user: null, shops: [] });
  },
}));

export function useCurrentShop(): MyShop | null {
  return useAuthStore((s) => s.shops.find((x) => x.shop_id === s.shopId) ?? null);
}

export function usePermission(code: string): boolean {
  return useCurrentShop()?.permissions.includes(code) ?? false;
}
