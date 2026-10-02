import { Capacitor } from "@capacitor/core";

export const isNative = () => Capacitor.isNativePlatform();
export const platform = () => Capacitor.getPlatform() as "android" | "ios" | "web";

export class NativeUnavailableError extends Error {
  constructor(feature: string) {
    super(`${feature} is not available on this platform`);
  }
}
