import { StatusBar, Style } from "@capacitor/status-bar";
import { isNative } from "./platform";

export async function setAppStatusBar(): Promise<void> {
  if (!isNative()) return;
  try {
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: "#FFFFFF" });
  } catch {
    // Ignore if not supported on platform
  }
}
