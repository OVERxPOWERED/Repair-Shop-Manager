import { Network, type ConnectionStatus } from "@capacitor/network";
import { isNative } from "./platform";

export async function isOnline(): Promise<boolean> {
  if (isNative()) {
    const status = await Network.getStatus();
    return status.connected;
  }
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export function onNetworkChange(callback: (online: boolean) => void): () => void {
  if (isNative()) {
    let handle: { remove: () => void } | null = null;
    let active = true;
    Network.addListener("networkStatusChange", (status: ConnectionStatus) => {
      callback(status.connected);
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

  if (typeof window === "undefined") {
    return () => {};
  }

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
