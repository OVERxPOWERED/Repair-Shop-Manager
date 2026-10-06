export type RouteInput = {
  status: "booting" | "signedOut" | "signedIn";
  hasName: boolean;
  shopCount: number;
  pendingInvites: number; // 0 until 0.16
};

/** Where the app should be. Pages call this and router.replace() if they are on the wrong screen. */
export function nextRoute(s: RouteInput): string | null {
  if (s.status === "booting") return null;
  if (s.status === "signedOut") return "/welcome/";
  if (!s.hasName) return "/profile-setup/";
  if (s.shopCount === 0) return s.pendingInvites > 0 ? "/invites/" : "/onboarding/choice/";
  return "/home/";
}
