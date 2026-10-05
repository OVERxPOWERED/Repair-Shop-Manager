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

  // Development / Test fallback when Google Client ID is not yet configured
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

    let resolved = false;

    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: any) => {
        if (response?.credential) {
          resolved = true;
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

    // Prompt user with Google One Tap or modal
    google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        if (!resolved) {
          // Fallback to OAuth popup flow if One Tap is dismissed or suppressed
          try {
            const client = google.accounts.oauth2.initTokenClient({
              client_id: clientId,
              scope: "email profile openid",
              callback: (tokenResponse: any) => {
                if (tokenResponse?.access_token) {
                  // If access_token received from tokenClient, construct payload or resolve
                  resolve({
                    idToken: tokenResponse.id_token || tokenResponse.access_token,
                  });
                } else if (!resolved) {
                  reject(new Error("Google sign-in was not completed"));
                }
              },
            });
            client.requestAccessToken();
          } catch (e) {
            reject(new Error("Google sign-in prompt was skipped"));
          }
        }
      }
    });
  });
}
