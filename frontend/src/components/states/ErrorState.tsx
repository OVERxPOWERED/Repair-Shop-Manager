import React from "react";
import { AlertCircle, RefreshCw, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { ApiError } from "@/lib/api/client";
import { errorMessage } from "@/i18n/config";
import { Button } from "@/components/ui/button";
import { PermissionDenied } from "./PermissionDenied";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const t = useTranslations("errors");

  if (error instanceof ApiError && error.status === 403) {
    return <PermissionDenied />;
  }

  const isOffline = error instanceof ApiError && error.status === 0;
  const message = isOffline
    ? t("network.offline")
    : error instanceof ApiError
      ? errorMessage(t, error.code) || error.message
      : error instanceof Error
        ? error.message
        : t("generic");

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 my-auto min-h-[280px] animate-in fade-in duration-300">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50 text-rose-600 border border-rose-200 mb-4 shadow-sm">
        {isOffline ? (
          <WifiOff className="h-8 w-8 stroke-[1.75]" />
        ) : (
          <AlertCircle className="h-8 w-8 stroke-[1.75]" />
        )}
      </div>

      <h3 className="text-lg font-bold tracking-tight text-neutral-900">
        {isOffline ? "You are offline" : "Something went wrong"}
      </h3>
      <p className="text-xs text-neutral-500 mt-1 max-w-xs leading-relaxed">{message}</p>

      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="mt-5 h-11 px-5 rounded-2xl border-neutral-200 text-xs font-bold flex items-center gap-2"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Retry</span>
        </Button>
      )}
    </div>
  );
}
