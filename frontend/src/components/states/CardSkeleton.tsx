import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function CardSkeleton() {
  return (
    <div className="w-full rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3 rounded-md" />
          <Skeleton className="h-8 w-1/2 rounded-lg" />
        </div>
        <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
      </div>
      <div className="grid grid-cols-4 gap-2 pt-3 border-t border-neutral-100">
        <Skeleton className="h-8 w-full rounded-md" />
        <Skeleton className="h-8 w-full rounded-md" />
        <Skeleton className="h-8 w-full rounded-md" />
        <Skeleton className="h-8 w-full rounded-md" />
      </div>
    </div>
  );
}
