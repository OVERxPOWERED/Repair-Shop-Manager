import { App } from "@capacitor/app";
import { isNative } from "./platform";

export function onBackButton(callback: () => void): () => void {
  if (!isNative()) {
    return () => {};
  }

  let handle: { remove: () => void } | null = null;
  let active = true;

  App.addListener("backButton", () => {
    callback();
  }).then((h) => {
    if (active) {
      handle = h;
    } else {
      h.remove();
    }
  });

  return () => {
    active = false;
    if (handle) {
      handle.remove();
    }
  };
}

export async function minimizeApp(): Promise<void> {
  if (isNative()) {
    try {
      await App.minimizeApp();
    } catch {
      // Ignore
    }
  }
}
