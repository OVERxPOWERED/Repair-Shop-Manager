import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "./store";
import { setSecret, getSecret } from "@/native/secure-storage";
import { setPref, getPref } from "@/native/preferences";

describe("useAuthStore session persistence & hydration", () => {
  beforeEach(async () => {
    await useAuthStore.getState().signOut();
  });

  it("boots with status 'signedOut' when no tokens are stored", async () => {
    await useAuthStore.getState().boot();
    const state = useAuthStore.getState();
    expect(state.status).toBe("signedOut");
    expect(state.tokens).toBeNull();
    expect(state.user).toBeNull();
  });

  it("persists user and shops to preferences on setSession", async () => {
    const fakeUser = {
      id: "u-1",
      phone: "+919876543210",
      name: "Ramesh Sharma",
      email: "ramesh@example.com",
      preferred_locale: "en",
    };
    const fakeShops = [
      {
        membership_id: "m-1",
        shop_id: "s-1",
        shop_name: "FixPro Star",
        shop_type: "mobile",
        city: "Jaipur",
        role_id: "r-1",
        role_name: "Owner",
        permissions: ["all"],
      },
    ];
    const fakeTokens = { access: "access-token-123", refresh: "refresh-token-456" };

    await useAuthStore.getState().setSession({
      user: fakeUser,
      tokens: fakeTokens,
      shops: fakeShops,
      pendingInvites: 0,
    });

    const state = useAuthStore.getState();
    expect(state.status).toBe("signedIn");
    expect(state.user?.name).toBe("Ramesh Sharma");

    // Verify stored in persistent storage
    const rawTokens = await getSecret("fixpro.tokens");
    const rawUser = await getPref("fixpro.user");
    const rawShops = await getPref("fixpro.shops");

    expect(rawTokens).toContain("access-token-123");
    expect(rawUser).toContain("Ramesh Sharma");
    expect(rawShops).toContain("FixPro Star");
  });

  it("immediately restores signedIn status and user on reload when cached user has a valid name", async () => {
    // Simulate pre-existing session in storage
    await setSecret("fixpro.tokens", JSON.stringify({ access: "acc", refresh: "ref" }));
    await setPref(
      "fixpro.user",
      JSON.stringify({
        id: "u-1",
        name: "Shabbir Rajas",
        phone: "+919039800209",
        email: null,
        preferred_locale: "en",
      })
    );
    await setPref(
      "fixpro.shops",
      JSON.stringify([
        {
          membership_id: "m-1",
          shop_id: "s-1",
          shop_name: "My Shop",
          shop_type: "mobile",
          city: "Jaipur",
          role_id: "r-1",
          role_name: "Owner",
          permissions: [],
        },
      ])
    );

    // Boot
    await useAuthStore.getState().boot();
    const state = useAuthStore.getState();

    // User is immediately restored, so status is signedIn (NOT booting and NOT signedOut)
    expect(state.status).toBe("signedIn");
    expect(state.user?.name).toBe("Shabbir Rajas");
    expect(state.shops).toHaveLength(1);
  });

  it("keeps status 'booting' when tokens exist but user is not yet cached, preventing premature redirects", async () => {
    // Only tokens exist, no user yet
    await setSecret("fixpro.tokens", JSON.stringify({ access: "acc", refresh: "ref" }));

    await useAuthStore.getState().boot();
    const state = useAuthStore.getState();

    // Must stay in 'booting' so nextRoute() returns null and does not falsely redirect to /profile-setup/
    expect(state.status).toBe("booting");
    expect(state.user).toBeNull();
  });

  it("clears all storage keys on signOut", async () => {
    await setSecret("fixpro.tokens", "fake-tokens");
    await setPref("fixpro.user", "fake-user");
    await setPref("fixpro.shops", "fake-shops");
    await setPref("fixpro.shopId", "fake-shop-id");

    await useAuthStore.getState().signOut();

    expect(await getSecret("fixpro.tokens")).toBeNull();
    expect(await getPref("fixpro.user")).toBeNull();
    expect(await getPref("fixpro.shops")).toBeNull();
    expect(await getPref("fixpro.shopId")).toBeNull();
    expect(useAuthStore.getState().status).toBe("signedOut");
  });
});
