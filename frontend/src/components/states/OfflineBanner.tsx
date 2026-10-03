"use client";

import React, { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { isOnline, onNetworkChange } from "@/native/network";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    isOnline().then((connected) => setOffline(!connected));
    const unsubscribe = onNetworkChange((connected) => {
      setOffline(!connected);
    });
    return () => unsubscribe();
  }, []);

  if (!offline) return null;

  return (
    <div className="sticky top-0 z-50 w-full bg-amber-600 text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm animate-in slide-in-from-top duration-200">
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>You&apos;re offline. Changes can&apos;t be saved until you reconnect.</span>
    </div>
  );
}
