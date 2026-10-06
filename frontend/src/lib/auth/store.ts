import { create } from "zustand";
import { getPref, setPref, removePref } from "@/native/preferences";
import { getSecret, removeSecret, setSecret } from "@/native/secure-storage";

export type Tokens = { access: string; refresh: string };
export type User = { id: string; phone: string | null; name: string; email: string | null; preferred_locale: string };
export type MyShop = {
  membership_id: string;
  shop_id: string;
  shop_name: string;
  shop_type: string;
  city: string;
  status?: string;
  role_id: string | null;
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
  pendingInvites: number;
  boot: () => Promise<void>;
  setSession: (s: { user: User; tokens?: Tokens; shops: MyShop[]; pendingInvites?: number }) => Promise<void>;
  setPendingInvites: (count: number) => void;
  setTokens: (t: Tokens) => Promise<void>;
  selectShop: (shopId: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const TOKENS_KEY = "fixpro.tokens";
const SHOP_KEY = "fixpro.shopId";
const USER_KEY = "fixpro.user";
const SHOPS_KEY = "fixpro.shops";

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: "booting",
  tokens: null,
  user: null,
  shops: [],
  shopId: null,
  pendingInvites: 0,

  boot: async () => {
    const rawTokens = await getSecret(TOKENS_KEY);
    const shopId = await getPref(SHOP_KEY);
    const rawUser = await getPref(USER_KEY);
    const rawShops = await getPref(SHOPS_KEY);

    let tokens: Tokens | null = null;
    if (rawTokens) {
      try {
        tokens = JSON.parse(rawTokens) as Tokens;
      } catch {
        tokens = null;
      }
    }

    let user: User | null = null;
    if (rawUser) {
      try {
        user = JSON.parse(rawUser) as User;
      } catch {
        user = null;
      }
    }

    let shops: MyShop[] = [];
    if (rawShops) {
      try {
        shops = JSON.parse(rawShops) as MyShop[];
      } catch {
        shops = [];
      }
    }

    if (!tokens) {
      set({ tokens: null, user: null, shops: [], shopId: null, status: "signedOut" });
      return;
    }

    // If we have tokens AND a cached user with a valid name, we can immediately mark signedIn.
    // If not, keep status "booting" so route guards don't falsely redirect to /profile-setup/ before /auth/me/ completes.
    const hasValidCachedUser = Boolean(user?.name && user.name.trim().length >= 2);

    set({
      tokens,
      shopId,
      user,
      shops,
      status: hasValidCachedUser ? "signedIn" : "booting",
    });
  },

  setSession: async ({ user, tokens, shops, pendingInvites }) => {
    if (tokens) await setSecret(TOKENS_KEY, JSON.stringify(tokens));
    if (user) await setPref(USER_KEY, JSON.stringify(user));
    if (shops) await setPref(SHOPS_KEY, JSON.stringify(shops));
    const current = get().shopId;
    const shopId = shops.some((s) => s.shop_id === current) ? current : (shops[0]?.shop_id ?? null);
    if (shopId) await setPref(SHOP_KEY, shopId);
    set({
      user,
      shops,
      shopId,
      status: "signedIn",
      ...(tokens ? { tokens } : {}),
      ...(pendingInvites !== undefined ? { pendingInvites } : {}),
    });
  },

  setPendingInvites: (pendingInvites) => {
    set({ pendingInvites });
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
    await removePref(USER_KEY);
    await removePref(SHOPS_KEY);
    await removePref(SHOP_KEY);
    set({ status: "signedOut", tokens: null, user: null, shops: [], shopId: null, pendingInvites: 0 });
  },
}));

export function useCurrentShop(): MyShop | null {
  return useAuthStore((s) => s.shops.find((x) => x.shop_id === s.shopId) ?? null);
}

export function usePermission(code: string): boolean {
  return useCurrentShop()?.permissions.includes(code) ?? false;
}
