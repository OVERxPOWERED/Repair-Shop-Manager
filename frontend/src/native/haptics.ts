import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { isNative } from "./platform";

export async function hapticTick(): Promise<void> {
  if (isNative()) {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Ignore if haptic hardware is unavailable
    }
    return;
  }
  // Web fallback
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(10);
    } catch {
      // Ignore
    }
  }
}
