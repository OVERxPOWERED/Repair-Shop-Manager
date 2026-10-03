export type JobStatus =
  | "received"
  | "diagnosing"
  | "awaiting_approval"
  | "awaiting_parts"
  | "in_repair"
  | "repaired"
  | "ready_for_pickup"
  | "delivered"
  | "cancelled"
  | "returned_unrepaired";

export const ALL_JOB_STATUSES: JobStatus[] = [
  "received",
  "diagnosing",
  "awaiting_approval",
  "awaiting_parts",
  "in_repair",
  "repaired",
  "ready_for_pickup",
  "delivered",
  "cancelled",
  "returned_unrepaired",
];

export interface StatusStyle {
  badge: string;
  dot: string;
}

export const STATUS_STYLE: Record<JobStatus, StatusStyle> = {
  received: {
    badge: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    dot: "bg-blue-600 dark:bg-blue-400",
  },
  diagnosing: {
    badge: "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    dot: "bg-sky-600 dark:bg-sky-400",
  },
  awaiting_approval: {
    badge: "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    dot: "bg-sky-600 dark:bg-sky-400",
  },
  awaiting_parts: {
    badge: "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
    dot: "bg-orange-600 dark:bg-orange-400",
  },
  in_repair: {
    badge: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    dot: "bg-amber-600 dark:bg-amber-400",
  },
  repaired: {
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    dot: "bg-emerald-600 dark:bg-emerald-400",
  },
  ready_for_pickup: {
    badge: "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
    dot: "bg-teal-600 dark:bg-teal-400",
  },
  delivered: {
    badge: "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
    dot: "bg-purple-600 dark:bg-purple-400",
  },
  cancelled: {
    badge: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    dot: "bg-rose-600 dark:bg-rose-400",
  },
  returned_unrepaired: {
    badge: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    dot: "bg-rose-600 dark:bg-rose-400",
  },
};

export const GROUPS: Record<string, JobStatus[]> = {
  pending: ["received"],
  in_progress: ["diagnosing", "awaiting_approval", "awaiting_parts", "in_repair"],
  repaired: ["repaired", "ready_for_pickup"],
  delivered: ["delivered"],
  closed: ["cancelled", "returned_unrepaired"],
};
