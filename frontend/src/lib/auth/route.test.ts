import { describe, it, expect } from "vitest";
import { nextRoute } from "./route";

describe("nextRoute", () => {
  it("returns null while booting", () => {
    expect(
      nextRoute({ status: "booting", hasName: false, shopCount: 0, pendingInvites: 0 })
    ).toBeNull();
    expect(
      nextRoute({ status: "booting", hasName: true, shopCount: 1, pendingInvites: 0 })
    ).toBeNull();
  });

  it("returns /welcome/ when signed out", () => {
    expect(
      nextRoute({ status: "signedOut", hasName: false, shopCount: 0, pendingInvites: 0 })
    ).toBe("/welcome/");
  });

  it("returns /profile-setup/ when signed in without a name", () => {
    expect(
      nextRoute({ status: "signedIn", hasName: false, shopCount: 0, pendingInvites: 0 })
    ).toBe("/profile-setup/");
    expect(
      nextRoute({ status: "signedIn", hasName: false, shopCount: 2, pendingInvites: 0 })
    ).toBe("/profile-setup/");
  });

  it("returns /onboarding/ when signed in with name, no shops, and no pending invites", () => {
    expect(
      nextRoute({ status: "signedIn", hasName: true, shopCount: 0, pendingInvites: 0 })
    ).toBe("/onboarding/");
  });

  it("returns /invites/ when signed in with name, no shops, but pending invites exist", () => {
    expect(
      nextRoute({ status: "signedIn", hasName: true, shopCount: 0, pendingInvites: 2 })
    ).toBe("/invites/");
  });

  it("returns /home/ when signed in with name and at least one shop", () => {
    expect(
      nextRoute({ status: "signedIn", hasName: true, shopCount: 1, pendingInvites: 0 })
    ).toBe("/home/");
    expect(
      nextRoute({ status: "signedIn", hasName: true, shopCount: 3, pendingInvites: 1 })
    ).toBe("/home/");
  });
});
