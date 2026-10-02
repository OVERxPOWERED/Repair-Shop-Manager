import { Preferences } from "@capacitor/preferences";
import { isNative } from "./platform";

export async function getPref(key: string): Promise<string | null> {
  if (isNative()) {
    const { value } = await Preferences.get({ key });
    return value;
  }
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

export async function setPref(key: string, value: string): Promise<void> {
  if (isNative()) {
    await Preferences.set({ key, value });
    return;
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key, value);
  }
}

export async function removePref(key: string): Promise<void> {
  if (isNative()) {
    await Preferences.remove({ key });
    return;
  }
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(key);
  }
}
