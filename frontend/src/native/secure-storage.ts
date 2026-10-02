import { SecureStorage } from "@aparajita/capacitor-secure-storage";
import { isNative } from "./platform";

// Web fallback. XSS can read localStorage; acceptable for the pilot; revisit with httpOnly cookies before public web launch.

export async function getSecret(key: string): Promise<string | null> {
  if (isNative()) {
    try {
      const data = await SecureStorage.get(key);
      if (data === null || data === undefined) return null;
      return typeof data === "string" ? data : JSON.stringify(data);
    } catch {
      return null;
    }
  }

  // Web fallback. XSS can read localStorage; acceptable for the pilot; revisit with httpOnly cookies before public web launch.
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

export async function setSecret(key: string, value: string): Promise<void> {
  if (isNative()) {
    await SecureStorage.set(key, value);
    return;
  }

  // Web fallback. XSS can read localStorage; acceptable for the pilot; revisit with httpOnly cookies before public web launch.
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, value);
  }
}

export async function removeSecret(key: string): Promise<void> {
  if (isNative()) {
    try {
      await SecureStorage.remove(key);
    } catch {
      // Ignore if key was not present
    }
    return;
  }

  // Web fallback. XSS can read localStorage; acceptable for the pilot; revisit with httpOnly cookies before public web launch.
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(key);
  }
}
