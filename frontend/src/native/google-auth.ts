/**
 * Native & Web Google Authentication Service.
 * Provides unified sign-in using Google Identity Services on Web and native fallback.
 */

import { env } from "@/lib/env";
import { isNative } from "./platform";

export type GoogleUserCredentials = {
  idToken: string;
  email?: string;
  name?: string;
  imageUrl?: string;
};

let gisLoaded = false;
let gisLoadingPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window is not available"));
  }
  if (gisLoaded && (window as any).google?.accounts?.id) {
    return Promise.resolve();
  }
  if (gisLoadingPromise) {
    return gisLoadingPromise;
  }

  gisLoadingPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("google-gis-script");
    if (existing) {
      existing.addEventListener("load", () => {
        gisLoaded = true;
        resolve();
      });
      existing.addEventListener("error", (e) => reject(e));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gis-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      gisLoaded = true;
      resolve();
    };
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });

  return gisLoadingPromise;
}

/**
 * Initiates Google OAuth2 sign-in.
 * Returns the Google ID token to be sent to the backend endpoint (/api/v1/auth/google/).
 */
export async function signInWithGoogle(): Promise<GoogleUserCredentials> {
  const clientId = env.googleClientId;

  // Development / Test fallback when Google Client ID is not configured
  if (!clientId) {
    if (typeof window !== "undefined") {
      const email = prompt("Google Sign-In (Dev Mode)\nEnter email to test with:", "owner@example.com");
      if (!email) {
        throw new Error("Sign in cancelled");
      }
      const name = prompt("Enter your Name:", "Google Test Owner") || "Google Test Owner";
      const sub = `dev-google-${btoa(email).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`;
      return {
        idToken: `test-google-token:${sub}:${email}:${name}`,
        email,
        name,
      };
    }
    throw new Error("Google Client ID is not configured");
  }

  // Load Google Identity Services library
  await loadGisScript();

  return new Promise((resolve, reject) => {
    const google = (window as any).google;
    if (!google?.accounts?.id) {
      reject(new Error("Google Identity Services failed to load"));
      return;
    }

    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: any) => {
        if (response?.credential) {
          resolve({
            idToken: response.credential,
          });
        } else {
          reject(new Error("No credential returned by Google"));
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    // Prompt user with Google One Tap
    google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        reject(new Error("Google One Tap was not displayed"));
      }
    });
  });
}

/**
 * Renders the official Google Sign-In button into a DOM container element.
 * Guarantees a signed ID token (JWT) via Google's official popup without pop-up blocking issues.
 */
export async function renderGoogleButton(
  container: HTMLElement,
  onCredential: (cred: GoogleUserCredentials) => void,
  onError?: (err: Error) => void
): Promise<boolean> {
  const clientId = env.googleClientId;
  if (!clientId || typeof window === "undefined") {
    return false;
  }

  try {
    await loadGisScript();
    const google = (window as any).google;
    if (!google?.accounts?.id) {
      onError?.(new Error("Google Identity Services failed to load"));
      return false;
    }

    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: any) => {
        if (response?.credential) {
          onCredential({
            idToken: response.credential,
          });
        } else {
          onError?.(new Error("No credential returned by Google"));
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    // Clear previous children if any
    container.innerHTML = "";

    google.accounts.id.renderButton(container, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
      width: Math.min(Math.max(container.clientWidth || 320, 240), 400),
    });

    // Also trigger One Tap prompt for users already signed into Google in their browser
    try {
      google.accounts.id.prompt();
    } catch {
      // Ignored if prompt is suppressed
    }

    return true;
  } catch (err: any) {
    onError?.(err instanceof Error ? err : new Error(String(err)));
    return false;
  }
}
