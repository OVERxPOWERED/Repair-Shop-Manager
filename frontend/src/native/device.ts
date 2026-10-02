import { Device } from "@capacitor/device";
import { isNative } from "./platform";
import { getPref, setPref } from "./preferences";

const DEVICE_ID_KEY = "fixpro.deviceId";

export async function getDeviceId(): Promise<string> {
  if (isNative()) {
    const info = await Device.getId();
    return info.identifier;
  }
  let id = await getPref(DEVICE_ID_KEY);
  if (!id) {
    id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `web-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await setPref(DEVICE_ID_KEY, id);
  }
  return id;
}
