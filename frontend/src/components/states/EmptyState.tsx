import React from "react";
import { LucideIcon, Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 my-auto min-h-[280px] animate-in fade-in duration-300">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-neutral-100 text-neutral-500 mb-4 shadow-inner">
        <Icon className="h-8 w-8 stroke-[1.75]" />
      </div>
      <h3 className="text-lg font-bold tracking-tight text-neutral-900">{title}</h3>
      {body && <p className="text-xs text-neutral-500 mt-1 max-w-xs leading-relaxed">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
